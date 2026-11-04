// Made by scripts/balloon-sprites.mjs from art/balloon. Don't edit by hand.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where each sprite sits in the 1080×1920 art. Files: public/p/balloon/<name>.webp */
export const SPRITES = {
  bg: { x: 0, y: 0, w: 1080, h: 1920 },
  cannon: { x: 171, y: 1761, w: 227, h: 159 },
  ball: { x: 344, y: 1392, w: 90, h: 86 },
  trail1: { x: 302, y: 1430, w: 112, h: 122 },
  trail2: { x: 277, y: 1426, w: 140, h: 135 },
  trail3: { x: 321, y: 1414, w: 100, h: 107 },
  ammo1: { x: 738, y: 1851, w: 67, h: 64 },
  ammo2: { x: 818, y: 1851, w: 67, h: 63 },
  ammo3: { x: 898, y: 1853, w: 60, h: 58 },
  ammo4: { x: 972, y: 1851, w: 62, h: 61 },
  "balloon-red": { x: 427, y: 819, w: 227, h: 282 },
  "balloon-green": { x: 413, y: 805, w: 253, h: 310 },
  "balloon-purple": { x: 410, y: 756, w: 256, h: 349 },
  "balloon-yellow": { x: 462, y: 770, w: 238, h: 318 },
  "pop-red-1": { x: 461, y: 995, w: 203, h: 243 },
  "pop-green-1": { x: 461, y: 995, w: 203, h: 243 },
  "pop-purple-1": { x: 461, y: 995, w: 203, h: 243 },
  "pop-yellow-1": { x: 461, y: 995, w: 203, h: 243 },
  "pop-red-2": { x: 461, y: 999, w: 202, h: 240 },
  "pop-green-2": { x: 461, y: 999, w: 202, h: 240 },
  "pop-purple-2": { x: 461, y: 999, w: 202, h: 240 },
  "pop-yellow-2": { x: 461, y: 999, w: 202, h: 240 },
  "pop-red-3": { x: 448, y: 992, w: 229, h: 247 },
  "pop-green-3": { x: 448, y: 992, w: 229, h: 247 },
  "pop-purple-3": { x: 448, y: 992, w: 229, h: 247 },
  "pop-yellow-3": { x: 448, y: 992, w: 229, h: 247 },
} satisfies Record<string, Rect>;

export type SpriteName = keyof typeof SPRITES;

export const COLORS = ["red", "green", "purple", "yellow"] as const;

/** Each balloon's average colour, for the bits drawn in code. */
export const TINT: Record<(typeof COLORS)[number], string> = { red: "#c36746", green: "#b7d46d", purple: "#9663cd", yellow: "#d5c353" };
