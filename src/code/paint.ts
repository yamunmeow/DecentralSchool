/**
 * Drawings made in Game Lab's paint editor: a list of vector shapes on a 480 × 360
 * board, kept with the outfit so it can be edited again, and turned into SVG for the
 * stage. Pictures that weren't drawn here (Zo, uploads) come in as an image shape.
 */

interface Base {
  id: string;
}

export type Shape = Base &
  (
    | { kind: "rect"; x: number; y: number; w: number; h: number; fill: string; stroke: string; sw: number; r: number }
    | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; fill: string; stroke: string; sw: number }
    | { kind: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; sw: number }
    | { kind: "path"; points: number[]; stroke: string; sw: number; fill: string }
    | { kind: "text"; x: number; y: number; text: string; size: number; fill: string }
    | { kind: "image"; x: number; y: number; w: number; h: number; href: string }
  );

export interface PaintDoc {
  w: number;
  h: number;
  /** Rotation centre on the board. */
  cx: number;
  cy: number;
  shapes: Shape[];
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const BOARD_W = 480;
export const BOARD_H = 360;
export const NONE = "none";

export const emptyDoc = (): PaintDoc => ({ w: BOARD_W, h: BOARD_H, cx: BOARD_W / 2, cy: BOARD_H / 2, shapes: [] });

const textWidth = (s: { text: string; size: number }) => Math.max(s.size * 0.6, s.text.length * s.size * 0.56);

/** The area a shape covers, including half its outline. */
export function boxOf(s: Shape): Box {
  const pad = "sw" in s && s.stroke !== NONE ? s.sw / 2 : 0;
  let b: Box;
  switch (s.kind) {
    case "rect":
      b = { x: Math.min(s.x, s.x + s.w), y: Math.min(s.y, s.y + s.h), w: Math.abs(s.w), h: Math.abs(s.h) };
      break;
    case "ellipse":
      b = { x: s.cx - Math.abs(s.rx), y: s.cy - Math.abs(s.ry), w: 2 * Math.abs(s.rx), h: 2 * Math.abs(s.ry) };
      break;
    case "line":
      b = { x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2), w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) };
      break;
    case "path": {
      const xs = s.points.filter((_, i) => i % 2 === 0);
      const ys = s.points.filter((_, i) => i % 2 === 1);
      b = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      break;
    }
    case "text":
      b = { x: s.x, y: s.y - s.size * 0.85, w: textWidth(s), h: s.size * 1.1 };
      break;
    case "image":
      b = { x: s.x, y: s.y, w: s.w, h: s.h };
      break;
  }
  return { x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad };
}

export function union(boxes: Box[]): Box | null {
  if (!boxes.length) return null;
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const r = Math.max(...boxes.map((b) => b.x + b.w));
  const bt = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: r - x, h: bt - y };
}

export function moveShape(s: Shape, dx: number, dy: number): Shape {
  switch (s.kind) {
    case "rect":
    case "text":
    case "image":
      return { ...s, x: s.x + dx, y: s.y + dy };
    case "ellipse":
      return { ...s, cx: s.cx + dx, cy: s.cy + dy };
    case "line":
      return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy };
    case "path":
      return { ...s, points: s.points.map((v, i) => v + (i % 2 ? dy : dx)) };
  }
}

/** Stretch a shape so that box `from` becomes box `to`. */
export function fitShape(s: Shape, from: Box, to: Box): Shape {
  const sx = from.w ? to.w / from.w : 1;
  const sy = from.h ? to.h / from.h : 1;
  const X = (x: number) => to.x + (x - from.x) * sx;
  const Y = (y: number) => to.y + (y - from.y) * sy;
  switch (s.kind) {
    case "rect":
      return { ...s, x: X(s.x), y: Y(s.y), w: s.w * sx, h: s.h * sy };
    case "image":
      return { ...s, x: X(s.x), y: Y(s.y), w: s.w * sx, h: s.h * sy };
    case "ellipse":
      return { ...s, cx: X(s.cx), cy: Y(s.cy), rx: s.rx * sx, ry: s.ry * sy };
    case "line":
      return { ...s, x1: X(s.x1), y1: Y(s.y1), x2: X(s.x2), y2: Y(s.y2) };
    case "path":
      return { ...s, points: s.points.map((v, i) => (i % 2 ? Y(v) : X(v))) };
    case "text":
      return { ...s, x: X(s.x), y: Y(s.y), size: Math.max(4, s.size * Math.abs(sy)) };
  }
}

/** A freehand line through the points, smoothed with curves through their midpoints. */
export function pathD(points: number[]): string {
  if (points.length < 4) return points.length === 2 ? `M${points[0]} ${points[1]}h0.01` : "";
  let d = `M${r(points[0])} ${r(points[1])}`;
  for (let i = 2; i < points.length - 2; i += 2) {
    const mx = (points[i] + points[i + 2]) / 2;
    const my = (points[i + 1] + points[i + 3]) / 2;
    d += `Q${r(points[i])} ${r(points[i + 1])} ${r(mx)} ${r(my)}`;
  }
  return d + `L${r(points[points.length - 2])} ${r(points[points.length - 1])}`;
}

/** Drop points closer together than `min`, so long strokes stay small. */
export function thin(points: number[], min = 1.5): number[] {
  const out = points.slice(0, 2);
  for (let i = 2; i < points.length; i += 2) {
    const dx = points[i] - out[out.length - 2];
    const dy = points[i + 1] - out[out.length - 1];
    if (dx * dx + dy * dy >= min * min || i === points.length - 2) out.push(points[i], points[i + 1]);
  }
  return out;
}

const r = (n: number) => Math.round(n * 10) / 10;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const paint = (fill: string, stroke: string, sw: number) => `fill="${fill}" stroke="${stroke}" stroke-width="${stroke === NONE ? 0 : r(sw)}" stroke-linecap="round" stroke-linejoin="round"`;

export function shapeSvg(s: Shape): string {
  switch (s.kind) {
    case "rect": {
      const b = boxOf({ ...s, stroke: NONE });
      return `<rect x="${r(b.x)}" y="${r(b.y)}" width="${r(b.w)}" height="${r(b.h)}" rx="${r(Math.min(s.r, b.w / 2, b.h / 2))}" ${paint(s.fill, s.stroke, s.sw)}/>`;
    }
    case "ellipse":
      return `<ellipse cx="${r(s.cx)}" cy="${r(s.cy)}" rx="${r(Math.abs(s.rx))}" ry="${r(Math.abs(s.ry))}" ${paint(s.fill, s.stroke, s.sw)}/>`;
    case "line":
      return `<line x1="${r(s.x1)}" y1="${r(s.y1)}" x2="${r(s.x2)}" y2="${r(s.y2)}" ${paint(NONE, s.stroke, s.sw)}/>`;
    case "path":
      return `<path d="${pathD(s.points)}" ${paint(s.fill, s.stroke, s.sw)}/>`;
    case "text":
      return `<text x="${r(s.x)}" y="${r(s.y)}" font-size="${r(s.size)}" font-family="Nunito, Arial, sans-serif" font-weight="700" fill="${s.fill}">${esc(s.text)}</text>`;
    case "image":
      return `<image x="${r(s.x)}" y="${r(s.y)}" width="${r(s.w)}" height="${r(s.h)}" href="${esc(s.href)}" xlink:href="${esc(s.href)}" preserveAspectRatio="none"/>`;
  }
}

/**
 * The drawing as an outfit: cropped to what's drawn (backgrounds keep the whole board),
 * with the rotation centre moved to match.
 */
export function docToSvg(doc: PaintDoc, crop: boolean): { svg: string; cx: number; cy: number } {
  const all = union(doc.shapes.map(boxOf));
  const b = crop && all ? union([all, { x: doc.cx, y: doc.cy, w: 0, h: 0 }])! : { x: 0, y: 0, w: doc.w, h: doc.h };
  const x = Math.floor(b.x - 2);
  const y = Math.floor(b.y - 2);
  const w = Math.max(2, Math.ceil(b.w + 4));
  const h = Math.max(2, Math.ceil(b.h + 4));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">${doc.shapes.map(shapeSvg).join("")}</svg>`;
  return { svg, cx: doc.cx - x, cy: doc.cy - y };
}

/** Width and height an SVG says it has (for bringing an existing picture onto the board). */
export function svgSize(svg: string): { w: number; h: number } {
  const num = (name: string) => Number.parseFloat(svg.match(new RegExp(`<svg[^>]*\\s${name}="([\\d.]+)`))?.[1] || "");
  const vb = svg.match(/viewBox="[\d.\-]+[\s,]+[\d.\-]+[\s,]+([\d.]+)[\s,]+([\d.]+)"/);
  return { w: num("width") || Number(vb?.[1]) || 100, h: num("height") || Number(vb?.[2]) || 100 };
}
