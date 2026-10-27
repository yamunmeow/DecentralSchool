import { strFromU8, unzipSync } from "fflate";
import type { ProcPart, ProcState } from "./compiler";
import type { CodeProject, CostumeAsset, RotationStyle, SoundAsset, Target, Watcher } from "./types";

/**
 * Scratch 3 (.sb3) projects into Game Lab. Game Lab keeps Scratch's opcodes and input
 * names, so scripts carry over block for block; this file reshapes Scratch's flat block
 * list into Blockly's nested JSON, and turns costumes and sounds into data inside the
 * project. Blocks Game Lab doesn't have (extensions like Music or Video) are left out
 * and listed.
 */

type Json = Record<string, unknown>;
type SField = [unknown, string?];
type SInput = [number, unknown, unknown?];
interface SBlock {
  opcode: string;
  next: string | null;
  parent: string | null;
  inputs: Record<string, SInput>;
  fields: Record<string, SField>;
  shadow: boolean;
  topLevel: boolean;
  x?: number;
  y?: number;
  mutation?: Record<string, string>;
}
type SBlocks = Record<string, SBlock | unknown[]>;

interface STarget {
  isStage: boolean;
  name: string;
  variables: Record<string, [string, unknown, boolean?]>;
  lists: Record<string, [string, unknown[]]>;
  broadcasts: Record<string, string>;
  blocks: SBlocks;
  currentCostume: number;
  costumes: { name: string; md5ext?: string; assetId: string; dataFormat: string; rotationCenterX?: number; rotationCenterY?: number; bitmapResolution?: number }[];
  sounds: { name: string; md5ext?: string; assetId: string; dataFormat: string }[];
  volume?: number;
  layerOrder?: number;
  visible?: boolean;
  x?: number;
  y?: number;
  size?: number;
  direction?: number;
  draggable?: boolean;
  rotationStyle?: string;
}

interface SMonitor {
  id: string;
  mode: string;
  opcode: string;
  spriteName: string | null;
  visible: boolean;
  x?: number;
  y?: number;
  params?: Record<string, string>;
}

export interface Sb3Result {
  project: CodeProject;
  /** Blocks left out, by opcode, with how many. */
  skipped: Map<string, number>;
}

const PRIMITIVE: Record<number, [string, string]> = {
  4: ["math_number", "NUM"],
  5: ["math_positive_number", "NUM"],
  6: ["math_whole_number", "NUM"],
  7: ["math_integer", "NUM"],
  8: ["math_angle", "NUM"],
  9: ["colour_picker", "COLOUR"],
  10: ["text", "TEXT"],
};

/** Scratch field names that Game Lab spells differently. */
const FIELD_NAMES: Record<string, Record<string, string>> = { pen_menu_colorParam: { colorParam: "COLOR_PARAM" } };

let n = 0;
const newId = () => `sb3_${Date.now().toString(36)}_${(n++).toString(36)}`;

const toB64 = (bytes: Uint8Array) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(bin);
};

/** Width and height of a PNG or JPEG, read from its header. */
function bitmapSize(b: Uint8Array): { w: number; h: number } {
  if (b[0] === 0x89 && b[1] === 0x50) return { w: (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19], h: (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23] };
  for (let i = 2; i < b.length - 9; ) {
    if (b[i] !== 0xff) break;
    const marker = b[i + 1];
    const len = (b[i + 2] << 8) | b[i + 3];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
    i += 2 + len;
  }
  return { w: 100, h: 100 };
}

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", wav: "audio/wav", mp3: "audio/mpeg", ogg: "audio/ogg" };

function costumeOf(c: STarget["costumes"][number], files: Record<string, Uint8Array>): CostumeAsset | null {
  const data = files[c.md5ext || `${c.assetId}.${c.dataFormat}`];
  if (!data) return null;
  const res = c.bitmapResolution || 1;
  const cx = (c.rotationCenterX ?? 0) / (c.dataFormat === "svg" ? 1 : res);
  const cy = (c.rotationCenterY ?? 0) / (c.dataFormat === "svg" ? 1 : res);
  if (c.dataFormat === "svg") return { id: newId(), name: c.name, svg: strFromU8(data), cx, cy };
  const { w, h } = bitmapSize(data);
  const href = `data:${MIME[c.dataFormat] || "image/png"};base64,${toB64(data)}`;
  const sw = Math.max(1, Math.round(w / res));
  const sh = Math.max(1, Math.round(h / res));
  return { id: newId(), name: c.name, svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${sw}" height="${sh}" viewBox="0 0 ${sw} ${sh}"><image width="${sw}" height="${sh}" href="${href}" xlink:href="${href}"/></svg>`, cx, cy };
}

function soundOf(s: STarget["sounds"][number], files: Record<string, Uint8Array>): SoundAsset | null {
  const data = files[s.md5ext || `${s.assetId}.${s.dataFormat}`];
  if (!data) return null;
  return { id: newId(), name: s.name, data: `data:${MIME[s.dataFormat] || "audio/wav"};base64,${toB64(data)}` };
}

/** One target's blocks, Scratch's flat map → Blockly's nested JSON. */
class Converter {
  private procs = new Map<string, ProcState>();
  private current: ProcState | null = null;

  constructor(
    private blocks: SBlocks,
    private known: (opcode: string) => boolean,
    private skipped: Map<string, number>,
  ) {
    // Every custom block's shape, from its prototype, before any call is converted.
    for (const b of Object.values(blocks)) {
      if (Array.isArray(b) || b.opcode !== "procedures_prototype" || !b.mutation) continue;
      const m = b.mutation;
      if (this.procs.has(m.proccode)) continue;
      this.procs.set(m.proccode, this.procOf(m));
    }
  }

  private procOf(m: Record<string, string>): ProcState {
    const ids: string[] = JSON.parse(m.argumentids || "[]");
    const names: string[] = JSON.parse(m.argumentnames || "[]");
    const parts: ProcPart[] = [];
    let k = 0;
    for (const piece of m.proccode.split(/(%[snb])/)) {
      if (/^%[snb]$/.test(piece)) {
        parts.push({ type: piece === "%b" ? "bool" : piece === "%n" ? "num" : "text", id: ids[k] || newId(), name: names[k] || `input ${k + 1}` });
        k++;
      } else if (piece.trim()) parts.push({ type: "label", text: piece.trim().replace(/\\%/g, "%") });
    }
    return { id: newId(), parts, warp: m.warp === "true", reporter: false };
  }

  private skip(opcode: string) {
    this.skipped.set(opcode, (this.skipped.get(opcode) || 0) + 1);
  }

  private primitive(p: unknown[]): Json | null {
    const [kind, value, id] = p as [number, unknown, string];
    if (PRIMITIVE[kind]) return { type: PRIMITIVE[kind][0], fields: { [PRIMITIVE[kind][1]]: kind === 9 ? String(value) : value } };
    if (kind === 11) return { type: "event_broadcast_menu", fields: { BROADCAST_OPTION: String(value) } };
    if (kind === 12) return { type: "data_variable", id: newId(), fields: { VARIABLE: { id } } };
    if (kind === 13) return { type: "data_listcontents", id: newId(), fields: { LIST: { id } } };
    return null;
  }

  private value(v: unknown): Json | null {
    if (Array.isArray(v)) return this.primitive(v);
    // Statement inputs (inside loops and ifs) are whole stacks; reporters have nothing after them.
    if (typeof v === "string") return this.block(v);
    return null;
  }

  /** A block and everything under it; unknown blocks are dropped (a stack carries on after them). */
  block(id: string, follow = true): Json | null {
    const raw = this.blocks[id];
    if (!raw) return null;
    if (Array.isArray(raw)) return this.primitive(raw);
    const b = raw as SBlock;
    if (!this.known(b.opcode)) {
      this.skip(b.opcode);
      return follow && b.next ? this.block(b.next) : null;
    }
    const out: Json = { type: b.opcode, id };
    const fields: Json = {};
    for (const [name, [value, ref]] of Object.entries(b.fields || {})) {
      const key = FIELD_NAMES[b.opcode]?.[name] || name;
      if (name === "VARIABLE" || name === "LIST") fields[key] = { id: ref };
      else fields[key] = value;
    }
    const inputs: Json = {};
    for (const [name, input] of Object.entries(b.inputs || {})) {
      if (b.opcode === "procedures_definition" && name === "custom_block") continue;
      const [kind, a, s] = input;
      const one: Json = {};
      if (kind === 1) {
        const shadow = this.value(a);
        if (shadow) one[Array.isArray(a) && (a[0] === 12 || a[0] === 13) ? "block" : "shadow"] = shadow;
      } else {
        const block = this.value(a);
        if (block) one.block = block;
        const shadow = kind === 3 ? this.value(s) : null;
        if (shadow) one.shadow = shadow;
      }
      if (Object.keys(one).length) inputs[name] = one;
    }

    if (b.opcode === "control_stop") out.extraState = { hasNext: b.mutation?.hasnext === "true" };
    if (b.opcode === "procedures_definition") {
      const proto = this.blocks[(b.inputs.custom_block?.[1] as string) || ""] as SBlock | undefined;
      const proc = proto?.mutation ? this.procs.get(proto.mutation.proccode) : undefined;
      if (!proc) return null;
      out.extraState = proc;
      for (const p of proc.parts) if (p.type !== "label") inputs[p.id!] = { block: { type: p.type === "bool" ? "argument_reporter_boolean" : "argument_reporter_string_number", extraState: { argId: p.id, name: p.name } } };
      this.current = proc;
    }
    if (b.opcode === "procedures_call") {
      const proc = this.procs.get(b.mutation?.proccode || "");
      if (!proc) {
        this.skip("procedures_call");
        return follow && b.next ? this.block(b.next) : null;
      }
      out.extraState = { procId: proc.id, proc };
    }
    if (b.opcode === "argument_reporter_string_number" || b.opcode === "argument_reporter_boolean") {
      const name = String(b.fields?.VALUE?.[0] ?? "");
      const part = this.current?.parts.find((p) => p.type !== "label" && p.name === name);
      out.extraState = { argId: part?.id ?? "", name };
      delete fields.VALUE;
    }

    if (Object.keys(fields).length) out.fields = fields;
    if (Object.keys(inputs).length) out.inputs = inputs;
    if (follow && b.next) {
      const next = this.block(b.next);
      if (next) out.next = { block: next };
    }
    return out;
  }

  /** The target's scripts as a Blockly workspace. */
  workspace(): Json {
    const tops: Json[] = [];
    for (const [id, raw] of Object.entries(this.blocks)) {
      if (Array.isArray(raw)) {
        // A loose variable or list reporter: [12, name, id, x, y].
        const r = this.primitive(raw);
        if (r) tops.push({ ...r, x: Number(raw[3]) || 0, y: Number(raw[4]) || 0 });
        continue;
      }
      const b = raw as SBlock;
      if (!b.topLevel || b.shadow) continue;
      if (!this.known(b.opcode)) {
        // A script whose start block isn't available is left out whole.
        this.skip(b.opcode);
        continue;
      }
      this.current = null;
      const out = this.block(id);
      if (out) tops.push({ ...out, x: b.x ?? 0, y: b.y ?? 0 });
    }
    return { blocks: { languageVersion: 0, blocks: tops } };
  }
}

const ROTATION: Record<string, RotationStyle> = { "all around": "all around", "left-right": "left-right", "don't rotate": "don't rotate" };

export function sb3ToProject(bytes: Uint8Array, title: string, known: (opcode: string) => boolean, newProjectId: string): Sb3Result {
  const files = unzipSync(bytes);
  const main = files["project.json"];
  if (!main) throw new Error("That file isn't a Scratch 3 project.");
  const json = JSON.parse(strFromU8(main)) as { targets: STarget[]; monitors?: SMonitor[] };
  if (!Array.isArray(json.targets)) throw new Error("That file isn't a Scratch 3 project.");
  const skipped = new Map<string, number>();
  const now = Date.now();

  const targets: Target[] = json.targets.map((t) => {
    const costumes = t.costumes.map((c) => costumeOf(c, files)).filter((c): c is CostumeAsset => !!c);
    if (!costumes.length) costumes.push({ id: newId(), name: "empty", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>', cx: 1, cy: 1 });
    return {
      id: newId(),
      name: t.isStage ? "Stage" : t.name,
      isStage: t.isStage,
      costumes,
      costume: Math.max(0, Math.min(t.currentCostume || 0, costumes.length - 1)),
      sounds: t.sounds.map((s) => soundOf(s, files)).filter((s): s is SoundAsset => !!s),
      blocks: new Converter(t.blocks, known, skipped).workspace(),
      variables: Object.entries(t.variables || {}).map(([id, [name, value]]) => ({ id, name, value: value as string | number | boolean })),
      lists: Object.entries(t.lists || {}).map(([id, [name, value]]) => ({ id, name, value: (value || []) as (string | number | boolean)[] })),
      watchers: {},
      volume: t.volume ?? 100,
      x: t.x ?? 0,
      y: t.y ?? 0,
      direction: t.direction ?? 90,
      size: t.size ?? 100,
      visible: t.visible ?? true,
      rotationStyle: ROTATION[t.rotationStyle || ""] || "all around",
      draggable: !!t.draggable,
    };
  });

  // Variable and list displays on the stage.
  for (const m of json.monitors || []) {
    if (m.opcode !== "data_variable" && m.opcode !== "data_listcontents") continue;
    const owner = m.spriteName ? targets.find((t) => !t.isStage && t.name === m.spriteName) : targets.find((t) => t.isStage);
    if (!owner) continue;
    const w: Watcher = { visible: m.visible, x: (m.x ?? 5) - 240, y: 180 - (m.y ?? 5), mode: m.mode === "large" ? "large" : m.mode === "slider" ? "slider" : "normal" };
    owner.watchers[m.id] = w;
  }

  const stage = targets.find((t) => t.isStage) || targets[0];
  const order = new Map(json.targets.map((t, i) => [targets[i], t.layerOrder ?? i]));
  const sprites = targets.filter((t) => t !== stage).sort((a, b) => order.get(a)! - order.get(b)!);
  const broadcasts = Object.entries(json.targets.find((t) => t.isStage)?.broadcasts || {}).map(([id, name]) => ({ id, name }));
  return {
    project: { kind: "code", v: 1, id: newProjectId, title, stage, sprites, broadcasts, turbo: false, touchPad: true, created: now, updated: now },
    skipped,
  };
}
