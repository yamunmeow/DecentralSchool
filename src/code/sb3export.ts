import { strToU8, zipSync } from "fflate";
import { costumeSvg } from "./art";
import type { ProcState, SBlock } from "./compiler";
import { topBlocks } from "./compiler";
import { soundWav } from "./sounds";
import type { CodeProject, Target } from "./types";

/**
 * Game Lab projects out as Scratch 3 (.sb3) files, so they open in Scratch and any
 * other Scratch-compatible editor. The reverse of sb3.ts: Blockly's nested JSON goes
 * back to Scratch's flat block map (opcodes are already Scratch's), drawings become SVG
 * costumes and sounds WAV or MP3 files, each named by its MD5 as Scratch expects.
 */

type Json = Record<string, unknown>;

const PRIMITIVE: Record<string, number> = { math_number: 4, math_positive_number: 5, math_whole_number: 6, math_integer: 7, math_angle: 8, colour_picker: 9, text: 10 };
const FIELD_NAMES: Record<string, Record<string, string>> = { pen_menu_colorParam: { COLOR_PARAM: "colorParam" } };

/* ---------- MD5 (Scratch names every asset by the MD5 of its bytes) ---------- */

const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
const R = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];

export function md5(data: Uint8Array): string {
  const len = data.length;
  const padded = new Uint8Array(((len + 8) >> 6) * 64 + 64);
  padded.set(data);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, (len * 8) >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(len / 0x20000000), true);
  let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  for (let off = 0; off < padded.length; off += 64) {
    let [a, b, c, d] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) (f = (b & c) | (~b & d)), (g = i);
      else if (i < 32) (f = (d & b) | (~d & c)), (g = (5 * i + 1) % 16);
      else if (i < 48) (f = b ^ c ^ d), (g = (3 * i + 5) % 16);
      else (f = c ^ (b | ~d)), (g = (7 * i) % 16);
      f = (f + a + K[i] + view.getUint32(off + g * 4, true)) >>> 0;
      a = d;
      d = c;
      c = b;
      b = (b + ((f << R[i]) | (f >>> (32 - R[i])))) >>> 0;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }
  return [a0, b0, c0, d0].map((x) => Array.from({ length: 4 }, (_, i) => ((x >>> (i * 8)) & 0xff).toString(16).padStart(2, "0")).join("")).join("");
}

/* ---------- blocks ---------- */

const procCode = (p: ProcState) => p.parts.map((x) => (x.type === "label" ? (x.text || "").replace(/%/g, "\\%") : x.type === "bool" ? "%b" : x.type === "num" ? "%n" : "%s")).join(" ");
const procArgs = (p: ProcState) => p.parts.filter((x) => x.type !== "label");

class Flattener {
  out: Record<string, Json | unknown[]> = {};
  private n = 0;
  constructor(
    private names: Map<string, string>,
    private broadcastId: (name: string) => string,
  ) {}

  private fresh(base: string) {
    return `${base}-${(this.n++).toString(36)}`;
  }

  private fields(b: SBlock): Json {
    const out: Json = {};
    for (const [name, v] of Object.entries(b.fields || {})) {
      const key = FIELD_NAMES[b.type]?.[name] || name;
      if (v && typeof v === "object" && "id" in v) {
        const id = String((v as { id: string }).id);
        out[key] = [this.names.get(id) || id, id];
      } else if (name === "BROADCAST_OPTION") out[key] = [String(v), this.broadcastId(String(v))];
      else out[key] = [v, null];
    }
    return out;
  }

  /** A shadow: Scratch stores literals as small arrays and menus as shadow blocks. */
  private shadow(s: SBlock, parent: string): unknown {
    if (s.type in PRIMITIVE) return [PRIMITIVE[s.type], String(Object.values(s.fields || {})[0] ?? "")];
    if (s.type === "event_broadcast_menu") {
      const name = String(s.fields?.BROADCAST_OPTION ?? "");
      return [11, name, this.broadcastId(name)];
    }
    const id = s.id || this.fresh(parent);
    this.out[id] = { opcode: s.type, next: null, parent, inputs: {}, fields: this.fields(s), shadow: true, topLevel: false };
    return id;
  }

  /** A reporter or stack; returns its id (or a compact array for variables). */
  private value(b: SBlock, parent: string): unknown {
    if (b.type === "data_variable" || b.type === "data_listcontents") {
      const ref = (b.fields?.VARIABLE ?? b.fields?.LIST) as { id: string };
      return [b.type === "data_variable" ? 12 : 13, this.names.get(ref.id) || ref.id, ref.id];
    }
    return this.stack(b, parent, false);
  }

  stack(first: SBlock, parent: string | null, top: boolean, xy?: [number, number]): string {
    let prev: string | null = parent;
    let firstId = "";
    for (let b: SBlock | undefined = first, i = 0; b; b = b.next?.block, i++) {
      const id = b.id || this.fresh("b");
      if (!firstId) firstId = id;
      const block: Json = { opcode: b.type, next: null, parent: prev, inputs: {}, fields: this.fields(b), shadow: false, topLevel: top && i === 0 };
      if (top && i === 0 && xy) Object.assign(block, { x: Math.round(xy[0]), y: Math.round(xy[1]) });
      this.out[id] = block;
      if (prev && i > 0) (this.out[prev] as Json).next = id;
      this.inputs(b, id, block);
      prev = id;
    }
    return firstId;
  }

  private inputs(b: SBlock, id: string, block: Json) {
    const inputs = block.inputs as Json;
    if (b.type === "procedures_definition") {
      const proc = b.extraState as unknown as ProcState;
      const protoId = `${id}-proto`;
      const protoInputs: Json = {};
      for (const a of procArgs(proc)) {
        const argId = `${protoId}-${a.id}`;
        this.out[argId] = { opcode: a.type === "bool" ? "argument_reporter_boolean" : "argument_reporter_string_number", next: null, parent: protoId, inputs: {}, fields: { VALUE: [a.name, null] }, shadow: true, topLevel: false };
        protoInputs[a.id!] = [1, argId];
      }
      this.out[protoId] = {
        opcode: "procedures_prototype",
        next: null,
        parent: id,
        inputs: protoInputs,
        fields: {},
        shadow: true,
        topLevel: false,
        mutation: { tagName: "mutation", children: [], proccode: procCode(proc), argumentids: JSON.stringify(procArgs(proc).map((a) => a.id)), argumentnames: JSON.stringify(procArgs(proc).map((a) => a.name)), argumentdefaults: JSON.stringify(procArgs(proc).map((a) => (a.type === "bool" ? "false" : ""))), warp: String(!!proc.warp) },
      };
      inputs.custom_block = [1, protoId];
      return;
    }
    if (b.type === "procedures_call") {
      const proc = (b.extraState as { proc?: ProcState } | undefined)?.proc;
      if (proc) block.mutation = { tagName: "mutation", children: [], proccode: procCode(proc), argumentids: JSON.stringify(procArgs(proc).map((a) => a.id)), warp: String(!!proc.warp) };
    }
    if (b.type === "argument_reporter_string_number" || b.type === "argument_reporter_boolean") block.fields = { VALUE: [String((b.extraState as { name?: string } | undefined)?.name ?? ""), null] };
    if (b.type === "control_stop") block.mutation = { tagName: "mutation", children: [], hasnext: String(!!(b.extraState as { hasNext?: boolean } | undefined)?.hasNext) };

    for (const [name, input] of Object.entries(b.inputs || {})) {
      const shadow = input.shadow && input.shadow.id !== input.block?.id ? this.shadow(input.shadow, id) : null;
      const real = input.block && input.block.id !== input.shadow?.id ? input.block : null;
      if (name === "SUBSTACK" || name === "SUBSTACK2") {
        if (real) inputs[name] = [2, this.stack(real, id, false)];
        continue;
      }
      if (real) inputs[name] = shadow ? [3, this.value(real, id), shadow] : [2, this.value(real, id)];
      else if (shadow) inputs[name] = [1, shadow];
      else if (input.shadow) inputs[name] = [1, this.shadow(input.shadow, id)];
    }
  }
}

/* ---------- assets ---------- */

function wavInfo(bytes: Uint8Array): { rate: number; samples: number } {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let rate = 22050;
  let bits = 16;
  let channels = 1;
  let data = bytes.length - 44;
  for (let p = 12; p + 8 <= bytes.length; ) {
    const id = String.fromCharCode(...bytes.subarray(p, p + 4));
    const size = v.getUint32(p + 4, true);
    if (id === "fmt ") {
      channels = v.getUint16(p + 10, true);
      rate = v.getUint32(p + 12, true);
      bits = v.getUint16(p + 22, true);
    } else if (id === "data") {
      data = size;
      break;
    }
    p += 8 + size + (size & 1);
  }
  return { rate, samples: Math.floor(data / Math.max(1, (bits / 8) * channels)) };
}

function fromDataUrl(url: string): { bytes: Uint8Array; format: string } {
  const [head, body] = url.split(",", 2);
  const bin = head.includes(";base64") ? atob(body) : decodeURIComponent(body);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return { bytes, format: /mpeg|mp3/.test(head) ? "mp3" : /ogg/.test(head) ? "ogg" : "wav" };
}

/* ---------- the project ---------- */

export function projectToSb3(p: CodeProject): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const all = [p.stage, ...p.sprites];
  const names = new Map(all.flatMap((t) => [...t.variables, ...t.lists].map((v) => [v.id, v.name] as [string, string])));
  const broadcasts = new Map(p.broadcasts.map((b) => [b.name, b.id]));
  const broadcastId = (name: string) => {
    if (!broadcasts.has(name)) broadcasts.set(name, `broadcast-${broadcasts.size}`);
    return broadcasts.get(name)!;
  };
  const monitors: Json[] = [];

  const target = (t: Target, layer: number): Json => {
    const flat = new Flattener(names, broadcastId);
    for (const top of topBlocks(t)) {
      if (top.type === "data_variable" || top.type === "data_listcontents") {
        const ref = (top.fields?.VARIABLE ?? top.fields?.LIST) as { id: string };
        flat.out[top.id] = [top.type === "data_variable" ? 12 : 13, names.get(ref.id) || ref.id, ref.id, top.x ?? 0, top.y ?? 0];
      } else flat.stack(top, null, true, [top.x ?? 0, top.y ?? 0]);
    }
    const costumes = t.costumes.map((c) => {
      const bytes = strToU8(costumeSvg(c));
      const assetId = md5(bytes);
      files[`${assetId}.svg`] = bytes;
      return { name: c.name, bitmapResolution: 1, dataFormat: "svg", assetId, md5ext: `${assetId}.svg`, rotationCenterX: c.cx, rotationCenterY: c.cy };
    });
    const sounds = t.sounds.map((s) => {
      const { bytes, format } = s.data ? fromDataUrl(s.data) : { bytes: soundWav(s.synth || "pop"), format: "wav" };
      const assetId = md5(bytes);
      files[`${assetId}.${format}`] = bytes;
      const info = format === "wav" ? wavInfo(bytes) : { rate: 44100, samples: 0 };
      return { name: s.name, assetId, dataFormat: format, format: "", rate: info.rate, sampleCount: info.samples, md5ext: `${assetId}.${format}` };
    });
    for (const [id, w] of Object.entries(t.watchers)) {
      const v = t.variables.find((x) => x.id === id);
      const l = t.lists.find((x) => x.id === id);
      if (!v && !l) continue;
      monitors.push({
        id,
        mode: l ? "list" : w.mode || "default",
        opcode: l ? "data_listcontents" : "data_variable",
        params: l ? { LIST: l.name } : { VARIABLE: v!.name },
        spriteName: t.isStage ? null : t.name,
        value: l ? l.value : v!.value,
        width: 0,
        height: 0,
        x: (w.x ?? -235) + 240,
        y: 180 - (w.y ?? 175),
        visible: w.visible,
        sliderMin: 0,
        sliderMax: 100,
        isDiscrete: true,
      });
    }
    const base: Json = {
      isStage: t.isStage,
      name: t.isStage ? "Stage" : t.name,
      variables: Object.fromEntries(t.variables.map((v) => [v.id, [v.name, v.value]])),
      lists: Object.fromEntries(t.lists.map((l) => [l.id, [l.name, l.value]])),
      broadcasts: {},
      blocks: flat.out,
      comments: {},
      currentCostume: t.costume,
      costumes,
      sounds,
      volume: t.volume,
      layerOrder: layer,
    };
    return t.isStage
      ? { ...base, tempo: 60, videoTransparency: 50, videoState: "on", textToSpeechLanguage: null }
      : { ...base, visible: t.visible, x: t.x, y: t.y, size: t.size, direction: t.direction, draggable: t.draggable, rotationStyle: t.rotationStyle };
  };

  const targets = all.map((t, i) => target(t, i));
  // Broadcasts are the stage's; collected last so every signal used above is listed.
  targets[0].broadcasts = Object.fromEntries([...broadcasts].map(([name, id]) => [id, name]));
  const json = { targets, monitors, extensions: all.some((t) => JSON.stringify(t.blocks).includes('"pen_')) ? ["pen"] : [], meta: { semver: "3.0.0", vm: "0.2.0", agent: "DecentralSchool Game Lab" } };
  files["project.json"] = strToU8(JSON.stringify(json));
  return zipSync(files, { level: 6 });
}
