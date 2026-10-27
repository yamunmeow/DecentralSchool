import type { CodeProject, Target } from "./types";

/**
 * Turns a project's scripts (Blockly's JSON, Scratch opcodes) into JavaScript for the
 * runtime: one class per target, one generator method per script. Values follow
 * Scratch: literals stay strings, and every block casts its inputs the way
 * scratch-vm does.
 */

interface SBlock {
  type: string;
  id: string;
  x?: number;
  y?: number;
  fields?: Record<string, unknown>;
  inputs?: Record<string, { block?: SBlock; shadow?: SBlock }>;
  next?: { block?: SBlock };
  extraState?: Record<string, unknown>;
  enabled?: boolean;
}

export interface ProcPart {
  type: "label" | "num" | "text" | "bool";
  text?: string;
  id?: string;
  name?: string;
}

export interface ProcState {
  id: string;
  parts: ProcPart[];
  warp: boolean;
  reporter: boolean;
}

const HATS: Record<string, string> = {
  event_whenflagclicked: "GREEN_FLAG",
  event_whenkeypressed: "KEY_PRESSED",
  event_whenthisspriteclicked: "CLICKED",
  event_whenstageclicked: "CLICKED",
  event_whenbackdropswitchesto: "BACKDROP_CHANGED",
  event_whengreaterthan: "",
  event_whenbroadcastreceived: "BROADCAST",
  control_start_as_clone: "CLONE_START",
};

export const isHat = (type: string) => type in HATS || type === "procedures_definition";

const q = (s: unknown) => JSON.stringify(String(s ?? ""));
const ident = (id: string) => id.replace(/[^A-Za-z0-9_]/g, "_");

export function topBlocks(target: Target): SBlock[] {
  const blocks = (target.blocks as { blocks?: { blocks?: SBlock[] } }).blocks?.blocks;
  return Array.isArray(blocks) ? blocks : [];
}

export function procedures(target: Target): ProcState[] {
  return topBlocks(target)
    .filter((b) => b.type === "procedures_definition" && b.extraState)
    .map((b) => b.extraState as unknown as ProcState);
}

class TargetCompiler {
  private methods: string[] = [];
  private triggers: string[] = [];
  private scripts: string[] = [];
  private counter = 0;
  private args: Map<string, string> | null = null;
  private inWarp = false;
  private procs: Map<string, ProcState>;

  constructor(
    private target: Target,
    /** Editor builds: a pause point before every block, for slow motion and stepping. */
    private debug = false,
  ) {
    this.procs = new Map(procedures(target).map((p) => [p.id, p]));
  }

  private varRef(id: string): string {
    if (this.target.variables.some((v) => v.id === id) || this.target.lists.some((v) => v.id === id)) return `this.vars[${q(id)}]`;
    if (this.target.isStage) return `this.vars[${q(id)}]`;
    return `this.stage.vars[${q(id)}]`;
  }

  private stageRef() {
    return this.target.isStage ? "this" : "this.stage";
  }

  private fieldValue(b: SBlock, name: string): string {
    const f = b.fields?.[name];
    if (f && typeof f === "object" && "id" in (f as object)) return String((f as { id: string }).id);
    return String(f ?? "");
  }

  /* ---------- inputs ---------- */

  /** The block in an input: the real one if something is plugged in, else its shadow. */
  private inputBlock(b: SBlock, name: string): SBlock | undefined {
    const input = b.inputs?.[name];
    return input?.block || input?.shadow;
  }

  /** A literal (shadow) value, or undefined if a reporter is plugged in. */
  private literal(b: SBlock, name: string): string | undefined {
    const input = b.inputs?.[name];
    if (!input || input.block) return undefined;
    const s = input.shadow;
    if (!s) return "";
    const key = Object.keys(s.fields || {})[0];
    return key ? String(this.fieldValue(s, key)) : "";
  }

  /** Raw value, as Scratch passes it to a block (literals are strings). */
  any(b: SBlock, name: string): string {
    const lit = this.literal(b, name);
    if (lit !== undefined) return q(lit);
    const inner = this.inputBlock(b, name);
    return inner ? `(${this.expr(inner)})` : '""';
  }

  num(b: SBlock, name: string): string {
    const lit = this.literal(b, name);
    if (lit !== undefined) {
      const n = Number(lit);
      return String(Number.isNaN(n) ? 0 : n);
    }
    const inner = this.inputBlock(b, name);
    return inner ? `C.toNumber(${this.expr(inner)})` : "0";
  }

  str(b: SBlock, name: string): string {
    const lit = this.literal(b, name);
    if (lit !== undefined) return q(lit);
    const inner = this.inputBlock(b, name);
    return inner ? `C.toStr(${this.expr(inner)})` : '""';
  }

  bool(b: SBlock, name: string): string {
    const inner = b.inputs?.[name]?.block;
    return inner ? `C.toBoolean(${this.expr(inner)})` : "false";
  }

  /* ---------- reporters ---------- */

  expr(b: SBlock): string {
    if (b.enabled === false) return '""';
    const f = (name: string) => this.fieldValue(b, name);
    switch (b.type) {
      // literals (shadows)
      case "math_number":
      case "math_positive_number":
      case "math_whole_number":
      case "math_integer":
      case "math_angle":
      case "text":
      case "colour_picker":
        return q(this.fieldValue(b, Object.keys(b.fields || {})[0] || ""));
      // menus
      case "motion_goto_menu":
      case "motion_glideto_menu":
      case "motion_pointtowards_menu":
      case "looks_costume":
      case "looks_backdrops":
      case "sound_sounds_menu":
      case "event_broadcast_menu":
      case "control_create_clone_of_menu":
      case "sensing_touchingobjectmenu":
      case "sensing_distancetomenu":
      case "sensing_keyoptions":
      case "sensing_of_object_menu":
      case "pen_menu_colorParam":
        return q(this.fieldValue(b, Object.keys(b.fields || {})[0] || ""));

      case "motion_xposition": return "C.limit(this.x)";
      case "motion_yposition": return "C.limit(this.y)";
      case "motion_direction": return "this.direction";

      case "looks_costumenumbername":
        return f("NUMBER_NAME") === "name" ? '(this.costume ? this.costume.name : "")' : "this.costumeNumber";
      case "looks_backdropnumbername":
        return f("NUMBER_NAME") === "name" ? `(${this.stageRef()}.costume ? ${this.stageRef()}.costume.name : "")` : `${this.stageRef()}.costumeNumber`;
      case "looks_size": return "Math.round(this.size)";
      case "sound_volume": return "this.audioEffects.volume";

      case "sensing_touchingobject": return `this.touchingName(${this.str(b, "TOUCHINGOBJECTMENU")})`;
      case "sensing_touchingcolor": return `this.touchingColor(${this.str(b, "COLOR")})`;
      case "sensing_coloristouchingcolor": return `this.colorTouchingColor(${this.str(b, "COLOR")}, ${this.str(b, "COLOR2")})`;
      case "sensing_distanceto": return `this.distanceTo(${this.str(b, "DISTANCETOMENU")})`;
      case "sensing_answer": return '(this.rt.answer == null ? "" : this.rt.answer)';
      case "sensing_keypressed": return `this.rt.isKeyDown(${this.str(b, "KEY_OPTION")})`;
      case "sensing_mousedown": return "this.mouse.down";
      case "sensing_mousex": return "this.mouse.x";
      case "sensing_mousey": return "this.mouse.y";
      case "sensing_loudness": return "this.loudness";
      case "sensing_timer": return "this.timer";
      case "sensing_of": return `this.rt.of(${this.str(b, "OBJECT")}, ${q(f("PROPERTY"))})`;
      case "sensing_current": return `C.current(${q(f("CURRENTMENU").toLowerCase())})`;
      case "sensing_dayssince2000": return "C.daysSince2000()";
      case "sensing_username": return '""';

      case "operator_add": return `(${this.num(b, "NUM1")} + ${this.num(b, "NUM2")})`;
      case "operator_subtract": return `(${this.num(b, "NUM1")} - ${this.num(b, "NUM2")})`;
      case "operator_multiply": return `(${this.num(b, "NUM1")} * ${this.num(b, "NUM2")})`;
      case "operator_divide": return `(${this.num(b, "NUM1")} / ${this.num(b, "NUM2")})`;
      case "operator_random": return `C.random(${this.any(b, "FROM")}, ${this.any(b, "TO")})`;
      case "operator_gt": return `(C.compare(${this.any(b, "OPERAND1")}, ${this.any(b, "OPERAND2")}) > 0)`;
      case "operator_lt": return `(C.compare(${this.any(b, "OPERAND1")}, ${this.any(b, "OPERAND2")}) < 0)`;
      case "operator_equals": return `(C.compare(${this.any(b, "OPERAND1")}, ${this.any(b, "OPERAND2")}) === 0)`;
      case "operator_and": return `(${this.bool(b, "OPERAND1")} && ${this.bool(b, "OPERAND2")})`;
      case "operator_or": return `(${this.bool(b, "OPERAND1")} || ${this.bool(b, "OPERAND2")})`;
      case "operator_not": return `(!${this.bool(b, "OPERAND")})`;
      case "operator_join": return `(${this.str(b, "STRING1")} + ${this.str(b, "STRING2")})`;
      case "operator_letter_of": return `C.letterOf(${this.any(b, "STRING")}, ${this.any(b, "LETTER")})`;
      case "operator_length": return `${this.str(b, "STRING")}.length`;
      case "operator_contains": return `C.contains(${this.any(b, "STRING1")}, ${this.any(b, "STRING2")})`;
      case "operator_mod": return `C.mod(${this.any(b, "NUM1")}, ${this.any(b, "NUM2")})`;
      case "operator_round": return `Math.round(${this.num(b, "NUM")})`;
      case "operator_mathop": return `C.mathop(${q(f("OPERATOR"))}, ${this.any(b, "NUM")})`;

      case "data_variable": return this.varRef(f("VARIABLE"));
      case "data_listcontents": return `C.listContents(${this.varRef(f("LIST"))})`;
      case "data_itemoflist": return `Ops.itemOf(${this.varRef(f("LIST"))}, ${this.any(b, "INDEX")})`;
      case "data_itemnumoflist": return `Ops.itemNum(${this.varRef(f("LIST"))}, ${this.any(b, "ITEM")})`;
      case "data_lengthoflist": return `${this.varRef(f("LIST"))}.length`;
      case "data_listcontainsitem": return `Ops.contains(${this.varRef(f("LIST"))}, ${this.any(b, "ITEM")})`;

      case "argument_reporter_string_number":
      case "argument_reporter_boolean": {
        const id = String(b.extraState?.argId ?? "");
        const param = this.args?.get(id);
        if (param) return param;
        return b.type === "argument_reporter_boolean" ? "false" : "0";
      }
      case "procedures_call": return this.call(b);
    }
    return '""';
  }

  /* ---------- statements ---------- */

  private stack(first: SBlock | undefined, indent: string): string {
    const lines: string[] = [];
    for (let b = first; b; b = b.next?.block) {
      if (b.enabled === false) continue;
      const code = this.statement(b, indent);
      if (code && this.debug && !this.inWarp) lines.push(`${indent}yield* this.rt.dbg(${q(b.id)});`);
      lines.push(code);
    }
    return lines.filter(Boolean).join("\n");
  }

  private sub(b: SBlock, name: string, indent: string): string {
    return this.stack(b.inputs?.[name]?.block, indent + "  ");
  }

  private loopYield() {
    return this.inWarp ? "" : " yield;";
  }

  private statement(b: SBlock, i: string): string {
    const f = (name: string) => this.fieldValue(b, name);
    const s = (code: string) => `${i}${code}`;
    const v = () => `_${this.counter++}`;
    switch (b.type) {
      case "motion_movesteps": return s(`this.moveSteps(${this.num(b, "STEPS")});`);
      case "motion_turnright": return s(`this.direction = this.direction + ${this.num(b, "DEGREES")};`);
      case "motion_turnleft": return s(`this.direction = this.direction - ${this.num(b, "DEGREES")};`);
      case "motion_goto": { const p = v(); return s(`{ const ${p} = this.targetXY(${this.str(b, "TO")}); if (${p}) this.goto(${p}[0], ${p}[1]); }`); }
      case "motion_gotoxy": return s(`this.goto(${this.num(b, "X")}, ${this.num(b, "Y")});`);
      case "motion_glideto": { const p = v(); return s(`{ const ${p} = this.targetXY(${this.str(b, "TO")}); if (${p}) yield* this.glide(${this.num(b, "SECS")}, ${p}[0], ${p}[1]); }`); }
      case "motion_glidesecstoxy": return s(`yield* this.glide(${this.num(b, "SECS")}, ${this.num(b, "X")}, ${this.num(b, "Y")});`);
      case "motion_pointindirection": return s(`this.direction = ${this.num(b, "DIRECTION")};`);
      case "motion_pointtowards": return s(`this.pointTowardsName(${this.str(b, "TOWARDS")});`);
      case "motion_changexby": return s(`this.goto(this.x + ${this.num(b, "DX")}, this.y);`);
      case "motion_setx": return s(`this.goto(${this.num(b, "X")}, this.y);`);
      case "motion_changeyby": return s(`this.goto(this.x, this.y + ${this.num(b, "DY")});`);
      case "motion_sety": return s(`this.goto(this.x, ${this.num(b, "Y")});`);
      case "motion_ifonedgebounce": return s("this.bounce();");
      case "motion_setrotationstyle": return s(`this.setRotation(${q(f("STYLE"))});`);

      case "looks_sayforsecs": return s(`yield* this.sayFor(${this.any(b, "MESSAGE")}, ${this.num(b, "SECS")});`);
      case "looks_say": return s(`this.sayText(${this.any(b, "MESSAGE")});`);
      case "looks_thinkforsecs": return s(`yield* this.sayFor(${this.any(b, "MESSAGE")}, ${this.num(b, "SECS")}, true);`);
      case "looks_think": return s(`this.sayText(${this.any(b, "MESSAGE")}, true);`);
      case "looks_switchcostumeto": return s(`this.switchCostume(${this.any(b, "COSTUME")}, "costume");`);
      case "looks_nextcostume": return s(`this.switchCostume(this.costumeNumber + 1, "costume");`);
      case "looks_switchbackdropto": return s(`${this.stageRef()}.switchBackdrop(${this.any(b, "BACKDROP")});`);
      case "looks_switchbackdroptoandwait": return s(`yield* ${this.stageRef()}.switchBackdropAndWait(${this.any(b, "BACKDROP")});`);
      case "looks_nextbackdrop": return s(`${this.stageRef()}.switchBackdrop(${this.stageRef()}.costumeNumber + 1);`);
      case "looks_changesizeby": return s(`this.size = this.size + ${this.num(b, "CHANGE")};`);
      case "looks_setsizeto": return s(`this.size = ${this.num(b, "SIZE")};`);
      case "looks_changeeffectby": return s(`this.setEffect(${q(f("EFFECT"))}, ${this.any(b, "CHANGE")}, true);`);
      case "looks_seteffectto": return s(`this.setEffect(${q(f("EFFECT"))}, ${this.any(b, "VALUE")}, false);`);
      case "looks_cleargraphiceffects": return s("this.effects.clear();");
      case "looks_show": return s("this.visible = true;");
      case "looks_hide": return s("this.visible = false;");
      case "looks_gotofrontback": return s(`this.setLayer(${f("FRONT_BACK") === "front"});`);
      case "looks_goforwardbackwardlayers": return s(`this.changeLayer(${this.any(b, "NUM")}, ${f("FORWARD_BACKWARD") === "forward"});`);

      case "sound_playuntildone": return s(`yield* this.playSound(${this.any(b, "SOUND_MENU")}, true);`);
      case "sound_play": return s(`yield* this.playSound(${this.any(b, "SOUND_MENU")}, false);`);
      case "sound_stopallsounds": return s("this.stopAllSounds();");
      case "sound_changeeffectby": return s(`this.setSoundEffect(${q(f("EFFECT"))}, ${this.any(b, "VALUE")}, true);`);
      case "sound_seteffectto": return s(`this.setSoundEffect(${q(f("EFFECT"))}, ${this.any(b, "VALUE")}, false);`);
      case "sound_cleareffects": return s("this.audioEffects.clear();");
      case "sound_changevolumeby": return s(`this.setVolume(this.audioEffects.volume + ${this.num(b, "VOLUME")});`);
      case "sound_setvolumeto": return s(`this.setVolume(${this.num(b, "VOLUME")});`);

      case "event_broadcast": return s(`this.broadcast(${this.str(b, "BROADCAST_INPUT")});`);
      case "event_broadcastandwait": return s(`yield* this.broadcastAndWait(${this.str(b, "BROADCAST_INPUT")});`);

      case "control_wait": return s(`yield* this.wait(${this.num(b, "DURATION")});`);
      case "control_repeat": {
        const n = v();
        const k = v();
        return `${i}for (let ${k} = 0, ${n} = Math.round(${this.num(b, "TIMES")}); ${k} < ${n}; ${k}++) {\n${this.sub(b, "SUBSTACK", i)}\n${i} ${this.loopYield()}\n${i}}`;
      }
      case "control_forever": return `${i}for (;;) {\n${this.sub(b, "SUBSTACK", i)}\n${i} ${this.loopYield()}\n${i}}`;
      case "control_if": return `${i}if (${this.bool(b, "CONDITION")}) {\n${this.sub(b, "SUBSTACK", i)}\n${i}}`;
      case "control_if_else": return `${i}if (${this.bool(b, "CONDITION")}) {\n${this.sub(b, "SUBSTACK", i)}\n${i}} else {\n${this.sub(b, "SUBSTACK2", i)}\n${i}}`;
      case "control_wait_until": return s(`while (!${this.bool(b, "CONDITION")}) yield WAIT;`);
      case "control_repeat_until": return `${i}while (!${this.bool(b, "CONDITION")}) {\n${this.sub(b, "SUBSTACK", i)}\n${i} ${this.loopYield()}\n${i}}`;
      case "control_stop": {
        const opt = f("STOP_OPTION");
        if (opt === "all") return s("this.rt.stopAllFromScript();");
        if (opt === "other scripts in sprite" || opt === "other scripts in stage") return s("this.rt.stopOthers(this);");
        return s("return;");
      }
      case "control_create_clone_of": return s(`this.createCloneOf(${this.str(b, "CLONE_OPTION")});`);
      case "control_delete_this_clone": return this.target.isStage ? "" : s("this.deleteClone();");

      case "sensing_askandwait": return s(`yield* this.ask(${this.any(b, "QUESTION")});`);
      case "sensing_resettimer": return s("this.restartTimer();");
      case "sensing_setdragmode": return s(`this.draggable = ${f("DRAG_MODE") === "draggable"};`);

      case "data_setvariableto": return s(`${this.varRef(f("VARIABLE"))} = ${this.any(b, "VALUE")};`);
      case "data_changevariableby": { const r = this.varRef(f("VARIABLE")); return s(`${r} = C.toNumber(${r}) + ${this.num(b, "VALUE")};`); }
      case "data_showvariable": return s(`this.showWatcher(${q(f("VARIABLE"))}, true);`);
      case "data_hidevariable": return s(`this.showWatcher(${q(f("VARIABLE"))}, false);`);
      case "data_addtolist": return s(`Ops.add(${this.varRef(f("LIST"))}, ${this.any(b, "ITEM")});`);
      case "data_deleteoflist": return s(`Ops.deleteOf(${this.varRef(f("LIST"))}, ${this.any(b, "INDEX")});`);
      case "data_deletealloflist": return s(`${this.varRef(f("LIST"))}.length = 0;`);
      case "data_insertatlist": return s(`Ops.insertAt(${this.varRef(f("LIST"))}, ${this.any(b, "ITEM")}, ${this.any(b, "INDEX")});`);
      case "data_replaceitemoflist": return s(`Ops.replaceAt(${this.varRef(f("LIST"))}, ${this.any(b, "INDEX")}, ${this.any(b, "ITEM")});`);
      case "data_showlist": return s(`this.showWatcher(${q(f("LIST"))}, true);`);
      case "data_hidelist": return s(`this.showWatcher(${q(f("LIST"))}, false);`);

      case "pen_clear": return s("this.clearAllPen();");
      case "pen_stamp": return this.target.isStage ? "" : s("this.stamp();");
      case "pen_penDown": return this.target.isStage ? "" : s("this.penDown = true;");
      case "pen_penUp": return this.target.isStage ? "" : s("this.penDown = false;");
      case "pen_setPenColorToColor": return this.target.isStage ? "" : s(`this.setPenColor(${this.str(b, "COLOR")});`);
      case "pen_changePenColorParamBy": return this.target.isStage ? "" : s(`this.setPenParam(${this.str(b, "COLOR_PARAM")}, ${this.any(b, "VALUE")}, true);`);
      case "pen_setPenColorParamTo": return this.target.isStage ? "" : s(`this.setPenParam(${this.str(b, "COLOR_PARAM")}, ${this.any(b, "VALUE")}, false);`);
      case "pen_changePenSizeBy": return this.target.isStage ? "" : s(`this.setPenSize(${this.num(b, "SIZE")}, true);`);
      case "pen_setPenSizeTo": return this.target.isStage ? "" : s(`this.setPenSize(${this.num(b, "SIZE")}, false);`);

      case "procedures_call": return s(`${this.call(b)};`);
      case "procedures_return": return s(`return ${this.any(b, "VALUE")};`);
    }
    // A reporter dropped into a stack position can't happen; anything unknown is skipped.
    return "";
  }

  private call(b: SBlock): string {
    const id = String(b.extraState?.procId ?? "");
    const proc = this.procs.get(id);
    if (!proc) return '""';
    const args = proc.parts
      .filter((p) => p.type !== "label")
      .map((p) => (p.type === "bool" ? this.bool(b, p.id!) : this.any(b, p.id!)));
    return `(yield* this.rt.call(${q(id)}, ${proc.warp}, this.p_${ident(id)}(${args.join(", ")})))`;
  }

  /* ---------- scripts ---------- */

  compile(): string {
    const name = (b: SBlock) => `s_${ident(b.id)}`;
    for (const top of topBlocks(this.target)) {
      if (top.enabled === false) continue;
      if (top.type === "procedures_definition") {
        const proc = top.extraState as unknown as ProcState;
        if (!proc?.id) continue;
        const params = proc.parts.filter((p) => p.type !== "label");
        this.args = new Map(params.map((p, k) => [p.id!, `a${k}`]));
        this.inWarp = proc.warp;
        const body = this.stack(top.next?.block, "    ");
        this.methods.push(`  *p_${ident(proc.id)}(${params.map((_, k) => `a${k}`).join(", ")}) {\n${body}\n  }`);
        this.args = null;
        this.inWarp = false;
        continue;
      }
      const hat = HATS[top.type];
      const body = this.stack(hat !== undefined ? top.next?.block : top, "    ");
      if (hat === undefined && top.type !== "procedures_call" && !this.isStatement(top)) {
        // A lone reporter: clicking it shows its value.
        this.methods.push(`  *${name(top)}() {\n    this.rt.report(${q(top.id)}, ${this.expr(top)});\n  }`);
        this.scripts.push(`${q(top.id)}: this.${name(top)}`);
        continue;
      }
      this.methods.push(`  *${name(top)}() {\n${body}\n  }`);
      this.scripts.push(`${q(top.id)}: this.${name(top)}`);
      if (hat === undefined) continue;
      const f = (n: string) => this.fieldValue(top, n);
      let trigger = "";
      switch (top.type) {
        case "event_whenflagclicked": trigger = "Trigger.GREEN_FLAG, {}"; break;
        case "event_whenkeypressed": trigger = `Trigger.KEY_PRESSED, { key: ${q(f("KEY_OPTION"))} }`; break;
        case "event_whenthisspriteclicked":
        case "event_whenstageclicked": trigger = "Trigger.CLICKED, {}"; break;
        case "event_whenbackdropswitchesto": trigger = `Trigger.BACKDROP_CHANGED, { backdrop: ${q(f("BACKDROP"))} }`; break;
        case "event_whenbroadcastreceived": trigger = `Trigger.BROADCAST, { name: ${q(f("BROADCAST_OPTION"))} }`; break;
        case "control_start_as_clone": trigger = "Trigger.CLONE_START, {}"; break;
        case "event_whengreaterthan": {
          const value = `v_${ident(top.id)}`;
          this.methods.push(`  ${value}() {\n    return ${this.num(top, "VALUE")};\n  }`);
          const kind = f("WHENGREATERTHANMENU") === "LOUDNESS" ? "LOUDNESS_GREATER_THAN" : "TIMER_GREATER_THAN";
          trigger = `Trigger.${kind}, { VALUE: (t) => t.${value}() }`;
          break;
        }
      }
      this.triggers.push(`L.trigger(${trigger}, this.${name(top)}, ${q(top.id)})`);
    }
    const base = this.target.isStage ? "RStage" : "RSprite";
    return `classes[${q(this.target.id)}] = class extends ${base} {
  constructor(a, b) {
    super(a, b);
    this.triggers = [${this.triggers.join(", ")}];
    this.scripts = {${this.scripts.join(", ")}};
  }
${this.methods.join("\n")}
};`;
  }

  /** One block (a script, or a lone reporter) as a generator body, to run straight from the palette. */
  snippet(top: SBlock): string {
    if (!this.isStatement(top) && top.type !== "procedures_call") return `this.rt.report(${q(top.id)}, ${this.expr(top)});`;
    return this.stack(HATS[top.type] !== undefined ? top.next?.block : top, "  ");
  }

  private isStatement(b: SBlock): boolean {
    return this.statement({ ...b, next: undefined }, "") !== "" || b.type.startsWith("control_") || b.type === "procedures_return";
  }
}

/** The whole project as one function body: `(L) => { ...; return classes; }`. */
export function compileProject(project: CodeProject, debug = false): string {
  const parts = [project.stage, ...project.sprites].map((t) => new TargetCompiler(t, debug).compile());
  return `const { RSprite, RStage, Trigger, C, Ops, WAIT } = L;
const classes = {};
${parts.join("\n")}
return classes;`;
}

/** A block from the palette, compiled for one target: `(L) => function* () {...}`, run with that target as `this`. */
export function compileSnippet(target: Target, block: SBlock): string {
  return `const { C, Ops, WAIT } = L;
return function* () {
${new TargetCompiler(target).snippet(block)}
};`;
}

export type { SBlock };
