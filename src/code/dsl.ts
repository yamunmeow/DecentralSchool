import { uid } from "../shared/random";

/** A tiny way to write block scripts in code (examples and tests). Same JSON Blockly saves. */

type J = Record<string, unknown>;
const id = () => uid();

export const num = (v: number, type = "math_number"): J => ({ shadow: { type, id: id(), fields: { NUM: v } } });
export const txt = (v: string): J => ({ shadow: { type: "text", id: id(), fields: { TEXT: v } } });
export const menu = (type: string, field: string, v: string): J => ({ shadow: { type, id: id(), fields: { [field]: v } } });
export const colour = (c: string): J => ({ shadow: { type: "colour_picker", id: id(), fields: { COLOUR: c } } });
/** A reporter plugged into an input (with the usual shadow under it). */
export const put = (block: J, shadow: J = txt("")): J => ({ ...shadow, block });
export const blk = (type: string, inputs: J = {}, fields: J = {}, extra: J = {}): J => ({ type, id: id(), inputs, fields, ...extra });
export const v = (varId: string) => ({ id: varId });

export function stack(...blocks: J[]): J {
  for (let i = 0; i < blocks.length - 1; i++) blocks[i].next = { block: blocks[i + 1] };
  return blocks[0];
}

export const sub = (...blocks: J[]): J => ({ block: stack(...blocks) });
export const script = (x: number, y: number, ...blocks: J[]): J => ({ ...stack(...blocks), x, y });
export const workspace = (...scripts: J[]) => ({ blocks: { languageVersion: 0, blocks: scripts } });
