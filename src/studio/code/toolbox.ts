import type * as Blockly from "blockly/core";

/** The block palette, category by category, with starting values. */

type Item = Record<string, unknown>;
const num = (v: number, type = "math_number") => ({ shadow: { type, fields: { NUM: v } } });
const txt = (v: string) => ({ shadow: { type: "text", fields: { TEXT: v } } });
const menu = (type: string, field: string, v: string) => ({ shadow: { type, fields: { [field]: v } } });
const colour = (c: string) => ({ shadow: { type: "colour_picker", fields: { COLOUR: c } } });
const b = (type: string, inputs: Record<string, unknown> = {}, fields: Record<string, unknown> = {}): Item => ({ kind: "block", type, inputs, fields });
const label = (text: string): Item => ({ kind: "label", text });
const gap = (n = 24): Item => ({ kind: "sep", gap: n });

function motion(): Item[] {
  return [
    b("motion_movesteps", { STEPS: num(10) }),
    b("motion_turnright", { DEGREES: num(15) }),
    b("motion_turnleft", { DEGREES: num(15) }),
    gap(),
    b("motion_goto", { TO: menu("motion_goto_menu", "TO", "_random_") }),
    b("motion_gotoxy", { X: num(0), Y: num(0) }),
    b("motion_glideto", { SECS: num(1), TO: menu("motion_glideto_menu", "TO", "_random_") }),
    b("motion_glidesecstoxy", { SECS: num(1), X: num(0), Y: num(0) }),
    gap(),
    b("motion_pointindirection", { DIRECTION: num(90, "math_angle") }),
    b("motion_pointtowards", { TOWARDS: menu("motion_pointtowards_menu", "TOWARDS", "_mouse_") }),
    gap(),
    b("motion_changexby", { DX: num(10) }),
    b("motion_setx", { X: num(0) }),
    b("motion_changeyby", { DY: num(10) }),
    b("motion_sety", { Y: num(0) }),
    gap(),
    b("motion_ifonedgebounce"),
    b("motion_setrotationstyle"),
    gap(),
    b("motion_xposition"),
    b("motion_yposition"),
    b("motion_direction"),
  ];
}

function looks(stage: boolean): Item[] {
  const sprite = stage
    ? []
    : [
        b("looks_sayforsecs", { MESSAGE: txt("Hello!"), SECS: num(2) }),
        b("looks_say", { MESSAGE: txt("Hello!") }),
        b("looks_thinkforsecs", { MESSAGE: txt("Hmm..."), SECS: num(2) }),
        b("looks_think", { MESSAGE: txt("Hmm...") }),
        gap(),
        b("looks_switchcostumeto", { COSTUME: menu("looks_costume", "COSTUME", "") }),
        b("looks_nextcostume"),
      ];
  return [
    ...sprite,
    b("looks_switchbackdropto", { BACKDROP: menu("looks_backdrops", "BACKDROP", "") }),
    ...(stage ? [b("looks_switchbackdroptoandwait", { BACKDROP: menu("looks_backdrops", "BACKDROP", "") })] : []),
    b("looks_nextbackdrop"),
    gap(),
    ...(stage ? [] : [b("looks_changesizeby", { CHANGE: num(10) }), b("looks_setsizeto", { SIZE: num(100) }), gap()]),
    b("looks_changeeffectby", { CHANGE: num(25) }),
    b("looks_seteffectto", { VALUE: num(0) }),
    b("looks_cleargraphiceffects"),
    gap(),
    ...(stage ? [] : [b("looks_show"), b("looks_hide"), gap(), b("looks_gotofrontback"), b("looks_goforwardbackwardlayers", { NUM: num(1, "math_integer") }), gap(), b("looks_costumenumbername")]),
    b("looks_backdropnumbername"),
    ...(stage ? [] : [b("looks_size")]),
  ];
}

function sound(): Item[] {
  return [
    b("sound_playuntildone", { SOUND_MENU: menu("sound_sounds_menu", "SOUND_MENU", "") }),
    b("sound_play", { SOUND_MENU: menu("sound_sounds_menu", "SOUND_MENU", "") }),
    b("sound_stopallsounds"),
    gap(),
    b("sound_changeeffectby", { VALUE: num(10) }),
    b("sound_seteffectto", { VALUE: num(100) }),
    b("sound_cleareffects"),
    gap(),
    b("sound_changevolumeby", { VOLUME: num(-10) }),
    b("sound_setvolumeto", { VOLUME: num(100) }),
    b("sound_volume"),
  ];
}

function events(stage: boolean): Item[] {
  return [
    b("event_whenflagclicked"),
    b("event_whenkeypressed", {}, { KEY_OPTION: "space" }),
    b(stage ? "event_whenstageclicked" : "event_whenthisspriteclicked"),
    b("event_whenbackdropswitchesto"),
    gap(),
    b("event_whengreaterthan", { VALUE: num(10) }),
    gap(),
    b("event_whenbroadcastreceived"),
    b("event_broadcast", { BROADCAST_INPUT: menu("event_broadcast_menu", "BROADCAST_OPTION", "") }),
    b("event_broadcastandwait", { BROADCAST_INPUT: menu("event_broadcast_menu", "BROADCAST_OPTION", "") }),
  ];
}

function control(stage: boolean): Item[] {
  return [
    b("control_wait", { DURATION: num(1, "math_positive_number") }),
    gap(),
    b("control_repeat", { TIMES: num(10, "math_whole_number") }),
    b("control_forever"),
    gap(),
    b("control_if"),
    b("control_if_else"),
    b("control_wait_until"),
    b("control_repeat_until"),
    gap(),
    b("control_stop"),
    gap(),
    ...(stage ? [] : [b("control_start_as_clone")]),
    b("control_create_clone_of", { CLONE_OPTION: menu("control_create_clone_of_menu", "CLONE_OPTION", stage ? "" : "_myself_") }),
    ...(stage ? [] : [b("control_delete_this_clone")]),
  ];
}

function sensing(stage: boolean): Item[] {
  return [
    ...(stage
      ? []
      : [
          b("sensing_touchingobject", { TOUCHINGOBJECTMENU: menu("sensing_touchingobjectmenu", "TOUCHINGOBJECTMENU", "_mouse_") }),
          b("sensing_touchingcolor", { COLOR: colour("#4c97ff") }),
          b("sensing_coloristouchingcolor", { COLOR: colour("#9966ff"), COLOR2: colour("#ffab19") }),
          b("sensing_distanceto", { DISTANCETOMENU: menu("sensing_distancetomenu", "DISTANCETOMENU", "_mouse_") }),
          gap(),
        ]),
    b("sensing_askandwait", { QUESTION: txt("What's your name?") }),
    b("sensing_answer"),
    gap(),
    b("sensing_keypressed", { KEY_OPTION: menu("sensing_keyoptions", "KEY_OPTION", "space") }),
    b("sensing_mousedown"),
    b("sensing_mousex"),
    b("sensing_mousey"),
    ...(stage ? [] : [b("sensing_setdragmode")]),
    gap(),
    b("sensing_loudness"),
    gap(),
    b("sensing_timer"),
    b("sensing_resettimer"),
    gap(),
    b("sensing_of", { OBJECT: menu("sensing_of_object_menu", "OBJECT", "_stage_") }, { PROPERTY: "backdrop #" }),
    gap(),
    b("sensing_current"),
    b("sensing_dayssince2000"),
    gap(),
    b("sensing_username"),
  ];
}

function operators(): Item[] {
  return [
    b("operator_add", { NUM1: num(Number.NaN), NUM2: num(Number.NaN) }),
    b("operator_subtract", { NUM1: num(Number.NaN), NUM2: num(Number.NaN) }),
    b("operator_multiply", { NUM1: num(Number.NaN), NUM2: num(Number.NaN) }),
    b("operator_divide", { NUM1: num(Number.NaN), NUM2: num(Number.NaN) }),
    gap(),
    b("operator_random", { FROM: num(1), TO: num(10) }),
    gap(),
    b("operator_gt", { OPERAND1: txt(""), OPERAND2: txt("50") }),
    b("operator_lt", { OPERAND1: txt(""), OPERAND2: txt("50") }),
    b("operator_equals", { OPERAND1: txt(""), OPERAND2: txt("50") }),
    gap(),
    b("operator_and"),
    b("operator_or"),
    b("operator_not"),
    gap(),
    b("operator_join", { STRING1: txt("apple "), STRING2: txt("banana") }),
    b("operator_letter_of", { LETTER: num(1, "math_whole_number"), STRING: txt("apple") }),
    b("operator_length", { STRING: txt("apple") }),
    b("operator_contains", { STRING1: txt("apple"), STRING2: txt("a") }),
    gap(),
    b("operator_mod", { NUM1: num(Number.NaN), NUM2: num(Number.NaN) }),
    b("operator_round", { NUM: num(Number.NaN) }),
    gap(),
    b("operator_mathop", { NUM: num(Number.NaN) }),
  ];
}

function pen(stage: boolean): Item[] {
  if (stage) return [b("pen_clear")];
  return [
    b("pen_clear"),
    b("pen_stamp"),
    b("pen_penDown"),
    b("pen_penUp"),
    b("pen_setPenColorToColor", { COLOR: colour("#0fbd8c") }),
    b("pen_changePenColorParamBy", { COLOR_PARAM: menu("pen_menu_colorParam", "COLOR_PARAM", "color"), VALUE: num(10) }),
    b("pen_setPenColorParamTo", { COLOR_PARAM: menu("pen_menu_colorParam", "COLOR_PARAM", "color"), VALUE: num(50) }),
    b("pen_changePenSizeBy", { SIZE: num(1) }),
    b("pen_setPenSizeTo", { SIZE: num(1) }),
  ];
}

const cat = (name: string, style: string, contents: Item[] | string): Item =>
  typeof contents === "string" ? { kind: "category", name, categorystyle: `${style}_category`, custom: contents } : { kind: "category", name, categorystyle: `${style}_category`, contents };

/**
 * The palette follows the parts of an algorithm: when it starts, what it does, how it
 * decides and repeats, what it checks, and what it remembers. The editor draws these
 * groups as branches beside the categories.
 */
export const GROUPS: { name: string; cats: string[] }[] = [
  { name: "When", cats: ["events"] },
  { name: "Do", cats: ["motion", "looks", "sound", "pen"] },
  { name: "Decide & repeat", cats: ["control"] },
  { name: "Check", cats: ["sensing", "operators"] },
  { name: "Remember", cats: ["variables", "myblocks"] },
];

export function toolboxFor(stage: boolean, only: string[] | null = null): Blockly.utils.toolbox.ToolboxInfo {
  return {
    kind: "categoryToolbox",
    // A teacher's challenge can show fewer categories, so beginners aren't swamped.
    contents: ([
      cat("Start", "events", events(stage)),
      ...(stage ? [cat("Move", "motion", [label("The scene doesn't move. Pick a character to use these.")])] : [cat("Move", "motion", motion())]),
      cat("Look", "looks", looks(stage)),
      cat("Sound", "sound", sound()),
      cat("Draw", "pen", pen(stage)),
      cat("Flow", "control", control(stage)),
      cat("Sense", "sensing", sensing(stage)),
      cat("Maths & words", "operators", operators()),
      cat("Memory", "variables", "SCRATCH_VARIABLES"),
      cat("My tricks", "myblocks", "SCRATCH_PROCEDURES"),
    ] as Item[]).filter((c) => !only || only.includes(String(c.categorystyle).replace(/_category$/, ""))),
  } as unknown as Blockly.utils.toolbox.ToolboxInfo;
}

/** Variables and lists you can use here: the stage's and this sprite's, with their blocks. */
export function variablesFlyout(vars: { id: string; name: string }[], lists: { id: string; name: string }[]): Blockly.utils.toolbox.FlyoutItemInfoArray {
  const out: Item[] = [{ kind: "button", text: "+ New memory box", callbackkey: "MAKE_VARIABLE" }];
  for (const v of vars) out.push(b("data_variable", {}, { VARIABLE: { id: v.id } }));
  if (vars.length) {
    const first = { VARIABLE: { id: vars[0].id } };
    out.push(
      gap(),
      b("data_setvariableto", { VALUE: txt("0") }, first),
      b("data_changevariableby", { VALUE: num(1) }, first),
      b("data_showvariable", {}, first),
      b("data_hidevariable", {}, first),
    );
  }
  out.push(gap(), { kind: "button", text: "+ New list", callbackkey: "MAKE_LIST" });
  for (const l of lists) out.push(b("data_listcontents", {}, { LIST: { id: l.id } }));
  if (lists.length) {
    const first = { LIST: { id: lists[0].id } };
    out.push(
      gap(),
      b("data_addtolist", { ITEM: txt("thing") }, first),
      gap(),
      b("data_deleteoflist", { INDEX: num(1, "math_integer") }, first),
      b("data_deletealloflist", {}, first),
      b("data_insertatlist", { ITEM: txt("thing"), INDEX: num(1, "math_integer") }, first),
      b("data_replaceitemoflist", { INDEX: num(1, "math_integer"), ITEM: txt("thing") }, first),
      gap(),
      b("data_itemoflist", { INDEX: num(1, "math_integer") }, first),
      b("data_itemnumoflist", { ITEM: txt("thing") }, first),
      b("data_lengthoflist", {}, first),
      b("data_listcontainsitem", { ITEM: txt("thing") }, first),
      gap(),
      b("data_showlist", {}, first),
      b("data_hidelist", {}, first),
    );
  }
  return out as unknown as Blockly.utils.toolbox.FlyoutItemInfoArray;
}
