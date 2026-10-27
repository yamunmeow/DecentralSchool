import { costumeSvg, svgUrl } from "../../code/art";
import { topBlocks, type ProcState, type SBlock } from "../../code/compiler";
import type { CodeProject, Target } from "../../code/types";
import { blockTemplate, CATEGORIES, MENU_WORDS } from "./blocks";

/**
 * The project as a mind map: the game, then each character, its scripts (one per start
 * block) and their steps. Loops and ifs branch to the right, so the shape of the
 * algorithm is visible at a glance, and "send the signal" steps are linked to the
 * scripts they start. Drawn as one SVG string so it can also be downloaded.
 */

export interface MapNode {
  key: string;
  kind: "root" | "target" | "script" | "step" | "loop" | "if" | "branch";
  label: string;
  /** Block category (colour and icon). */
  cat: string;
  targetId?: string;
  blockId?: string;
  thumb?: string;
  sends?: string;
  receives?: string;
  children: MapNode[];
  /** Number of steps folded away. */
  hidden?: number;
}

export interface Palette {
  paper: string;
  ink: string;
  ink2: string;
  line: string;
  root: string;
  rootInk: string;
}

const MAX_LABEL = 44;

/* ---------- words ---------- */

function names(p: CodeProject): Map<string, string> {
  return new Map([p.stage, ...p.sprites].flatMap((t) => [...t.variables, ...t.lists].map((v) => [v.id, v.name] as [string, string])));
}

function fieldText(v: unknown, vars: Map<string, string>): string {
  if (v && typeof v === "object" && "id" in v) return vars.get(String((v as { id: string }).id)) || "?";
  const s = String(v ?? "");
  return MENU_WORDS[s] || s;
}

function inputText(input: { block?: SBlock; shadow?: SBlock } | undefined, vars: Map<string, string>): string {
  if (!input) return "…";
  if (input.block && input.block.id !== input.shadow?.id) return `(${say(input.block, vars)})`;
  const sh = input.shadow;
  if (!sh) return "…";
  const v = Object.values(sh.fields || {})[0];
  if (sh.type === "text") return `“${String(v ?? "")}”`;
  return fieldText(v, vars) || "…";
}

const procWords = (proc: ProcState | undefined, value: (id: string) => string) =>
  (proc?.parts || []).map((part) => (part.type === "label" ? part.text : value(part.id || ""))).join(" ");

/** A block in words, the way it reads in the editor. */
export function say(b: SBlock, vars: Map<string, string>): string {
  if (b.type === "procedures_definition") return `how to ${procWords(b.extraState as unknown as ProcState, (id) => `[${(b.extraState as unknown as ProcState).parts.find((p) => p.id === id)?.name || "?"}]`)}`;
  if (b.type === "procedures_call") {
    const proc = (b.extraState as { proc?: ProcState } | undefined)?.proc;
    return procWords(proc, (id) => inputText(b.inputs?.[id], vars));
  }
  if (b.type.startsWith("argument_reporter")) return String((b.extraState as { name?: string } | undefined)?.name || b.fields?.VALUE || "input");
  if (b.type === "data_variable" || b.type === "data_listcontents") return fieldText(b.fields?.VARIABLE ?? b.fields?.LIST, vars);
  const t = blockTemplate(b.type);
  if (!t) return b.type.replace(/^[a-z]+_/, "").replace(/_/g, " ");
  return t.message.replace(/%(\d+)/g, (_, n) => {
    const name = t.args[Number(n) - 1];
    if (!name) return "";
    if (b.inputs?.[name]) return inputText(b.inputs[name], vars);
    return fieldText(b.fields?.[name], vars);
  }).replace(/\s+/g, " ").trim();
}

const category = (b: SBlock) => {
  if (b.type.startsWith("procedures") || b.type.startsWith("argument")) return "myblocks";
  return blockTemplate(b.type)?.category || b.type.split("_")[0];
};

const signalOf = (b: SBlock, field: "in" | "out") =>
  field === "out" ? String(Object.values(b.inputs?.BROADCAST_INPUT?.shadow?.fields || {})[0] ?? "") : String(b.fields?.BROADCAST_OPTION ?? "");

/* ---------- tree ---------- */

const LOOPS = new Set(["control_forever", "control_repeat", "control_repeat_until"]);

function chain(first: SBlock | undefined, t: Target, vars: Map<string, string>, folded: Set<string>): MapNode[] {
  const out: MapNode[] = [];
  for (let b = first; b; b = b.next?.block) {
    const base = { key: b.id, label: say(b, vars), cat: category(b), targetId: t.id, blockId: b.id };
    if (LOOPS.has(b.type)) out.push(fold({ ...base, kind: "loop", children: chain(b.inputs?.SUBSTACK?.block, t, vars, folded) }, folded));
    else if (b.type === "control_if" || b.type === "control_if_else") {
      const yes: MapNode = { key: `${b.id}:yes`, kind: "branch", label: "yes", cat: "control", targetId: t.id, blockId: b.id, children: chain(b.inputs?.SUBSTACK?.block, t, vars, folded) };
      const no: MapNode = { key: `${b.id}:no`, kind: "branch", label: "otherwise", cat: "control", targetId: t.id, blockId: b.id, children: chain(b.inputs?.SUBSTACK2?.block, t, vars, folded) };
      out.push(fold({ ...base, kind: "if", label: `${base.label.replace(/\?\)?$/, (m) => (m === "?)" ? ")" : ""))}?`, children: b.type === "control_if_else" ? [yes, no] : [yes] }, folded));
    } else out.push({ ...base, kind: "step", children: [], sends: b.type.startsWith("event_broadcast") ? signalOf(b, "out") : undefined });
  }
  return out;
}

const count = (n: MapNode): number => n.children.reduce((s, c) => s + 1 + count(c), 0);

function fold(n: MapNode, folded: Set<string>): MapNode {
  return folded.has(n.key) && n.children.length ? { ...n, hidden: count(n), children: [] } : n;
}

export function buildTree(p: CodeProject, folded: Set<string>): MapNode {
  const vars = names(p);
  const targets = [p.stage, ...p.sprites].map((t) => {
    const scripts = topBlocks(t)
      .slice()
      .sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0))
      .map((top) => {
        const hat = blockTemplate(top.type)?.hat || top.type === "procedures_definition";
        const node: MapNode = hat
          ? {
              key: top.id,
              kind: "script",
              label: say(top, vars),
              cat: category(top),
              targetId: t.id,
              blockId: top.id,
              receives: top.type === "event_whenbroadcastreceived" ? signalOf(top, "in") : undefined,
              children: chain(top.next?.block, t, vars, folded),
            }
          : { key: top.id, kind: "script", label: "loose blocks: nothing starts them", cat: "loose", targetId: t.id, blockId: top.id, children: chain(top, t, vars, folded) };
        return fold(node, folded);
      });
    const pic = t.costumes[t.costume] || t.costumes[0];
    return fold({ key: `t:${t.id}`, kind: "target", label: t.isStage ? "Scene" : t.name, cat: "target", targetId: t.id, thumb: pic ? svgUrl(costumeSvg(pic)) : undefined, children: scripts }, folded);
  });
  return { key: "root", kind: "root", label: p.title || "My game", cat: "root", children: targets };
}

/** Fold every script of a big project at first, so the map opens readable. */
export function initialFolds(p: CodeProject): Set<string> {
  const total = [p.stage, ...p.sprites].reduce((s, t) => s + JSON.stringify(t.blocks).split('"id"').length, 0);
  return total > 140 ? new Set([p.stage, ...p.sprites].flatMap((t) => topBlocks(t).map((b) => b.id))) : new Set();
}

/* ---------- layout and drawing ---------- */

interface Placed {
  node: MapNode;
  x: number;
  y: number;
  w: number;
  h: number;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const clip = (s: string) => (s.length > MAX_LABEL ? `${s.slice(0, MAX_LABEL - 1)}…` : s);

function size(n: MapNode): { w: number; h: number } {
  const text = clip(n.label).length;
  if (n.kind === "root") return { w: Math.max(150, 30 + text * 10.5), h: 52 };
  if (n.kind === "target") return { w: Math.max(150, 70 + text * 8.6), h: 56 };
  if (n.kind === "branch") return { w: 36 + text * 7.4, h: 26 };
  return { w: Math.min(380, 50 + text * 7.3 + (n.hidden ? 34 : 0)), h: 34 };
}

const colour = (cat: string) => (cat === "loose" ? "#8a94a3" : cat === "myblocks" ? "#7449c4" : CATEGORIES[cat]?.colour || "#566788");

export function drawMap(root: MapNode, pal: Palette): { svg: string; width: number; height: number } {
  // Column widths: the widest node at each depth.
  const widths: number[] = [];
  const measure = (n: MapNode, d: number) => {
    widths[d] = Math.max(widths[d] || 0, size(n).w);
    n.children.forEach((c) => measure(c, d + 1));
  };
  measure(root, 0);
  const GAP_X = 46;
  const GAP_Y = 10;
  const colX = widths.map((_, d) => widths.slice(0, d).reduce((s, w) => s + w + GAP_X, 24));

  const placed: Placed[] = [];
  const edges: [Placed, Placed][] = [];
  let cursor = 24;
  const place = (n: MapNode, d: number): Placed => {
    const { w, h } = size(n);
    let y: number;
    const kids = n.children.map((c) => place(c, d + 1));
    if (kids.length) y = (kids[0].y + kids[0].h / 2 + kids[kids.length - 1].y + kids[kids.length - 1].h / 2) / 2 - h / 2;
    else {
      y = cursor;
      cursor += h + GAP_Y;
    }
    // A parent taller than its children's span pushes what follows down.
    if (y + h + GAP_Y > cursor) cursor = y + h + GAP_Y;
    const me = { node: n, x: colX[d], y, w, h };
    placed.push(me);
    kids.forEach((k) => edges.push([me, k]));
    if (n.kind === "target" || n.kind === "root") cursor += n.kind === "target" ? 14 : 0;
    return me;
  };
  place(root, 0);
  const width = Math.max(...placed.map((p) => p.x + p.w)) + 40;
  const height = Math.max(cursor, ...placed.map((p) => p.y + p.h)) + 24;

  const parts: string[] = [];
  parts.push(`<defs><marker id="sig" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${CATEGORIES.events.colour}"/></marker></defs>`);

  for (const [a, b] of edges) {
    const x1 = a.x + a.w;
    const y1 = a.y + a.h / 2;
    const x2 = b.x;
    const y2 = b.y + b.h / 2;
    const mid = (x1 + x2) / 2;
    parts.push(`<path d="M${x1} ${y1}C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}" fill="none" stroke="${b.node.kind === "target" ? pal.line : colour(b.node.cat)}" stroke-width="${b.node.kind === "target" || b.node.kind === "script" ? 3 : 2}" stroke-linecap="round" opacity="0.85"/>`);
  }

  // Signals: from each "send" step to every script that listens for it.
  const scriptsBySignal = new Map<string, Placed[]>();
  for (const p of placed) if (p.node.receives) scriptsBySignal.set(p.node.receives, [...(scriptsBySignal.get(p.node.receives) || []), p]);
  for (const p of placed) {
    if (!p.node.sends) continue;
    for (const to of scriptsBySignal.get(p.node.sends) || []) {
      const x1 = p.x + p.w;
      const y1 = p.y + p.h / 2;
      const x2 = to.x;
      const y2 = to.y + to.h / 2;
      const bend = Math.max(60, Math.abs(y2 - y1) / 3);
      parts.push(`<path class="map-signal" d="M${x1} ${y1}C${x1 + bend} ${y1} ${x2 - bend} ${y2} ${x2 - 4} ${y2}" fill="none" stroke="${CATEGORIES.events.colour}" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#sig)"><title>${esc(`signal “${p.node.sends}”`)}</title></path>`);
    }
  }

  for (const p of placed) {
    const n = p.node;
    const c = colour(n.cat);
    const attrs = `data-key="${esc(n.key)}"${n.targetId ? ` data-target="${esc(n.targetId)}"` : ""}${n.blockId ? ` data-block="${esc(n.blockId)}"` : ""}`;
    const label = esc(clip(n.label));
    parts.push(`<g class="map-node map-${n.kind}" ${attrs} transform="translate(${p.x} ${p.y})" tabindex="0" role="button"><title>${esc(n.label)}</title>`);
    if (n.kind === "root") {
      parts.push(`<rect width="${p.w}" height="${p.h}" rx="26" fill="${pal.root}"/><text x="${p.w / 2}" y="${p.h / 2 + 6}" text-anchor="middle" font-size="18" font-weight="800" fill="${pal.rootInk}">${label}</text>`);
    } else if (n.kind === "target") {
      parts.push(`<rect width="${p.w}" height="${p.h}" rx="14" fill="${pal.paper}" stroke="${pal.line}" stroke-width="2"/>`);
      if (n.thumb) parts.push(`<image href="${esc(n.thumb)}" x="8" y="6" width="44" height="44" preserveAspectRatio="xMidYMid meet"/>`);
      parts.push(`<text x="62" y="${p.h / 2 + 5}" font-size="15" font-weight="800" fill="${pal.ink}">${label}</text>`);
    } else if (n.kind === "branch") {
      parts.push(`<rect width="${p.w}" height="${p.h}" rx="13" fill="${pal.paper}" stroke="${c}" stroke-width="2" stroke-dasharray="${n.label === "yes" ? "0" : "4 3"}"/><text x="${p.w / 2}" y="${p.h / 2 + 4.5}" text-anchor="middle" font-size="12.5" font-weight="800" fill="${c}">${label}</text>`);
    } else {
      const solid = n.kind === "script";
      const glyph = CATEGORIES[n.cat]?.glyph || "";
      const shape = n.kind === "if" ? `<path d="M0 ${p.h / 2}L12 0H${p.w - 12}L${p.w} ${p.h / 2}L${p.w - 12} ${p.h}H12z"` : `<rect width="${p.w}" height="${p.h}" rx="${n.kind === "loop" ? 17 : 9}"`;
      parts.push(`${shape} fill="${solid ? c : pal.paper}" stroke="${c}" stroke-width="2"/>`);
      parts.push(`<g transform="translate(${n.kind === "if" ? 14 : 8} 7) scale(0.83)" color="${solid ? "#fff" : c}">${glyph}</g>`);
      parts.push(`<text x="${n.kind === "if" ? 38 : 32}" y="${p.h / 2 + 4.6}" font-size="13" font-weight="${solid ? 800 : 650}" fill="${solid ? "#fff" : pal.ink}">${n.kind === "loop" ? "↻ " : ""}${label}</text>`);
    }
    const canFold = n.kind !== "root" && n.kind !== "step" && n.kind !== "branch" && (n.children.length || n.hidden);
    if (canFold) {
      const r = 10;
      parts.push(`<g class="map-fold" data-fold="${esc(n.key)}" transform="translate(${p.w} ${p.h / 2})"><circle r="${r}" fill="${pal.paper}" stroke="${n.kind === "target" ? pal.ink2 : c}" stroke-width="2"/><text y="4" text-anchor="middle" font-size="${n.hidden ? 10 : 14}" font-weight="800" fill="${pal.ink2}">${n.hidden ? (n.hidden > 99 ? "99+" : n.hidden) : "−"}</text></g>`);
    }
    parts.push(`</g>`);
  }

  const font = `font-family="Nunito Variable, Nunito, ui-rounded, system-ui, sans-serif"`;
  return { width, height, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" ${font}>${parts.join("")}</svg>` };
}
