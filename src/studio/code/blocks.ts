import { registerFieldColour } from "@blockly/field-colour";
import * as Blockly from "blockly/core";
import type { CodeProject, Target } from "../../code/types";

/**
 * Game Lab's blocks. Opcodes and input names follow Scratch 3 (so the runtime,
 * the compiler, saved projects and .sb3 import keep one vocabulary), but the
 * wording, colours, icons and shapes are Game Lab's own: plain words, a category
 * icon on every step, and the "rail" renderer (renderer.ts).
 * Menus that list characters, outfits, sounds and signals read the open project.
 */

export interface EditorContext {
  project: () => CodeProject;
  target: () => Target;
  /** Ask for a new signal name; resolves to it or null. */
  newMessage: () => Promise<string | null>;
}

export const ctx: { current: EditorContext | null } = { current: null };

type Option = [string, string];
const opt = (list: (string | Option)[]): Option[] => list.map((x) => (typeof x === "string" ? [x, x] : x));
const others = () => (ctx.current ? ctx.current.project().sprites.filter((s) => s.id !== ctx.current!.target().id).map((s): Option => [s.name, s.name]) : []);
const withFallback = (list: Option[], fallback: Option): Option[] => (list.length ? list : [fallback]);

export const KEYS = ["space", "up arrow", "down arrow", "right arrow", "left arrow", "any", ..."abcdefghijklmnopqrstuvwxyz".split(""), ..."0123456789".split("")];

export const MENUS: Record<string, () => Option[]> = {
  goto: () => [["anywhere", "_random_"], ["the pointer", "_mouse_"], ...others()],
  towards: () => [["the pointer", "_mouse_"], ["any way", "_random_"], ...others()],
  costume: () => withFallback((ctx.current?.target().costumes || []).map((c): Option => [c.name, c.name]), ["costume1", "costume1"]),
  backdrop: () => [...withFallback((ctx.current?.project().stage.costumes || []).map((c): Option => [c.name, c.name]), ["backdrop1", "backdrop1"]), ["the next one", "next backdrop"], ["the one before", "previous backdrop"], ["any one", "random backdrop"]],
  backdropName: () => withFallback((ctx.current?.project().stage.costumes || []).map((c): Option => [c.name, c.name]), ["backdrop1", "backdrop1"]),
  sound: () => withFallback((ctx.current?.target().sounds || []).map((s): Option => [s.name, s.name]), ["pop", "pop"]),
  broadcast: () => [...withFallback((ctx.current?.project().broadcasts || []).map((b): Option => [b.name, b.name]), ["message1", "message1"]), ["New signal…", "__new__"]],
  clone: () => (ctx.current?.target().isStage ? withFallback(others(), ["", ""]) : [["me", "_myself_"], ...others()]),
  touching: () => [["the pointer", "_mouse_"], ["an edge", "_edge_"], ...others()],
  distance: () => [["the pointer", "_mouse_"], ...others()],
  keys: () => opt(KEYS),
  object: () => [["the scene", "_stage_"], ...(ctx.current?.project().sprites.filter((s) => s.id !== ctx.current!.target().id).map((s): Option => [s.name, s.name]) || [])],
};

/** "(x) of (character)": the list depends on what is picked on the right. */
function ofProperties(this: Blockly.FieldDropdown): Option[] {
  const block = this.getSourceBlock();
  const objectBlock = block?.getInputTargetBlock("OBJECT");
  const object = objectBlock?.getFieldValue("OBJECT") ?? "_stage_";
  const project = ctx.current?.project();
  if (object === "_stage_") {
    const vars = project?.stage.variables.map((v): Option => [v.name, v.name]) || [];
    return [["background number", "backdrop #"], ["background name", "backdrop name"], ["volume", "volume"], ...vars];
  }
  const sprite = project?.sprites.find((s) => s.name === object);
  const vars = sprite?.variables.map((v): Option => [v.name, v.name]) || [];
  return [["x", "x position"], ["y", "y position"], ["direction", "direction"], ["outfit number", "costume #"], ["outfit name", "costume name"], ["size", "size"], ["volume", "volume"], ...vars];
}

/* ---------- categories: name, rail colour, icon ---------- */

export interface Category {
  name: string;
  colour: string;
  /** White glyph on the category colour, 24 × 24 units. */
  glyph: string;
}

const g = { stroke: "currentColor", width: 2.4 };
const line = (d: string) => `<path d="${d}" fill="none" stroke="${g.stroke}" stroke-width="${g.width}" stroke-linecap="round" stroke-linejoin="round"/>`;

export const CATEGORIES: Record<string, Category> = {
  events: { name: "Start", colour: "#d6416a", glyph: `<path d="M8.5 6.2v11.6L18 12z" fill="currentColor"/>` },
  motion: { name: "Move", colour: "#11899a", glyph: line("M5 12h12M13 7.5l4.5 4.5-4.5 4.5") },
  looks: { name: "Look", colour: "#b8418f", glyph: line("M3.5 12s3-5.5 8.5-5.5 8.5 5.5 8.5 5.5-3 5.5-8.5 5.5S3.5 12 3.5 12z") + `<circle cx="12" cy="12" r="2.4" fill="currentColor"/>` },
  sound: { name: "Sound", colour: "#c8691a", glyph: line("M9 17.5V6.5l9-2v11") + `<circle cx="7" cy="17.5" r="2.4" fill="currentColor"/><circle cx="16" cy="15.5" r="2.4" fill="currentColor"/>` },
  control: { name: "Flow", colour: "#3a56c9", glyph: line("M6 9.5h9.5a3.5 3.5 0 0 1 0 7H7M9.5 6.5l-3 3 3 3") },
  sensing: { name: "Sense", colour: "#37884a", glyph: line("M12 13.5v5M8.6 10.1a4.8 4.8 0 0 1 6.8 0M5.8 7.3a8.8 8.8 0 0 1 12.4 0") + `<circle cx="12" cy="13" r="1.8" fill="currentColor"/>` },
  operators: { name: "Maths & words", colour: "#566788", glyph: line("M5 8.5h6M8 5.5v6M13.5 15.5h6M5.5 14l5 5M10.5 14l-5 5") },
  variables: { name: "Memory", colour: "#9a7208", glyph: line("M4.5 8.5L12 4.5l7.5 4v7.5L12 20l-7.5-4zM4.5 8.5L12 12.5l7.5-4M12 12.5V20") },
  lists: { name: "Lists", colour: "#8a6406", glyph: line("M9 7h10M9 12h10M9 17h10") + `<circle cx="5" cy="7" r="1.5" fill="currentColor"/><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="5" cy="17" r="1.5" fill="currentColor"/>` },
  myblocks: { name: "My tricks", colour: "#7449c4", glyph: line("M5 19l9.5-9.5M14 5.5v-2M18.5 10h2M17.5 6.5l1.5-1.5") + `<path d="M15.5 8.5l1.5 1.5" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>` },
  pen: { name: "Draw", colour: "#9a5a22", glyph: line("M5 19l1.4-4.6L15.8 5a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L9.6 17.6z") },
};

const svgUri = (inner: string, w = 24, h = 24) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`)}`;

/** A category's glyph in a round chip: coloured with a white glyph, or white with a coloured glyph (on solid start cards). */
export function chip(category: string, solid = false): string {
  const c = CATEGORIES[category];
  const fill = solid ? "#ffffff" : c.colour;
  const ink = solid ? c.colour : "#ffffff";
  return svgUri(`<circle cx="14" cy="14" r="13" fill="${fill}"/><g transform="translate(4.4 4.4) scale(0.8)" color="${ink}">${c.glyph}</g>`, 28, 28);
}

/** The category glyph alone, for the palette list (drawn in CSS currentColor). */
export const glyphSvg = (category: string) => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" color="currentColor">${CATEGORIES[category].glyph}</svg>`;

/* ---------- block JSON ---------- */

type Json = Record<string, unknown>;
const STACK = { previousStatement: null, nextStatement: null };
const REPORTER = { output: null, outputShape: 2 };
const BOOLEAN = { output: "Boolean", outputShape: 3 };
const HAT = { nextStatement: null };

const value = (name: string): Json => ({ type: "input_value", name });
const bool = (name: string): Json => ({ type: "input_value", name, check: "Boolean" });
const statement = (name: string): Json => ({ type: "input_statement", name });
const dropdown = (name: string, options: (string | Option)[] | (() => Option[])): Json => ({ type: "field_dropdown", name, options: typeof options === "function" ? options : opt(options) });
const image = (src: string, size = 24, alt = ""): Json => ({ type: "field_image", src, width: size, height: size, alt });

const icon = (inner: string, colour = "currentColor") => svgUri(`<g color="${colour}">${inner}</g>`);
const SPIN_RIGHT = icon(line("M18 9a7 7 0 1 0 1 6M19 3.5V9h-5.5"), "#11899a");
const SPIN_LEFT = icon(line("M6 9a7 7 0 1 1-1 6M5 3.5V9h5.5"), "#11899a");
const AGAIN = icon(line("M6 9.5h9.5a3.5 3.5 0 0 1 0 7H7M9.5 6.5l-3 3 3 3"), "#ffffff");

const EFFECTS: Option[] = [["colour", "COLOR"], ["bulge", "FISHEYE"], ["swirl", "WHIRL"], ["blocky", "PIXELATE"], ["tiles", "MOSAIC"], ["brightness", "BRIGHTNESS"], ["see-through", "GHOST"]];
const SOUND_EFFECTS: Option[] = [["pitch", "PITCH"], ["left/right", "PAN"]];
const memoryBox = { type: "field_variable", name: "VARIABLE", variableTypes: [""], defaultType: "" };
const listBox = { type: "field_variable", name: "LIST", variableTypes: ["list"], defaultType: "list" };

/** [opcode, category, message, args, shape-extras] */
type Def = [string, string, string, Json[], Json?];

const DEFS: Def[] = [
  // Move
  ["motion_movesteps", "motion", "walk %1 steps", [value("STEPS")], STACK],
  ["motion_turnright", "motion", "spin %1 %2 degrees", [image(SPIN_RIGHT, 20, "clockwise"), value("DEGREES")], STACK],
  ["motion_turnleft", "motion", "spin %1 %2 degrees", [image(SPIN_LEFT, 20, "anticlockwise"), value("DEGREES")], STACK],
  ["motion_goto", "motion", "jump to %1", [value("TO")], STACK],
  ["motion_gotoxy", "motion", "jump to x %1 y %2", [value("X"), value("Y")], STACK],
  ["motion_glideto", "motion", "slide to %2 in %1 seconds", [value("SECS"), value("TO")], STACK],
  ["motion_glidesecstoxy", "motion", "slide to x %2 y %3 in %1 seconds", [value("SECS"), value("X"), value("Y")], STACK],
  ["motion_pointindirection", "motion", "face %1 degrees", [value("DIRECTION")], STACK],
  ["motion_pointtowards", "motion", "face %1", [value("TOWARDS")], STACK],
  ["motion_changexby", "motion", "add %1 to my x", [value("DX")], STACK],
  ["motion_setx", "motion", "set my x to %1", [value("X")], STACK],
  ["motion_changeyby", "motion", "add %1 to my y", [value("DY")], STACK],
  ["motion_sety", "motion", "set my y to %1", [value("Y")], STACK],
  ["motion_ifonedgebounce", "motion", "bounce off the edges", [], STACK],
  ["motion_setrotationstyle", "motion", "when I turn, %1", [dropdown("STYLE", [["flip left and right", "left-right"], ["stay upright", "don't rotate"], ["spin all the way", "all around"]])], STACK],
  ["motion_xposition", "motion", "my x", [], REPORTER],
  ["motion_yposition", "motion", "my y", [], REPORTER],
  ["motion_direction", "motion", "my direction", [], REPORTER],
  // Look
  ["looks_sayforsecs", "looks", "say %1 for %2 seconds", [value("MESSAGE"), value("SECS")], STACK],
  ["looks_say", "looks", "say %1", [value("MESSAGE")], STACK],
  ["looks_thinkforsecs", "looks", "think %1 for %2 seconds", [value("MESSAGE"), value("SECS")], STACK],
  ["looks_think", "looks", "think %1", [value("MESSAGE")], STACK],
  ["looks_switchcostumeto", "looks", "wear %1", [value("COSTUME")], STACK],
  ["looks_nextcostume", "looks", "wear the next outfit", [], STACK],
  ["looks_switchbackdropto", "looks", "show background %1", [value("BACKDROP")], STACK],
  ["looks_switchbackdroptoandwait", "looks", "show background %1 and wait", [value("BACKDROP")], STACK],
  ["looks_nextbackdrop", "looks", "show the next background", [], STACK],
  ["looks_changesizeby", "looks", "grow by %1", [value("CHANGE")], STACK],
  ["looks_setsizeto", "looks", "set my size to %1 %%", [value("SIZE")], STACK],
  ["looks_changeeffectby", "looks", "add %2 to the %1 effect", [dropdown("EFFECT", EFFECTS), value("CHANGE")], STACK],
  ["looks_seteffectto", "looks", "set the %1 effect to %2", [dropdown("EFFECT", EFFECTS), value("VALUE")], STACK],
  ["looks_cleargraphiceffects", "looks", "remove all effects", [], STACK],
  ["looks_show", "looks", "appear", [], STACK],
  ["looks_hide", "looks", "disappear", [], STACK],
  ["looks_gotofrontback", "looks", "move to the %1", [dropdown("FRONT_BACK", [["front", "front"], ["back", "back"]])], STACK],
  ["looks_goforwardbackwardlayers", "looks", "move %2 layers %1", [dropdown("FORWARD_BACKWARD", [["forward", "forward"], ["back", "backward"]]), value("NUM")], STACK],
  ["looks_costumenumbername", "looks", "my outfit %1", [dropdown("NUMBER_NAME", ["number", "name"])], REPORTER],
  ["looks_backdropnumbername", "looks", "background %1", [dropdown("NUMBER_NAME", ["number", "name"])], REPORTER],
  ["looks_size", "looks", "my size", [], REPORTER],
  // Sound
  ["sound_playuntildone", "sound", "play %1 to the end", [value("SOUND_MENU")], STACK],
  ["sound_play", "sound", "play %1", [value("SOUND_MENU")], STACK],
  ["sound_stopallsounds", "sound", "silence every sound", [], STACK],
  ["sound_changeeffectby", "sound", "add %2 to the %1 effect", [dropdown("EFFECT", SOUND_EFFECTS), value("VALUE")], STACK],
  ["sound_seteffectto", "sound", "set the %1 effect to %2", [dropdown("EFFECT", SOUND_EFFECTS), value("VALUE")], STACK],
  ["sound_cleareffects", "sound", "remove sound effects", [], STACK],
  ["sound_changevolumeby", "sound", "add %1 to my volume", [value("VOLUME")], STACK],
  ["sound_setvolumeto", "sound", "set my volume to %1 %%", [value("VOLUME")], STACK],
  ["sound_volume", "sound", "my volume", [], REPORTER],
  // Start
  ["event_whenflagclicked", "events", "when Play is pressed", [], HAT],
  ["event_whenkeypressed", "events", "when the %1 key is pressed", [dropdown("KEY_OPTION", MENUS.keys)], HAT],
  ["event_whenthisspriteclicked", "events", "when I'm tapped", [], HAT],
  ["event_whenstageclicked", "events", "when the scene is tapped", [], HAT],
  ["event_whenbackdropswitchesto", "events", "when the background becomes %1", [dropdown("BACKDROP", MENUS.backdropName)], HAT],
  ["event_whengreaterthan", "events", "when the %1 goes above %2", [dropdown("WHENGREATERTHANMENU", [["loudness", "LOUDNESS"], ["stopwatch", "TIMER"]]), value("VALUE")], HAT],
  ["event_whenbroadcastreceived", "events", "when I get the signal %1", [{ type: "field_dropdown", name: "BROADCAST_OPTION", options: MENUS.broadcast }], HAT],
  ["event_broadcast", "events", "send the signal %1", [value("BROADCAST_INPUT")], STACK],
  ["event_broadcastandwait", "events", "send the signal %1 and wait", [value("BROADCAST_INPUT")], STACK],
  // Flow
  ["control_wait", "control", "pause %1 seconds", [value("DURATION")], STACK],
  ["control_wait_until", "control", "pause until %1", [bool("CONDITION")], STACK],
  ["control_start_as_clone", "control", "when I'm a new copy", [], HAT],
  ["control_create_clone_of", "control", "make a copy of %1", [value("CLONE_OPTION")], STACK],
  ["control_delete_this_clone", "control", "remove this copy", [], { previousStatement: null }],
  // Sense
  ["sensing_touchingobject", "sensing", "touching %1?", [value("TOUCHINGOBJECTMENU")], BOOLEAN],
  ["sensing_touchingcolor", "sensing", "touching the colour %1?", [value("COLOR")], BOOLEAN],
  ["sensing_coloristouchingcolor", "sensing", "my colour %1 touching %2?", [value("COLOR"), value("COLOR2")], BOOLEAN],
  ["sensing_distanceto", "sensing", "distance to %1", [value("DISTANCETOMENU")], REPORTER],
  ["sensing_askandwait", "sensing", "ask %1 and wait for the answer", [value("QUESTION")], STACK],
  ["sensing_answer", "sensing", "the answer", [], REPORTER],
  ["sensing_keypressed", "sensing", "%1 key held down?", [value("KEY_OPTION")], BOOLEAN],
  ["sensing_mousedown", "sensing", "screen pressed?", [], BOOLEAN],
  ["sensing_mousex", "sensing", "pointer x", [], REPORTER],
  ["sensing_mousey", "sensing", "pointer y", [], REPORTER],
  ["sensing_setdragmode", "sensing", "players %1 drag me", [dropdown("DRAG_MODE", [["can", "draggable"], ["can't", "not draggable"]])], STACK],
  ["sensing_loudness", "sensing", "loudness", [], REPORTER],
  ["sensing_timer", "sensing", "stopwatch", [], REPORTER],
  ["sensing_resettimer", "sensing", "restart the stopwatch", [], STACK],
  ["sensing_of", "sensing", "%1 of %2", [{ type: "field_dropdown", name: "PROPERTY", options: ofProperties }, value("OBJECT")], REPORTER],
  ["sensing_current", "sensing", "the %1 now", [dropdown("CURRENTMENU", [["year", "YEAR"], ["month", "MONTH"], ["date", "DATE"], ["day of the week", "DAYOFWEEK"], ["hour", "HOUR"], ["minute", "MINUTE"], ["second", "SECOND"]])], REPORTER],
  ["sensing_dayssince2000", "sensing", "days since 2000", [], REPORTER],
  ["sensing_username", "sensing", "player's name", [], REPORTER],
  // Maths & words
  ["operator_add", "operators", "%1 + %2", [value("NUM1"), value("NUM2")], REPORTER],
  ["operator_subtract", "operators", "%1 − %2", [value("NUM1"), value("NUM2")], REPORTER],
  ["operator_multiply", "operators", "%1 × %2", [value("NUM1"), value("NUM2")], REPORTER],
  ["operator_divide", "operators", "%1 ÷ %2", [value("NUM1"), value("NUM2")], REPORTER],
  ["operator_random", "operators", "a random number from %1 to %2", [value("FROM"), value("TO")], REPORTER],
  ["operator_gt", "operators", "%1 > %2", [value("OPERAND1"), value("OPERAND2")], BOOLEAN],
  ["operator_lt", "operators", "%1 < %2", [value("OPERAND1"), value("OPERAND2")], BOOLEAN],
  ["operator_equals", "operators", "%1 = %2", [value("OPERAND1"), value("OPERAND2")], BOOLEAN],
  ["operator_and", "operators", "%1 and %2", [bool("OPERAND1"), bool("OPERAND2")], BOOLEAN],
  ["operator_or", "operators", "%1 or %2", [bool("OPERAND1"), bool("OPERAND2")], BOOLEAN],
  ["operator_not", "operators", "not %1", [bool("OPERAND")], BOOLEAN],
  ["operator_join", "operators", "%1 joined to %2", [value("STRING1"), value("STRING2")], REPORTER],
  ["operator_letter_of", "operators", "letter %1 of %2", [value("LETTER"), value("STRING")], REPORTER],
  ["operator_length", "operators", "how many letters in %1", [value("STRING")], REPORTER],
  ["operator_contains", "operators", "%1 has %2 in it?", [value("STRING1"), value("STRING2")], BOOLEAN],
  ["operator_mod", "operators", "remainder of %1 ÷ %2", [value("NUM1"), value("NUM2")], REPORTER],
  ["operator_round", "operators", "round %1", [value("NUM")], REPORTER],
  ["operator_mathop", "operators", "%1 of %2", [dropdown("OPERATOR", ["abs", "floor", "ceiling", "sqrt", "sin", "cos", "tan", "asin", "acos", "atan", "ln", "log", "e ^", "10 ^"]), value("NUM")], REPORTER],
  // Memory
  ["data_variable", "variables", "%1", [memoryBox], REPORTER],
  ["data_setvariableto", "variables", "put %2 in %1", [memoryBox, value("VALUE")], STACK],
  ["data_changevariableby", "variables", "add %2 to %1", [memoryBox, value("VALUE")], STACK],
  ["data_showvariable", "variables", "show %1 on the scene", [memoryBox], STACK],
  ["data_hidevariable", "variables", "hide %1 from the scene", [memoryBox], STACK],
  ["data_listcontents", "lists", "%1", [listBox], REPORTER],
  ["data_addtolist", "lists", "add %1 to the end of %2", [value("ITEM"), listBox], STACK],
  ["data_deleteoflist", "lists", "take item %1 out of %2", [value("INDEX"), listBox], STACK],
  ["data_deletealloflist", "lists", "empty %1", [listBox], STACK],
  ["data_insertatlist", "lists", "put %1 at place %2 in %3", [value("ITEM"), value("INDEX"), listBox], STACK],
  ["data_replaceitemoflist", "lists", "swap item %1 of %2 for %3", [value("INDEX"), listBox, value("ITEM")], STACK],
  ["data_itemoflist", "lists", "item %1 of %2", [value("INDEX"), listBox], REPORTER],
  ["data_itemnumoflist", "lists", "where %1 is in %2", [value("ITEM"), listBox], REPORTER],
  ["data_lengthoflist", "lists", "how many in %1", [listBox], REPORTER],
  ["data_listcontainsitem", "lists", "%1 has %2?", [listBox, value("ITEM")], BOOLEAN],
  ["data_showlist", "lists", "show %1 on the scene", [listBox], STACK],
  ["data_hidelist", "lists", "hide %1 from the scene", [listBox], STACK],
  // Draw
  ["pen_clear", "pen", "wipe the drawing", [], STACK],
  ["pen_stamp", "pen", "stamp a copy of me", [], STACK],
  ["pen_penDown", "pen", "start drawing", [], STACK],
  ["pen_penUp", "pen", "stop drawing", [], STACK],
  ["pen_setPenColorToColor", "pen", "draw in %1", [value("COLOR")], STACK],
  ["pen_changePenColorParamBy", "pen", "add %2 to the pen's %1", [value("COLOR_PARAM"), value("VALUE")], STACK],
  ["pen_setPenColorParamTo", "pen", "set the pen's %1 to %2", [value("COLOR_PARAM"), value("VALUE")], STACK],
  ["pen_changePenSizeBy", "pen", "make the pen %1 thicker", [value("SIZE")], STACK],
  ["pen_setPenSizeTo", "pen", "set the pen's thickness to %1", [value("SIZE")], STACK],
];

/** Words to find a block by: its own wording, its category, and the words Scratch and other tools use for it. */
const ALSO: Record<string, string> = {
  motion_movesteps: "move steps go forward",
  motion_turnright: "turn rotate right clockwise",
  motion_turnleft: "turn rotate left anticlockwise",
  motion_goto: "go to random position mouse pointer teleport",
  motion_gotoxy: "go to xy position coordinates teleport",
  motion_glideto: "glide move smoothly",
  motion_glidesecstoxy: "glide move smoothly xy",
  motion_pointindirection: "point in direction angle",
  motion_pointtowards: "point towards look at",
  motion_changexby: "change x by sideways",
  motion_setx: "set x",
  motion_changeyby: "change y by up down",
  motion_sety: "set y",
  motion_ifonedgebounce: "if on edge bounce wall",
  motion_setrotationstyle: "rotation style flip",
  motion_xposition: "x position",
  motion_yposition: "y position",
  looks_sayforsecs: "say talk speech bubble",
  looks_say: "say talk speech bubble",
  looks_thinkforsecs: "think thought bubble",
  looks_think: "think thought bubble",
  looks_switchcostumeto: "switch costume change look",
  looks_nextcostume: "next costume animate animation",
  looks_switchbackdropto: "switch backdrop scene background",
  looks_switchbackdroptoandwait: "switch backdrop and wait",
  looks_nextbackdrop: "next backdrop",
  looks_changesizeby: "change size bigger grow",
  looks_setsizeto: "set size scale",
  looks_changeeffectby: "graphic effect colour ghost",
  looks_seteffectto: "graphic effect colour ghost transparent",
  looks_cleargraphiceffects: "clear graphic effects",
  looks_show: "show visible",
  looks_hide: "hide invisible",
  looks_gotofrontback: "layer front back",
  looks_goforwardbackwardlayers: "layers forward backward",
  sound_playuntildone: "play sound until done music",
  sound_play: "start sound play music noise",
  sound_stopallsounds: "stop all sounds mute",
  event_whenflagclicked: "green flag clicked start begin when play",
  event_whenkeypressed: "when key pressed keyboard",
  event_whenthisspriteclicked: "when this sprite clicked click touch",
  event_whenstageclicked: "when stage clicked click",
  event_whenbroadcastreceived: "when i receive broadcast message",
  event_broadcast: "broadcast message send",
  event_broadcastandwait: "broadcast and wait message",
  control_wait: "wait delay seconds sleep",
  control_repeat: "repeat loop times",
  control_forever: "forever loop always",
  control_if: "if then condition",
  control_if_else: "if then else otherwise condition",
  control_repeat_until: "repeat until loop while",
  control_wait_until: "wait until",
  control_stop: "stop end quit",
  control_start_as_clone: "when i start as a clone",
  control_create_clone_of: "create clone of copy",
  control_delete_this_clone: "delete this clone",
  sensing_touchingobject: "touching collide hit bump",
  sensing_touchingcolor: "touching color colour",
  sensing_askandwait: "ask and wait question input type",
  sensing_answer: "answer input",
  sensing_keypressed: "key pressed keyboard",
  sensing_mousedown: "mouse down click",
  sensing_mousex: "mouse x",
  sensing_mousey: "mouse y",
  sensing_timer: "timer clock time",
  sensing_resettimer: "reset timer",
  sensing_distanceto: "distance to how far",
  sensing_current: "current date time year",
  sensing_username: "username",
  operator_random: "pick random number dice",
  operator_join: "join combine text string words",
  operator_letter_of: "letter of character",
  operator_length: "length of text",
  operator_contains: "contains includes",
  operator_mod: "mod modulo remainder",
  operator_and: "and both",
  operator_or: "or either",
  operator_not: "not opposite",
  operator_equals: "equals same",
  operator_gt: "greater than more bigger",
  operator_lt: "less than smaller fewer",
  data_setvariableto: "set variable to",
  data_changevariableby: "change variable by increase score",
  data_showvariable: "show variable",
  data_hidevariable: "hide variable",
  data_addtolist: "add to list",
  data_deleteoflist: "delete of list remove",
  data_itemoflist: "item of list",
  data_lengthoflist: "length of list count",
  procedures_call: "my blocks custom block function",
  procedures_return: "report return",
  pen_penDown: "pen down draw",
  pen_penUp: "pen up",
  pen_clear: "erase all clear",
  pen_stamp: "stamp",
};

const WORDS = new Map<string, string>();
export const blockWords = (type: string) => WORDS.get(type) || `${type} ${ALSO[type] || ""}`;

/** Literal and menu value blocks. */
const SHADOWS: Json[] = [
  { type: "math_number", message0: "%1", args0: [{ type: "field_number", name: "NUM", value: 0 }], output: "Number", outputShape: 2, style: "shadow_blocks" },
  { type: "math_positive_number", message0: "%1", args0: [{ type: "field_number", name: "NUM", value: 0, min: 0 }], output: "Number", outputShape: 2, style: "shadow_blocks" },
  { type: "math_whole_number", message0: "%1", args0: [{ type: "field_number", name: "NUM", value: 0, min: 0, precision: 1 }], output: "Number", outputShape: 2, style: "shadow_blocks" },
  { type: "math_integer", message0: "%1", args0: [{ type: "field_number", name: "NUM", value: 0, precision: 1 }], output: "Number", outputShape: 2, style: "shadow_blocks" },
  { type: "math_angle", message0: "%1", args0: [{ type: "field_number", name: "NUM", value: 90 }], output: "Number", outputShape: 2, style: "shadow_blocks" },
  { type: "text", message0: "%1", args0: [{ type: "field_input", name: "TEXT", text: "" }], output: "String", outputShape: 2, style: "shadow_blocks" },
  { type: "colour_picker", message0: "%1", args0: [{ type: "field_colour", name: "COLOUR", colour: "#4c97ff" }], output: null, outputShape: 2, style: "shadow_blocks" },
];

const MENU_SHADOWS: [string, string, string, () => Option[]][] = [
  ["motion_goto_menu", "motion", "TO", MENUS.goto],
  ["motion_glideto_menu", "motion", "TO", MENUS.goto],
  ["motion_pointtowards_menu", "motion", "TOWARDS", MENUS.towards],
  ["looks_costume", "looks", "COSTUME", MENUS.costume],
  ["looks_backdrops", "looks", "BACKDROP", MENUS.backdrop],
  ["sound_sounds_menu", "sound", "SOUND_MENU", MENUS.sound],
  ["event_broadcast_menu", "events", "BROADCAST_OPTION", MENUS.broadcast],
  ["control_create_clone_of_menu", "control", "CLONE_OPTION", MENUS.clone],
  ["sensing_touchingobjectmenu", "sensing", "TOUCHINGOBJECTMENU", MENUS.touching],
  ["sensing_distancetomenu", "sensing", "DISTANCETOMENU", MENUS.distance],
  ["sensing_keyoptions", "sensing", "KEY_OPTION", MENUS.keys],
  ["sensing_of_object_menu", "sensing", "OBJECT", MENUS.object],
  ["pen_menu_colorParam", "pen", "COLOR_PARAM", () => [["colour", "color"], ["richness", "saturation"], ["brightness", "brightness"], ["see-through", "transparency"]]],
];

/** Keep a dropdown's saved value even when the menu no longer lists it (e.g. a renamed outfit). */
class LenientDropdown extends Blockly.FieldDropdown {
  protected doClassValidation_(v?: string): string | null {
    return v === undefined || v === null ? null : String(v);
  }
}

/** Every block type Game Lab has (for importing Scratch projects: anything else is left out). */
export const knownOpcodes = (): Set<string> =>
  new Set([
    ...DEFS.map((d) => d[0]),
    ...SHADOWS.map((d) => String(d.type)),
    ...MENU_SHADOWS.map((d) => d[0]),
    ...["control_repeat", "control_forever", "control_if", "control_if_else", "control_repeat_until", "control_stop"],
    ...["procedures_definition", "procedures_call", "procedures_return", "argument_reporter_string_number", "argument_reporter_boolean"],
  ]);

/** Put the category chip in front of a step or start block: "walk %1 steps" → "%1 walk %2 steps". */
function withChip(category: string, solid: boolean, message: string, args: Json[]): [string, Json[]] {
  return [`%1 ${message.replace(/%(\d+)/g, (_, n) => `%${Number(n) + 1}`)}`, [image(chip(category, solid), 28, CATEGORIES[category].name), ...args]];
}

let registered = false;

export function registerBlocks() {
  if (registered) return;
  registered = true;
  registerFieldColour();
  Blockly.fieldRegistry.unregister("field_dropdown");
  Blockly.fieldRegistry.register("field_dropdown", LenientDropdown);

  for (const [type, category, message] of DEFS) WORDS.set(type, `${message.replace(/%\d+|%%/g, " ")} ${CATEGORIES[category].name} ${ALSO[type] || ""}`.toLowerCase());
  for (const [type, words] of [
    ["control_repeat", "do this times"],
    ["control_forever", "keep doing this"],
    ["control_if", "if"],
    ["control_if_else", "if otherwise"],
    ["control_repeat_until", "keep doing this until"],
    ["control_stop", "stop everything"],
    ["procedures_call", "my tricks"],
    ["procedures_return", "give back my tricks"],
  ])
    WORDS.set(type, `${words} flow ${ALSO[type] || ""}`.toLowerCase());
  const defs: Json[] = DEFS.map(([type, category, message, args, extra]) => {
    const step = !!extra && ("previousStatement" in extra || "nextStatement" in extra);
    const [m, a] = step ? withChip(category, !("previousStatement" in extra!), message, args) : [message, args];
    return { type, message0: m, args0: a, style: `${category}_blocks`, inputsInline: true, ...(extra || {}) };
  });
  // Loops and ifs: their arm is the branch of the rail.
  const flow = (type: string, head: string, args: Json[], rest: Json, shape: Json) => {
    const [m, a] = withChip("control", false, head, args);
    return { type, message0: m, args0: a, ...rest, style: "control_blocks", ...shape };
  };
  const again = { message2: "%1", args2: [image(AGAIN, 18, "again")], lastDummyAlign2: "RIGHT" };
  defs.push(
    flow("control_repeat", "do this %1 times", [value("TIMES")], { message1: "%1", args1: [statement("SUBSTACK")], ...again }, STACK),
    flow("control_forever", "keep doing this", [], { message1: "%1", args1: [statement("SUBSTACK")], ...again }, { previousStatement: null }),
    flow("control_if", "if %1", [bool("CONDITION")], { message1: "%1", args1: [statement("SUBSTACK")] }, STACK),
    flow("control_if_else", "if %1", [bool("CONDITION")], { message1: "%1", args1: [statement("SUBSTACK")], message2: "%1 otherwise", args2: [image(svgUri(""), 28, "")], message3: "%1", args3: [statement("SUBSTACK2")] }, STACK),
    flow("control_repeat_until", "keep doing this until %1", [bool("CONDITION")], { message1: "%1", args1: [statement("SUBSTACK")], ...again }, STACK),
    {
      ...flow(
        "control_stop",
        "stop %1",
        [{ type: "field_dropdown", name: "STOP_OPTION", options: () => (ctx.current?.target().isStage ? [["everything", "all"], ["this script", "this script"], ["the scene's other scripts", "other scripts in stage"]] : [["everything", "all"], ["this script", "this script"], ["my other scripts", "other scripts in sprite"]]) }],
        {},
        { previousStatement: null },
      ),
      mutator: "stop_shape",
      inputsInline: true,
    },
  );
  defs.push(...SHADOWS);
  for (const [type, category, field, options] of MENU_SHADOWS)
    defs.push({ type, message0: "%1", args0: [{ type: "field_dropdown", name: field, options }], output: null, outputShape: 2, style: `${category}_menu` });

  // "stop my other scripts" can have blocks under it; "stop everything / this script" can't.
  Blockly.Extensions.registerMutator(
    "stop_shape",
    {
      saveExtraState(this: Blockly.Block) {
        return { hasNext: !!this.nextConnection };
      },
      loadExtraState(this: Blockly.Block, s: { hasNext?: boolean }) {
        this.setNextStatement(!!s?.hasNext);
      },
    },
    function (this: Blockly.Block) {
      const field = this.getField("STOP_OPTION") as Blockly.FieldDropdown;
      field.setValidator((v) => {
        const stack = String(v).startsWith("other scripts");
        if (stack !== !!this.nextConnection) {
          if (!stack && this.nextConnection?.isConnected()) this.nextConnection.disconnect();
          this.setNextStatement(stack);
        }
        return v;
      });
    },
  );

  Blockly.common.defineBlocksWithJsonArray(defs);

  // A new signal from any signal menu.
  for (const [type, field] of [["event_broadcast_menu", "BROADCAST_OPTION"], ["event_whenbroadcastreceived", "BROADCAST_OPTION"]] as const) {
    const original = Blockly.Blocks[type].init;
    Blockly.Blocks[type].init = function (this: Blockly.Block) {
      original.call(this);
      const f = this.getField(field) as Blockly.FieldDropdown;
      f.setValidator((v) => {
        if (v !== "__new__") return v;
        ctx.current?.newMessage().then((name) => name && f.setValue(name));
        return null;
      });
    };
  }

  // "(x) of (character)": refresh the property list when the character changes.
  const ofInit = Blockly.Blocks.sensing_of.init;
  Blockly.Blocks.sensing_of.init = function (this: Blockly.Block) {
    ofInit.call(this);
    this.setOnChange((e) => {
      if (e.type !== Blockly.Events.BLOCK_CHANGE && e.type !== Blockly.Events.BLOCK_MOVE) return;
      const field = this.getField("PROPERTY") as Blockly.FieldDropdown;
      const options = ofProperties.call(field).map((o) => o[1]);
      if (!options.includes(field.getValue() || "")) field.setValue(options[0]);
    });
  };
}

/* ---------- theme ---------- */

/**
 * Block colours: colourPrimary is the rail (category colour), colourSecondary the
 * light card and value pill, colourTertiary the card's edge. Dark mode uses deep cards.
 */
export function blockTheme(opts: { highContrast: boolean; dark: boolean; font: string }): Blockly.Theme {
  const card = opts.dark ? "#262236" : "#ffffff";
  const blockStyles: Record<string, Partial<Blockly.Theme.BlockStyle>> = {};
  for (const [name, { colour }] of Object.entries(CATEGORIES)) {
    const tint = opts.highContrast ? card : mix(colour, card, opts.dark ? 0.78 : 0.86);
    blockStyles[`${name}_blocks`] = { colourPrimary: colour, colourSecondary: tint, colourTertiary: opts.dark ? mix(colour, "#ffffff", 0.15) : mix(colour, "#000000", 0.18) };
    blockStyles[`${name}_menu`] = { colourPrimary: colour, colourSecondary: opts.dark ? mix(colour, card, 0.6) : mix(colour, "#ffffff", 0.72), colourTertiary: colour };
  }
  blockStyles.shadow_blocks = { colourPrimary: "#ffffff", colourSecondary: "#ffffff", colourTertiary: "#c8c8c8" };
  const categoryStyles: Record<string, { colour: string }> = {};
  for (const [name, { colour }] of Object.entries(CATEGORIES)) categoryStyles[`${name}_category`] = { colour };
  return Blockly.Theme.defineTheme(`rail-${opts.highContrast ? "hc" : "std"}-${opts.dark ? "d" : "l"}-${opts.font.length}`, {
    name: `rail-${opts.highContrast ? "hc" : "std"}-${opts.dark ? "d" : "l"}-${opts.font.length}`,
    base: Blockly.Themes.Classic,
    blockStyles: blockStyles as Record<string, Blockly.Theme.BlockStyle>,
    categoryStyles,
    componentStyles: opts.dark
      ? { workspaceBackgroundColour: "#1c1810", toolboxBackgroundColour: "#221d14", toolboxForegroundColour: "#fbf3dd", flyoutBackgroundColour: "#221d14", flyoutForegroundColour: "#dccfad", flyoutOpacity: 1, scrollbarColour: "#524530", insertionMarkerColour: "#ffffff", insertionMarkerOpacity: 0.3, selectedGlowColour: "#ffd35c" }
      : { workspaceBackgroundColour: "#fffbef", toolboxBackgroundColour: "#ffffff", toolboxForegroundColour: "#3d2f10", flyoutBackgroundColour: "#fff3cc", flyoutForegroundColour: "#614d22", flyoutOpacity: 1, scrollbarColour: "#ecd796", insertionMarkerColour: "#3d2f10", insertionMarkerOpacity: 0.18, selectedGlowColour: "#f5b700" },
    fontStyle: { family: opts.font, weight: "700", size: 12 },
    startHats: false,
  });
}

function mix(hex: string, toward: string, amount: number) {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(toward.slice(1), 16);
  const ch = (shift: number) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}

/* ---------- plain-text wording, for the project map ---------- */

export interface BlockTemplate {
  category: string;
  /** The block's words with %1, %2… where its inputs and fields go. */
  message: string;
  /** Input or field name for each %n (null for pictures). */
  args: (string | null)[];
  hat: boolean;
}

const FLOW_WORDS: Record<string, [string, (string | null)[]]> = {
  control_repeat: ["do this %1 times", ["TIMES"]],
  control_forever: ["keep doing this", []],
  control_if: ["if %1", ["CONDITION"]],
  control_if_else: ["if %1", ["CONDITION"]],
  control_repeat_until: ["keep doing this until %1", ["CONDITION"]],
  control_stop: ["stop %1", ["STOP_OPTION"]],
};

/** How a block reads on screen, without needing a workspace. */
export function blockTemplate(type: string): BlockTemplate | null {
  const flow = FLOW_WORDS[type];
  if (flow) return { category: "control", message: flow[0], args: flow[1], hat: false };
  const def = DEFS.find((d) => d[0] === type);
  if (!def) return null;
  const [, category, message, args, extra] = def;
  return {
    category,
    message,
    args: args.map((a) => (a && typeof a === "object" && "name" in a && (a as { type?: string }).type !== "field_image" ? String((a as { name: string }).name) : null)),
    hat: !!extra && "nextStatement" in extra && !("previousStatement" in extra) && !("output" in extra),
  };
}

/** Friendly names for the special values menus store. */
export const MENU_WORDS: Record<string, string> = {
  _random_: "anywhere",
  _mouse_: "the pointer",
  _edge_: "an edge",
  _myself_: "me",
  _stage_: "the scene",
  all: "everything",
  "this script": "this script",
  "other scripts in sprite": "my other scripts",
  "other scripts in stage": "the scene's other scripts",
};
