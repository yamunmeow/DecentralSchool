#!/usr/bin/env node
/**
 * Turns the Balloon Blast art (art/balloon, 1080×1920 layers) into small WebP sprites:
 * each layer is trimmed to what is drawn on it, the ammo row is cut into single balls,
 * and the green pop frames are recoloured for every balloon. Writes the files to
 * public/p/balloon/ (the hosted player loads them from there and its service worker
 * keeps them; downloads and apps carry them inline) and their places in the art to
 * src/player/balloon/sprites.ts.
 *
 *   npm run sprites
 *
 * sharp comes with wrangler, which the project already needs.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const src = join(root, "art/balloon");
const out = join(root, "public/p/balloon");
const COLORS = ["red", "green", "purple", "yellow"];

const raw = async (file) => {
  const { data, info } = await sharp(join(src, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};

/** The box around every pixel with alpha above `min`, inside `area`. */
function bounds(img, min = 24, area = { x: 0, y: 0, w: img.w, h: img.h }) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = area.y; y < area.y + area.h; y++)
    for (let x = area.x; x < area.x + area.w; x++)
      if (img.data[(y * img.w + x) * 4 + 3] > min) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Runs of columns that have something drawn in them: the separate balls of the ammo row. */
function columns(img, box, min = 24) {
  const used = (x) => {
    for (let y = box.y; y < box.y + box.h; y++) if (img.data[(y * img.w + x) * 4 + 3] > min) return true;
    return false;
  };
  const runs = [];
  for (let x = box.x, start = -1; x <= box.x + box.w; x++) {
    const on = x < box.x + box.w && used(x);
    if (on && start < 0) start = x;
    if (!on && start >= 0) runs.push([start, x - start]), (start = -1);
  }
  return runs.map(([x, w]) => bounds(img, min, { x, y: box.y, w, h: box.h }));
}

const crop = (img, r) => {
  const buf = Buffer.alloc(r.w * r.h * 4);
  for (let y = 0; y < r.h; y++) img.data.copy(buf, y * r.w * 4, ((r.y + y) * img.w + r.x) * 4, ((r.y + y) * img.w + r.x + r.w) * 4);
  return { data: buf, w: r.w, h: r.h };
};

/** Average colour of the solid pixels. */
function average(img) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < img.data.length; i += 4)
    if (img.data[i + 3] > 200) (r += img.data[i]), (g += img.data[i + 1]), (b += img.data[i + 2]), n++;
  return [r / n, g / n, b / n];
}

const chroma = (c) => Math.max(...c) - Math.min(...c);
const luma = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

/** Swaps the green of a pop frame for another balloon's colour; the white flash stays white. */
function recolour(img, from, to) {
  const data = Buffer.from(img.data);
  for (let i = 0; i < data.length; i += 4) {
    const p = [data[i], data[i + 1], data[i + 2]];
    const k = Math.min(1, chroma(p) / chroma(from));
    const shade = luma(p) / luma(from);
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(Math.min(255, p[c] * (1 - k) + to[c] * shade * k));
  }
  return { ...img, data };
}

const files = {};
const place = {};
async function save(name, img, rect, quality = 82) {
  await sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } }).webp({ quality, alphaQuality: 90, effort: 6 }).toFile(join(out, `${name}.webp`));
  files[name] = true;
  place[name] = rect;
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await sharp(join(src, "baloon bg.png")).webp({ quality: 70, effort: 6 }).toFile(join(out, "bg.webp"));
place.bg = { x: 0, y: 0, w: 1080, h: 1920 };

// The cannon layer also holds a few faint specks; keep the cannon itself.
const cannon = await raw("canon.png");
const cannonBox = bounds(cannon, 24, { x: 100, y: 1700, w: 400, h: 220 });
await save("cannon", crop(cannon, cannonBox), cannonBox);

const ball = await raw("canon ball main.png");
const ballBox = bounds(ball);
await save("ball", crop(ball, ballBox), ballBox);

for (const n of [1, 2, 3]) {
  const trail = await raw(`c${n}.png`);
  const box = bounds(trail, 8);
  await save(`trail${n}`, crop(trail, box), box);
}

const ammo = await raw("canon balls extra_.png");
const balls = columns(ammo, bounds(ammo));
for (const [i, box] of balls.entries()) await save(`ammo${i + 1}`, crop(ammo, box), box);

const tints = {};
for (const color of COLORS) {
  const img = await raw(`baloon ${color}.png`);
  const box = bounds(img);
  const cut = crop(img, box);
  tints[color] = average(cut);
  await save(`balloon-${color}`, cut, box);
}

for (const n of [1, 2, 3]) {
  const img = await raw(`b${n}.png`);
  const box = bounds(img, 8);
  const cut = crop(img, box);
  for (const color of COLORS) await save(`pop-${color}-${n}`, color === "green" ? cut : recolour(cut, tints.green, tints[color]), box);
}

const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const names = ["bg", ...Object.keys(files)];
writeFileSync(
  join(root, "src/player/balloon/sprites.ts"),
  `// Made by scripts/balloon-sprites.mjs from art/balloon. Don't edit by hand.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where each sprite sits in the 1080×1920 art. Files: public/p/balloon/<name>.webp */
export const SPRITES = {
${names.map((n) => `  ${/^\w+$/.test(n) ? n : JSON.stringify(n)}: { x: ${place[n].x}, y: ${place[n].y}, w: ${place[n].w}, h: ${place[n].h} },`).join("\n")}
} satisfies Record<string, Rect>;

export type SpriteName = keyof typeof SPRITES;

export const COLORS = [${COLORS.map((c) => JSON.stringify(c)).join(", ")}] as const;

/** Each balloon's average colour, for the bits drawn in code. */
export const TINT: Record<(typeof COLORS)[number], string> = { ${COLORS.map((c) => `${c}: "${hex(tints[c])}"`).join(", ")} };
`,
);

const worker = join(root, "public/p/sw.js");
writeFileSync(worker, readFileSync(worker, "utf8").replace(/^const SPRITES = .*$/m, `const SPRITES = ${JSON.stringify(names)};`));

const total = readdirSync(out).reduce((sum, f) => sum + statSync(join(out, f)).size, 0);
console.log(`${names.length} sprites, ${Math.round(total / 1024)} KB in public/p/balloon`);
