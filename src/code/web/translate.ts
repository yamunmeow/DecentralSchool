import { costumeSvg } from "../art";
import { procedures, topBlocks, type ProcState } from "../compiler";
import { soundWav } from "../sounds";
import type { CodeProject, SoundAsset, Target } from "../types";
// Comments written into the files speak the studio's language.
import { getLang, t, t as words } from "../../studio/i18n";

/**
 * A Game Lab project as a plain web page: index.html (the stage and its sprites as
 * <img> elements), style.css (where they start and how they look) and script.js
 * (what they do, in modern JavaScript with async/await, using web.js).
 *
 * This is a translation for learning, not the Scratch runtime: touching uses the
 * boxes around pictures, timing follows the browser's frames, and a few blocks
 * (colour sensing, loudness, some effects) have no web version and become comments.
 * Every line of script.js remembers which block it came from.
 */

export interface WebFiles {
  html: string;
  css: string;
  js: string;
}

export interface WebAsset {
  path: string;
  /** Text (SVG) or bytes (sounds). */
  data: string | Uint8Array;
  type: string;
}

export interface WebTranslation {
  files: WebFiles;
  assets: WebAsset[];
  /** Block id → [first line, last line] in script.js (1-based). */
  lines: Map<string, [number, number]>;
  /** Target id → [first line, last line] of its part of script.js. */
  sections: Map<string, [number, number]>;
  /** Target id → its JavaScript name. */
  names: Map<string, string>;
  warnings: string[];
}

interface SBlock {
  type: string;
  id: string;
  fields?: Record<string, unknown>;
  inputs?: Record<string, { block?: SBlock; shadow?: SBlock }>;
  next?: { block?: SBlock };
  extraState?: Record<string, unknown>;
  enabled?: boolean;
}

type Kind = "num" | "str" | "bool" | "any";
interface Expr {
  code: string;
  kind: Kind;
}

const RESERVED = new Set(
  "break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof new null return super switch this throw true try typeof var void while with yield let static enum await implements package protected interface private public arguments eval undefined NaN Infinity window document stage vars mouse pen backdrop random wait nextFrame waitUntil answer ask timer resetTimer broadcast broadcastAndWait stopAll keyPressed mod contains degrees showVariable playFile stopAllSounds eraseAll Sprite Backdrop me Math Number String".split(" "),
);

/** "Zo Chef" → zoChef */
export function camel(name: string, fallback = "thing"): string {
  const words = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  let out = words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join("");
  if (!out) out = fallback;
  if (/^[0-9]/.test(out)) out = `_${out}`;
  return RESERVED.has(out) ? `${out}Sprite` : out;
}

/** "Zo walk 1" → zo-walk-1 */
export function slug(name: string, fallback = "item"): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || fallback
  );
}

function unique(base: string, taken: Set<string>): string {
  let name = base;
  for (let i = 2; taken.has(name); i++) name = `${base}${i}`;
  taken.add(name);
  return name;
}

const prop = (name: string) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) && !RESERVED.has(name) ? `.${name}` : `[${JSON.stringify(name)}]`);
const q = (s: unknown) => JSON.stringify(String(s ?? ""));
const isNumeric = (s: string) => s.trim() !== "" && !Number.isNaN(Number(s));
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function svgSize(svg: string): [number, number] {
  const w = Number.parseFloat(svg.match(/<svg[^>]*\swidth="([\d.]+)/)?.[1] || "");
  const h = Number.parseFloat(svg.match(/<svg[^>]*\sheight="([\d.]+)/)?.[1] || "");
  const vb = svg.match(/viewBox="[\d.\-]+[\s,]+[\d.\-]+[\s,]+([\d.]+)[\s,]+([\d.]+)"/);
  return [w || Number(vb?.[1]) || 100, h || Number(vb?.[2]) || 100];
}

function soundFile(s: SoundAsset, base: string): { file: string; data: Uint8Array; type: string } {
  if (s.data) {
    const mime = s.data.slice(5, s.data.indexOf(";"));
    const ext = mime.includes("webm") ? "webm" : mime.includes("ogg") ? "ogg" : mime.includes("mp4") || mime.includes("m4a") ? "m4a" : mime.includes("mpeg") ? "mp3" : "wav";
    const bin = atob(s.data.slice(s.data.indexOf(",") + 1));
    return { file: `${base}.${ext}`, data: Uint8Array.from(bin, (c) => c.charCodeAt(0)), type: mime || "audio/wav" };
  }
  return { file: `${base}.wav`, data: soundWav(s.synth || "pop"), type: "audio/wav" };
}

/* ---------- script.js ---------- */

class Writer {
  lines: string[] = [];
  ranges = new Map<string, [number, number]>();
  line(text = "") {
    this.lines.push(text);
  }
  get at() {
    return this.lines.length + 1;
  }
  mark(ids: string[], start: number) {
    const end = this.lines.length;
    if (end < start) return;
    for (const id of ids) {
      const old = this.ranges.get(id);
      // Keep the tightest range for a block (its own statement, not an enclosing one).
      if (!old || end - start <= old[1] - old[0]) this.ranges.set(id, [start, end]);
    }
  }
}

class Translator {
  out = new Writer();
  warnings: string[] = [];
  private touched: string[] = [];
  private spriteNames = new Map<string, string>();
  private names = new Map<string, string>();
  private costumeSlugs = new Map<string, Map<string, string>>();
  private soundFiles = new Map<string, Map<string, string>>();
  private backdropSlugs = new Map<string, string>();
  private procNames = new Map<string, string>();
  private args: Map<string, string> | null = null;
  private target!: Target;
  private loopCount = 0;

  constructor(private project: CodeProject) {
    const taken = new Set<string>();
    for (const s of project.sprites) {
      const n = unique(camel(s.name, "sprite"), taken);
      this.names.set(s.id, n);
      this.spriteNames.set(s.name, n);
    }
    const bdTaken = new Set<string>();
    for (const c of project.stage.costumes) this.backdropSlugs.set(c.name, unique(slug(c.name, "backdrop"), bdTaken));
    for (const t of [project.stage, ...project.sprites]) {
      const ct = new Set<string>();
      this.costumeSlugs.set(t.id, new Map(t.costumes.map((c) => [c.name, unique(slug(c.name, "costume"), ct)])));
      const st = new Set<string>();
      this.soundFiles.set(t.id, new Map(t.sounds.map((s) => [s.name, soundFile(s, unique(slug(s.name, "sound"), st)).file])));
    }
    // My Blocks with the same name in two sprites get the sprite's name in front.
    const seen = new Map<string, number>();
    const all = [project.stage, ...project.sprites].flatMap((t) => procedures(t).map((p) => ({ t, p, base: camel(procLabel(p), "myBlock") })));
    for (const { base } of all) seen.set(base, (seen.get(base) || 0) + 1);
    const procTaken = new Set<string>([...this.names.values()]);
    for (const { t, p, base } of all) {
      const owner = t.isStage ? "stage" : this.names.get(t.id)!;
      const name = (seen.get(base) || 0) > 1 ? owner + base[0].toUpperCase() + base.slice(1) : base;
      this.procNames.set(`${t.id}:${p.id}`, unique(name, procTaken));
    }
  }

  spriteName(id: string) {
    return this.names.get(id) || "sprite";
  }

  private warn(text: string) {
    if (!this.warnings.includes(text)) this.warnings.push(text);
  }

  private field(b: SBlock, name: string): string {
    const f = b.fields?.[name];
    if (f && typeof f === "object" && "id" in (f as object)) return String((f as { id: string }).id);
    return String(f ?? "");
  }

  private varRef(id: string): string {
    const t = this.target;
    const local = t.variables.find((v) => v.id === id) || t.lists.find((v) => v.id === id);
    const global = this.project.stage.variables.find((v) => v.id === id) || this.project.stage.lists.find((v) => v.id === id);
    if (local && !t.isStage) return `me.vars${prop(local.name)}`;
    const v = global || local;
    return v ? `vars${prop(v.name)}` : "vars.unknown";
  }

  private me() {
    return this.target.isStage ? null : "me";
  }

  /* ----- inputs ----- */

  private input(b: SBlock, name: string, as: Kind): Expr {
    const inp = b.inputs?.[name];
    if (inp?.block) return this.convert(this.expr(inp.block), as);
    const s = inp?.shadow;
    if (!s) return as === "bool" ? { code: "false", kind: "bool" } : as === "num" ? { code: "0", kind: "num" } : { code: '""', kind: "str" };
    const key = Object.keys(s.fields || {})[0];
    const v = key ? this.field(s, key) : "";
    if (s.type.startsWith("math_")) return { code: String(Number(v) || 0), kind: "num" };
    if (as === "num" || (as === "any" && isNumeric(v))) return isNumeric(v) ? { code: String(Number(v)), kind: "num" } : { code: "0", kind: "num" };
    return { code: q(v), kind: "str" };
  }

  /** The raw value of a menu input (a sprite name, "_mouse_", a costume…), or null if a reporter is plugged in. */
  private menu(b: SBlock, name: string): string | null {
    const inp = b.inputs?.[name];
    if (inp?.block) return null;
    const s = inp?.shadow;
    const key = s ? Object.keys(s.fields || {})[0] : "";
    return s && key ? this.field(s, key) : "";
  }

  private convert(e: Expr, as: Kind): Expr {
    if (as === "num" && e.kind !== "num") return { code: `Number(${e.code})`, kind: "num" };
    if (as === "str" && e.kind !== "str") return { code: `String(${e.code})`, kind: "str" };
    if (as === "bool" && e.kind !== "bool") return { code: `Boolean(${e.code})`, kind: "bool" };
    return e;
  }

  private sprite(name: string): string {
    if (name === "_mouse_") return '"mouse"';
    if (name === "_edge_") return '"edge"';
    if (name === "_myself_") return "me";
    return this.spriteNames.get(name) || q(name);
  }

  /* ----- reporters ----- */

  expr(b: SBlock): Expr {
    this.touched.push(b.id);
    const n = (name: string) => this.input(b, name, "num").code;
    const a = (name: string) => this.input(b, name, "any").code;
    const f = (name: string) => this.field(b, name);
    const me = this.me() || "stage";
    const num = (code: string): Expr => ({ code, kind: "num" });
    const bool = (code: string): Expr => ({ code, kind: "bool" });
    const str = (code: string): Expr => ({ code, kind: "str" });
    switch (b.type) {
      case "motion_xposition": return num(`${me}.x`);
      case "motion_yposition": return num(`${me}.y`);
      case "motion_direction": return num(`${me}.direction`);
      case "looks_costumenumbername": return f("NUMBER_NAME") === "name" ? str(`${me}.costumeName`) : num(`${me}.costume`);
      case "looks_backdropnumbername": return f("NUMBER_NAME") === "name" ? str("backdrop.name") : num("backdrop.number");
      case "looks_size": return num(`Math.round(${me}.size)`);
      case "sound_volume": return num(`${me}.volume`);
      case "sensing_touchingobject": {
        const m = this.menu(b, "TOUCHINGOBJECTMENU");
        return bool(`${me}.touching(${m === null ? "null" : this.sprite(m)})`);
      }
      case "sensing_touchingcolor":
      case "sensing_coloristouchingcolor":
        this.warn("“touching color” has no web version (the page only knows the boxes around pictures).");
        return bool(`false /* ${t("touching a colour works only in Game Lab")} */`);
      case "sensing_distanceto": {
        const m = this.menu(b, "DISTANCETOMENU");
        return num(`${me}.distanceTo(${m === null ? '"mouse"' : this.sprite(m)})`);
      }
      case "sensing_answer": return str("answer()");
      case "sensing_keypressed": return bool(`keyPressed(${this.menu(b, "KEY_OPTION") !== null ? q(this.menu(b, "KEY_OPTION")) : a("KEY_OPTION")})`);
      case "sensing_mousedown": return bool("mouse.down");
      case "sensing_mousex": return num("mouse.x");
      case "sensing_mousey": return num("mouse.y");
      case "sensing_loudness":
        this.warn("“loudness” has no web version here.");
        return num(`0 /* ${t("loudness works only in Game Lab")} */`);
      case "sensing_timer": return num("timer()");
      case "sensing_of": {
        const object = this.menu(b, "OBJECT") ?? "_stage_";
        const p = f("PROPERTY");
        if (object === "_stage_") {
          if (p === "backdrop #") return num("backdrop.number");
          if (p === "backdrop name") return str("backdrop.name");
          if (p === "volume") return num("100");
          return { code: `vars${prop(p)}`, kind: "any" };
        }
        const s = this.sprite(object);
        const map: Record<string, Expr> = { "x position": num(`${s}.x`), "y position": num(`${s}.y`), direction: num(`${s}.direction`), "costume #": num(`${s}.costume`), "costume name": str(`${s}.costumeName`), size: num(`Math.round(${s}.size)`), volume: num(`${s}.volume`) };
        return map[p] || { code: `${s}.vars${prop(p)}`, kind: "any" };
      }
      case "sensing_current": {
        const m: Record<string, string> = { YEAR: "getFullYear()", MONTH: "getMonth() + 1", DATE: "getDate()", DAYOFWEEK: "getDay() + 1", HOUR: "getHours()", MINUTE: "getMinutes()", SECOND: "getSeconds()" };
        return num(`new Date().${m[f("CURRENTMENU")] || "getFullYear()"}`);
      }
      case "sensing_dayssince2000": return num("daysSince2000()");
      case "sensing_username": return str('""');

      case "operator_add": return num(`(${n("NUM1")} + ${n("NUM2")})`);
      case "operator_subtract": return num(`(${n("NUM1")} - ${n("NUM2")})`);
      case "operator_multiply": return num(`(${n("NUM1")} * ${n("NUM2")})`);
      case "operator_divide": return num(`(${n("NUM1")} / ${n("NUM2")})`);
      case "operator_random": return num(`random(${n("FROM")}, ${n("TO")})`);
      case "operator_gt":
      case "operator_lt":
      case "operator_equals": {
        const l = this.input(b, "OPERAND1", "any");
        const r = this.input(b, "OPERAND2", "any");
        const op = b.type === "operator_gt" ? ">" : b.type === "operator_lt" ? "<" : "==";
        const numeric = op !== "==" && (l.kind === "num" || r.kind === "num");
        return bool(`${numeric ? this.convert(l, "num").code : l.code} ${op} ${numeric ? this.convert(r, "num").code : r.code}`);
      }
      case "operator_and": return bool(`(${this.input(b, "OPERAND1", "bool").code} && ${this.input(b, "OPERAND2", "bool").code})`);
      case "operator_or": return bool(`(${this.input(b, "OPERAND1", "bool").code} || ${this.input(b, "OPERAND2", "bool").code})`);
      case "operator_not": return bool(`!${this.input(b, "OPERAND", "bool").code}`);
      case "operator_join": {
        const l = this.input(b, "STRING1", "any");
        const r = this.input(b, "STRING2", "any");
        return str(l.kind === "str" || r.kind === "str" ? `${l.code} + ${r.code}` : `String(${l.code}) + ${r.code}`);
      }
      case "operator_letter_of": return str(`String(${a("STRING")}).charAt(${n("LETTER")} - 1)`);
      case "operator_length": return num(`String(${a("STRING")}).length`);
      case "operator_contains": return bool(`contains(${a("STRING1")}, ${a("STRING2")})`);
      case "operator_mod": return num(`mod(${n("NUM1")}, ${n("NUM2")})`);
      case "operator_round": return num(`Math.round(${n("NUM")})`);
      case "operator_mathop": {
        const v = n("NUM");
        const op = f("OPERATOR");
        const m: Record<string, string> = { abs: `Math.abs(${v})`, floor: `Math.floor(${v})`, ceiling: `Math.ceil(${v})`, sqrt: `Math.sqrt(${v})`, sin: `degrees.sin(${v})`, cos: `degrees.cos(${v})`, tan: `degrees.tan(${v})`, asin: `degrees.asin(${v})`, acos: `degrees.acos(${v})`, atan: `degrees.atan(${v})`, ln: `Math.log(${v})`, log: `Math.log10(${v})`, "e ^": `Math.exp(${v})`, "10 ^": `10 ** ${v}` };
        return num(m[op] || v);
      }

      case "data_variable": return { code: this.varRef(f("VARIABLE")), kind: "any" };
      case "data_listcontents": return str(`${this.varRef(f("LIST"))}.join(" ")`);
      case "data_itemoflist": {
        const list = this.varRef(f("LIST"));
        const idx = this.menuLiteral(b, "INDEX");
        if (idx === "last") return { code: `${list}[${list}.length - 1]`, kind: "any" };
        if (idx === "random") return { code: `${list}[random(0, ${list}.length - 1)]`, kind: "any" };
        return { code: `${list}[${n("INDEX")} - 1]`, kind: "any" };
      }
      case "data_itemnumoflist": return num(`(${this.varRef(f("LIST"))}.indexOf(${a("ITEM")}) + 1)`);
      case "data_lengthoflist": return num(`${this.varRef(f("LIST"))}.length`);
      case "data_listcontainsitem": return bool(`${this.varRef(f("LIST"))}.includes(${a("ITEM")})`);

      case "argument_reporter_string_number":
      case "argument_reporter_boolean": {
        const name = this.args?.get(String(b.extraState?.argId ?? ""));
        return name ? { code: name, kind: b.type.endsWith("boolean") ? "bool" : "any" } : num("0");
      }
      case "procedures_call": return { code: `(${this.call(b)})`, kind: "any" };
    }
    // A shadow used directly, or something without a web version.
    const key = Object.keys(b.fields || {})[0];
    if (key) {
      const v = this.field(b, key);
      return isNumeric(v) ? num(String(Number(v))) : str(q(v));
    }
    return str('""');
  }

  private menuLiteral(b: SBlock, name: string): string | null {
    const inp = b.inputs?.[name];
    if (inp?.block) return null;
    const s = inp?.shadow;
    const key = s ? Object.keys(s.fields || {})[0] : "";
    return s && key ? this.field(s, key) : null;
  }

  private call(b: SBlock): string {
    const proc = (b.extraState?.proc as ProcState) || null;
    const id = String(b.extraState?.procId ?? "");
    const name = this.procNames.get(`${this.target.id}:${id}`);
    if (!proc || !name) return '""';
    const params = proc.parts.filter((p) => p.type !== "label");
    const args = params.map((p) => (p.type === "bool" ? this.input(b, p.id!, "bool").code : this.input(b, p.id!, "any").code));
    return `await ${name}(${[this.me() ? "me" : "null", ...args].join(", ")})`;
  }

  /* ----- statements ----- */

  private stack(first: SBlock | undefined, indent: string) {
    for (let b = first; b; b = b.next?.block) if (b.enabled !== false) this.statement(b, indent);
  }

  private block(b: SBlock, indent: string, head: string, inner: string, tail = "}", innerExtra: string[] = []) {
    const start = this.out.at;
    this.touched = [];
    this.out.line(`${indent}${head}`);
    const ids = [b.id, ...this.touched];
    this.out.mark(ids, start);
    this.stack(b.inputs?.[inner]?.block, indent + "  ");
    for (const extra of innerExtra) this.out.line(`${indent}  ${extra}`);
    this.out.line(`${indent}${tail}`);
    this.out.mark([b.id], start);
  }

  private statement(b: SBlock, i: string) {
    const start = this.out.at;
    this.touched = [];
    const n = (name: string) => this.input(b, name, "num").code;
    const a = (name: string) => this.input(b, name, "any").code;
    const f = (name: string) => this.field(b, name);
    const me = this.me();
    const line = (text: string) => this.out.line(`${i}${text}`);
    const sprite = (text: string) => (me ? line(text) : line(`// ${text.replace(/;$/, "")} (${t("only sprites can do this")})`));

    switch (b.type) {
      case "motion_movesteps": sprite(`me.move(${n("STEPS")});`); break;
      case "motion_turnright": sprite(`me.turnRight(${n("DEGREES")});`); break;
      case "motion_turnleft": sprite(`me.turnLeft(${n("DEGREES")});`); break;
      case "motion_goto": {
        const m = this.menu(b, "TO");
        if (m === "_random_") sprite("me.goToRandomPosition();");
        else sprite(`me.goTo(${m === null ? "mouse" : this.sprite(m).replace('"mouse"', "mouse")});`);
        break;
      }
      case "motion_gotoxy": sprite(`me.goTo(${n("X")}, ${n("Y")});`); break;
      case "motion_glideto": {
        const m = this.menu(b, "TO");
        if (m === "_random_") sprite(`await me.glideTo(${n("SECS")}, random(-240, 240), random(-180, 180));`);
        else sprite(`await me.glideTo(${n("SECS")}, ${m === null ? "mouse" : this.sprite(m).replace('"mouse"', "mouse")});`);
        break;
      }
      case "motion_glidesecstoxy": sprite(`await me.glideTo(${n("SECS")}, ${n("X")}, ${n("Y")});`); break;
      case "motion_pointindirection": sprite(`me.pointInDirection(${n("DIRECTION")});`); break;
      case "motion_pointtowards": {
        const m = this.menu(b, "TOWARDS");
        if (m === "_random_") sprite("me.pointInDirection(random(-179, 180));");
        else sprite(`me.pointTowards(${m === null ? '"mouse"' : this.sprite(m)});`);
        break;
      }
      case "motion_changexby": sprite(`me.changeXBy(${n("DX")});`); break;
      case "motion_setx": sprite(`me.setX(${n("X")});`); break;
      case "motion_changeyby": sprite(`me.changeYBy(${n("DY")});`); break;
      case "motion_sety": sprite(`me.setY(${n("Y")});`); break;
      case "motion_ifonedgebounce": sprite("me.ifOnEdgeBounce();"); break;
      case "motion_setrotationstyle": sprite(`me.setRotationStyle(${q(f("STYLE"))});`); break;

      case "looks_sayforsecs": sprite(`await me.sayFor(${a("MESSAGE")}, ${n("SECS")});`); break;
      case "looks_say": sprite(`me.say(${a("MESSAGE")});`); break;
      case "looks_thinkforsecs": sprite(`await me.thinkFor(${a("MESSAGE")}, ${n("SECS")});`); break;
      case "looks_think": sprite(`me.think(${a("MESSAGE")});`); break;
      case "looks_switchcostumeto": {
        const m = this.menu(b, "COSTUME");
        const slugs = this.costumeSlugs.get(this.target.id)!;
        sprite(`me.switchCostume(${m === null ? a("COSTUME") : q(slugs.get(m) ?? slug(m))});`);
        break;
      }
      case "looks_nextcostume": sprite("me.nextCostume();"); break;
      case "looks_switchbackdropto":
      case "looks_switchbackdroptoandwait": {
        const m = this.menu(b, "BACKDROP");
        const value = m === null ? a("BACKDROP") : this.backdropSlugs.has(m) ? q(this.backdropSlugs.get(m)) : q(m);
        line(`backdrop.switchTo(${value});`);
        break;
      }
      case "looks_nextbackdrop": line("backdrop.next();"); break;
      case "looks_changesizeby": sprite(`me.changeSizeBy(${n("CHANGE")});`); break;
      case "looks_setsizeto": sprite(`me.setSize(${n("SIZE")});`); break;
      case "looks_changeeffectby":
      case "looks_seteffectto": {
        const effect = f("EFFECT").toLowerCase();
        if (!["ghost", "brightness", "color"].includes(effect)) {
          this.warn(`The ${effect} effect has no web version here.`);
          line(`// ${t("{effect} effect: works only in Game Lab", { effect })}`);
        } else if (b.type === "looks_changeeffectby") sprite(`me.changeEffect(${q(effect)}, ${n("CHANGE")});`);
        else sprite(`me.setEffect(${q(effect)}, ${n("VALUE")});`);
        break;
      }
      case "looks_cleargraphiceffects": sprite("me.clearEffects();"); break;
      case "looks_show": sprite("me.show();"); break;
      case "looks_hide": sprite("me.hide();"); break;
      case "looks_gotofrontback": sprite(f("FRONT_BACK") === "front" ? "me.goToFront();" : "me.goToBack();"); break;
      case "looks_goforwardbackwardlayers": sprite(f("FORWARD_BACKWARD") === "forward" ? `me.goForward(${n("NUM")});` : `me.goBackward(${n("NUM")});`); break;

      case "sound_playuntildone":
      case "sound_play": {
        const m = this.menu(b, "SOUND_MENU");
        const file = m === null ? a("SOUND_MENU") : q(this.soundFiles.get(this.target.id)?.get(m) ?? `${slug(m)}.wav`);
        const wait = b.type === "sound_playuntildone";
        if (me) line(wait ? `await me.playSoundUntilDone(${file});` : `me.playSound(${file});`);
        else line(`playFile(${m === null ? file : q(`sounds/stage/${JSON.parse(file)}`)});`);
        break;
      }
      case "sound_stopallsounds": line("stopAllSounds();"); break;
      case "sound_setvolumeto": sprite(`me.setVolume(${n("VOLUME")});`); break;
      case "sound_changevolumeby": sprite(`me.setVolume(me.volume + ${n("VOLUME")});`); break;
      case "sound_changeeffectby":
      case "sound_seteffectto":
      case "sound_cleareffects":
        this.warn("Sound effects (pitch, pan) have no web version here.");
        line(`// ${t("sound effects work only in Game Lab")}`);
        break;

      case "event_broadcast": line(`broadcast(${this.broadcastName(b)});`); break;
      case "event_broadcastandwait": line(`await broadcastAndWait(${this.broadcastName(b)});`); break;

      case "control_wait": line(`await wait(${n("DURATION")});`); break;
      case "control_repeat": {
        const v = ["i", "j", "k", "n", "m"][this.loopCount++ % 5];
        this.block(b, i, `for (let ${v} = 0; ${v} < ${n("TIMES")}; ${v}++) {`, "SUBSTACK", "}", ["await nextFrame();"]);
        this.loopCount--;
        return;
      }
      case "control_forever": this.block(b, i, "while (true) {", "SUBSTACK", "}", ["await nextFrame();"]); return;
      case "control_if": this.block(b, i, `if (${this.input(b, "CONDITION", "bool").code}) {`, "SUBSTACK"); return;
      case "control_if_else": {
        const s = this.out.at;
        this.touched = [];
        this.out.line(`${i}if (${this.input(b, "CONDITION", "bool").code}) {`);
        this.out.mark([b.id, ...this.touched], s);
        this.stack(b.inputs?.SUBSTACK?.block, i + "  ");
        this.out.line(`${i}} else {`);
        this.stack(b.inputs?.SUBSTACK2?.block, i + "  ");
        this.out.line(`${i}}`);
        this.out.mark([b.id], s);
        return;
      }
      case "control_wait_until": line(`await waitUntil(() => ${this.input(b, "CONDITION", "bool").code});`); break;
      case "control_repeat_until": this.block(b, i, `while (!${this.wrap(this.input(b, "CONDITION", "bool").code)}) {`, "SUBSTACK", "}", ["await nextFrame();"]); return;
      case "control_stop": {
        const opt = f("STOP_OPTION");
        if (opt === "all") line("stopAll();");
        else if (opt.startsWith("other")) {
          this.warn("“stop other scripts” has no web version here.");
          line(`// ${t("stop other scripts: works only in Game Lab")}`);
        } else line("return;");
        break;
      }
      case "control_create_clone_of": {
        const m = this.menu(b, "CLONE_OPTION");
        line(`${m === "_myself_" || m === null ? (me ? "me" : "null") : this.sprite(m)}.createClone();`);
        break;
      }
      case "control_delete_this_clone":
        if (me) {
          line("me.deleteClone();");
          line("return;");
        }
        break;

      case "sensing_askandwait": line(`await ask(${a("QUESTION")});`); break;
      case "sensing_resettimer": line("resetTimer();"); break;
      case "sensing_setdragmode": line(`// ${t("drag mode: works only in Game Lab")}`); break;

      case "data_setvariableto": line(`${this.varRef(f("VARIABLE"))} = ${a("VALUE")};`); break;
      case "data_changevariableby": {
        const v = this.varRef(f("VARIABLE"));
        line(`${v} = Number(${v}) + ${n("VALUE")};`);
        break;
      }
      case "data_showvariable": line(`showVariable(${q(this.varName(f("VARIABLE")))});`); break;
      case "data_hidevariable": line(`showVariable(${q(this.varName(f("VARIABLE")))}, false);`); break;
      case "data_showlist": line(`showVariable(${q(this.varName(f("LIST")))});`); break;
      case "data_hidelist": line(`showVariable(${q(this.varName(f("LIST")))}, false);`); break;
      case "data_addtolist": line(`${this.varRef(f("LIST"))}.push(${a("ITEM")});`); break;
      case "data_deleteoflist": {
        const list = this.varRef(f("LIST"));
        const idx = this.menuLiteral(b, "INDEX");
        if (idx === "all") line(`${list}.length = 0;`);
        else if (idx === "last") line(`${list}.pop();`);
        else line(`${list}.splice(${n("INDEX")} - 1, 1);`);
        break;
      }
      case "data_deletealloflist": line(`${this.varRef(f("LIST"))}.length = 0;`); break;
      case "data_insertatlist": line(`${this.varRef(f("LIST"))}.splice(${n("INDEX")} - 1, 0, ${a("ITEM")});`); break;
      case "data_replaceitemoflist": line(`${this.varRef(f("LIST"))}[${n("INDEX")} - 1] = ${a("ITEM")};`); break;

      case "pen_clear": line("eraseAll();"); break;
      case "pen_stamp": sprite("me.stamp();"); break;
      case "pen_penDown": sprite("me.penDown();"); break;
      case "pen_penUp": sprite("me.penUp();"); break;
      case "pen_setPenColorToColor": sprite(`me.setPenColor(${this.input(b, "COLOR", "str").code});`); break;
      case "pen_changePenColorParamBy":
      case "pen_setPenColorParamTo":
        this.warn("Changing pen colour by numbers has no web version here; use “set pen color to”.");
        line(`// ${t("pen colour numbers: works only in Game Lab")}`);
        break;
      case "pen_changePenSizeBy": sprite(`me.setPenSize(me.penSize + ${n("SIZE")});`); break;
      case "pen_setPenSizeTo": sprite(`me.setPenSize(${n("SIZE")});`); break;

      case "procedures_call": line(`${this.call(b)};`); break;
      case "procedures_return": line(`return ${a("VALUE")};`); break;
      default:
        return;
    }
    this.out.mark([b.id, ...this.touched], start);
  }

  private wrap(code: string) {
    return /^[\w.]+(\(.*\))?$/.test(code) || code.startsWith("(") ? code : `(${code})`;
  }

  private varName(id: string): string {
    const all = [...this.project.stage.variables, ...this.project.stage.lists, ...this.target.variables, ...this.target.lists];
    return all.find((v) => v.id === id)?.name || "variable";
  }

  private broadcastName(b: SBlock): string {
    const m = this.menu(b, "BROADCAST_INPUT");
    return m === null ? this.input(b, "BROADCAST_INPUT", "str").code : q(m);
  }

  /* ----- one target ----- */

  section(t: Target): [number, number] | null {
    this.target = t;
    if (t.isStage && !topBlocks(t).length) return null;
    const name = t.isStage ? "stage" : this.spriteName(t.id);
    const start = this.out.at;
    this.out.line(`// ---------- ${t.isStage ? words("The stage") : t.name} ----------`);
    if (!t.isStage) {
      for (const v of t.variables) this.out.line(`${name}.vars${prop(v.name)} = ${JSON.stringify(v.value)};`);
      for (const l of t.lists) this.out.line(`${name}.vars${prop(l.name)} = ${JSON.stringify(l.value)};`);
    }
    for (const top of topBlocks(t)) {
      if (top.enabled === false) continue;
      this.out.line();
      const s = this.out.at;
      if (top.type === "procedures_definition") {
        const proc = top.extraState as unknown as ProcState;
        const fn = this.procNames.get(`${t.id}:${proc.id}`) || "myBlock";
        const params = proc.parts.filter((p) => p.type !== "label");
        const argTaken = new Set<string>(["me"]);
        this.args = new Map(params.map((p) => [p.id!, unique(camel(p.name || "input", "input"), argTaken)]));
        this.out.line(`// ${words("My Block: {name}", { name: procLabel(proc) })}`);
        this.out.line(`async function ${fn}(${["me", ...this.args.values()].join(", ")}) {`);
        this.out.mark([top.id], s);
        this.stack(top.next?.block, "  ");
        this.out.line("}");
        this.args = null;
        continue;
      }
      const hat = this.hat(top, name, t.isStage);
      if (!hat) {
        // Loose blocks that don't start with a hat don't run on their own.
        this.out.line(`// ${words("(blocks without a hat block: they run only when clicked in Game Lab)")}`);
        continue;
      }
      this.touched = [];
      this.out.line(hat);
      this.out.mark([top.id, ...this.touched], s);
      this.stack(top.next?.block, "  ");
      this.out.line("});");
    }
    return [start, this.out.lines.length] as [number, number];
  }

  private hat(top: SBlock, name: string, stage: boolean): string | null {
    const on = (method: string, args: string[] = []) => (stage ? `${method}(${[...args, "async () => {"].join(", ")}` : `${name}.${method}(${[...args, "async (me) => {"].join(", ")}`);
    switch (top.type) {
      case "event_whenflagclicked": return on("whenFlagClicked");
      case "event_whenkeypressed": return on("whenKeyPressed", [q(this.field(top, "KEY_OPTION"))]);
      case "event_whenthisspriteclicked": return on("whenClicked");
      case "event_whenstageclicked": return "whenStageClicked(async () => {";
      case "event_whenbroadcastreceived": return on("whenIReceive", [q(this.field(top, "BROADCAST_OPTION"))]);
      case "event_whenbackdropswitchesto": {
        const bd = this.field(top, "BACKDROP");
        const s = q(this.backdropSlugs.get(bd) ?? slug(bd));
        return stage ? `backdrop.whenSwitchesTo(${s}, async () => {` : `${name}.whenBackdropSwitchesTo(${s}, async (me) => {`;
      }
      case "event_whengreaterthan":
        if (this.field(top, "WHENGREATERTHANMENU") === "LOUDNESS") {
          this.warn("“when loudness >” has no web version here.");
          return null;
        }
        return on("whenTimerGreaterThan", [this.input(top, "VALUE", "num").code]);
      case "control_start_as_clone": return on("whenIStartAsAClone");
    }
    return null;
  }
}

function procLabel(p: ProcState): string {
  return p.parts.map((x) => (x.type === "label" ? x.text : `(${x.name})`)).join(" ");
}

/* ---------- the three files ---------- */

export function translate(project: CodeProject): WebTranslation {
  const tr = new Translator(project);
  const assets: WebAsset[] = [];
  const names = new Map<string, string>();
  const sections = new Map<string, [number, number]>();
  const w = tr.out;
  const title = project.title || t("Untitled");

  // script.js
  w.line(`// ${t("script.js: what happens in “{title}”. Made from the blocks in Game Lab.", { title })}`);
  w.line(`// ${t("web.js (loaded first, see index.html) gives you Sprite, wait(), nextFrame(), vars and more.")}`);
  w.line();
  const stageVars = [...project.stage.variables, ...project.stage.lists];
  if (stageVars.length) {
    w.line(`// ${t("Variables for all sprites")}`);
    for (const v of project.stage.variables) w.line(`vars${prop(v.name)} = ${JSON.stringify(v.value)};`);
    for (const l of project.stage.lists) w.line(`vars${prop(l.name)} = ${JSON.stringify(l.value)};`);
    w.line();
  }
  const backdropSlugs = new Map<string, string>();
  const bdTaken = new Set<string>();
  for (const c of project.stage.costumes) backdropSlugs.set(c.name, unique(slug(c.name, "backdrop"), bdTaken));
  w.line(`// ${t("Backdrops: pictures in the backdrops folder")}`);
  w.line(`const backdrop = new Backdrop(${JSON.stringify([...backdropSlugs.values()])});`);
  w.line();
  w.line(`// ${t("Sprites: each one is an <img> in index.html, with its costumes and sounds")}`);
  for (const s of project.sprites) {
    const n = tr.spriteName(s.id);
    names.set(s.id, n);
    const costumes = new Set<string>();
    const sounds = new Set<string>();
    const cs = s.costumes.map((c) => unique(slug(c.name, "costume"), costumes));
    const ss = s.sounds.map((x) => soundFile(x, unique(slug(x.name, "sound"), sounds)).file);
    w.line(`const ${n} = new Sprite("#${slug(n)}", {`);
    w.line(`  costumes: ${JSON.stringify(cs)},`);
    w.line(`  sounds: ${JSON.stringify(ss)},`);
    w.line("});");
  }
  for (const t of [project.stage, ...project.sprites]) {
    if (t.isStage && !topBlocks(t).length) continue;
    w.line();
    const range = tr.section(t);
    if (range) sections.set(t.id, range);
  }
  w.line();

  // Assets
  project.stage.costumes.forEach((c) => assets.push({ path: `backdrops/${backdropSlugs.get(c.name)}.svg`, data: costumeSvg(c), type: "image/svg+xml" }));
  const stageSounds = new Set<string>();
  for (const snd of project.stage.sounds) {
    const f = soundFile(snd, unique(slug(snd.name, "sound"), stageSounds));
    assets.push({ path: `sounds/stage/${f.file}`, data: f.data, type: f.type });
  }
  for (const s of project.sprites) {
    const dir = slug(names.get(s.id)!);
    const costumes = new Set<string>();
    s.costumes.forEach((c) => assets.push({ path: `costumes/${dir}/${unique(slug(c.name, "costume"), costumes)}.svg`, data: costumeSvg(c), type: "image/svg+xml" }));
    const sounds = new Set<string>();
    for (const snd of s.sounds) {
      const f = soundFile(snd, unique(slug(snd.name, "sound"), sounds));
      assets.push({ path: `sounds/${dir}/${f.file}`, data: f.data, type: f.type });
    }
  }

  // index.html
  const sprites = project.sprites
    .map((s) => {
      const id = slug(names.get(s.id)!);
      const costumes = new Set<string>();
      const file = s.costumes.map((c) => unique(slug(c.name, "costume"), costumes))[s.costume] || "costume";
      return `    <img id="${id}" class="sprite" src="costumes/${id}/${file}.svg" alt="${escapeHtml(s.name)}"${s.visible ? "" : " hidden"}>`;
    })
    .join("\n");
  const watched = [...project.stage.variables, ...project.stage.lists, ...project.sprites.flatMap((s) => [...s.variables, ...s.lists])];
  const watchers = watched
    .map((v) => {
      const owner = project.sprites.find((s) => s.variables.includes(v as never) || s.lists.includes(v as never));
      const visible = (owner || project.stage).watchers[v.id]?.visible;
      const value = Array.isArray(v.value) ? v.value.join(" ") : String(v.value);
      return `      <div class="watcher" data-var="${escapeHtml(v.name)}"${visible ? "" : " hidden"}>${escapeHtml(owner ? `${owner.name}: ${v.name}` : v.name)} <output>${escapeHtml(value)}</output></div>`;
    })
    .join("\n");
  const html = `<!doctype html>
<html lang="${getLang()}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="controls">
    <button id="go" aria-label="${t("Play")}">▶</button>
    <button id="stop" aria-label="${t("Stop")}">■</button>
    <h1>${escapeHtml(title)}</h1>
  </header>

  <!-- ${t("The stage. Each sprite is a picture (img) inside it.")} -->
  <main id="stage">
${sprites}
    <div class="watchers">
${watchers}
    </div>
  </main>

  <script src="web.js"></script>
  <script src="script.js"></script>
</body>
</html>
`;

  // style.css
  const bdFile = backdropSlugs.get(project.stage.costumes[project.stage.costume]?.name || "") || "backdrop";
  const spriteRules = project.sprites
    .map((s) => {
      const id = slug(names.get(s.id)!);
      const c = s.costumes[s.costume];
      const [cw] = c ? svgSize(costumeSvg(c)) : [100, 100];
      const left = Math.round(240 + s.x);
      const top = Math.round(180 - s.y);
      const width = Math.round((cw * s.size) / 100);
      const rotate = Math.round(s.direction - 90);
      return `/* ${t("{name} starts at x: {x}, y: {y}, size {size}%.", { name: s.name, x: Math.round(s.x), y: Math.round(s.y), size: Math.round(s.size) })} */
#${id} {
  left: ${left}px;
  top: ${top}px;
  width: ${width}px;${s.rotationStyle === "all around" && rotate ? `\n  rotate: ${rotate}deg;` : ""}
}`;
    })
    .join("\n\n");
  const css = `/* ${t("style.css: how the page looks.")} */

body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #1c1810;
  color: #fbf3dd;
  font-family: system-ui, sans-serif;
}

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
}

.controls h1 {
  font-size: 1.1rem;
  margin: 0 8px;
}

.controls button {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 12px;
  font-size: 1.2rem;
  cursor: pointer;
}

#go {
  background: #4cbf56;
  color: white;
}

#stop {
  background: #ec5959;
  color: white;
}

/* ${t("The stage is 480 × 360 pixels, like Scratch's. In Scratch (0, 0) is the middle;\n   in CSS (0, 0) is the top-left corner.")} */
#stage {
  position: relative;
  width: 480px;
  height: 360px;
  overflow: hidden;
  transform-origin: top center;
  background: white url("backdrops/${bdFile}.svg") center / cover;
}

.pen {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* ${t("Every sprite is placed by its middle point, so x: 0, y: 0 means\n   left: 240px, top: 180px.")} */
.sprite {
  position: absolute;
  translate: -50% -50%;
}

${spriteRules}

.watchers {
  position: absolute;
  left: 6px;
  top: 6px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.watcher {
  padding: 2px 6px;
  border-radius: 6px;
  background: #e5f0ff;
  color: #575e75;
  font: bold 12px system-ui, sans-serif;
}

.watcher output {
  margin-left: 4px;
  padding: 0 6px;
  border-radius: 4px;
  background: #ff8c1a;
  color: white;
}

.bubble {
  position: absolute;
  max-width: 170px;
  padding: 8px 12px;
  border: 2px solid #c8c8d0;
  border-radius: 16px;
  background: white;
  color: #262b45;
  font: bold 14px system-ui, sans-serif;
  translate: 0 -100%;
}

.bubble.think {
  border-style: dashed;
}

.ask {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  border-radius: 12px;
  background: white;
  color: #262b45;
}

.ask label {
  width: 100%;
  font-weight: bold;
}

.ask input {
  flex: 1;
  height: 32px;
  border: 2px solid #d9d9e3;
  border-radius: 16px;
  padding: 0 12px;
}

.ask button {
  width: 32px;
  border: 0;
  border-radius: 50%;
  background: #f5b700;
  color: #3d2f10;
}
`;

  return {
    files: { html, css, js: w.lines.join("\n") },
    assets,
    lines: w.ranges,
    sections,
    names,
    warnings: tr.warnings,
  };
}
