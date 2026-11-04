#!/usr/bin/env node
/**
 * Draws the pictures on the game cards (public/thumbs/<template>.webp) from the game art.
 *
 *   npm run thumbs
 *
 * Balloon Blast: the layers in art/balloon are 1080×1920 and line up with each other,
 * so the scene is laid out in that space (cannon, ammo, a cannonball on its way, a
 * balloon popping, balloons in the sky) and the bottom of it is cut out.
 */
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const art = (...p) => join(root, "art", ...p);
const out = join(root, "public/thumbs");
mkdirSync(out, { recursive: true });

/** The box around every pixel with alpha above `min`. */
async function bounds(file, min = 24) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > min) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/** A layer trimmed to what is drawn on it, scaled, turned and centred on (x, y). */
async function sprite(file, { x, y, scale = 1, rotate = 0, min = 24 }) {
  const box = await bounds(file, min);
  let img = sharp(file).extract(box).resize({ width: Math.round(box.width * scale) });
  if (rotate) img = sharp(await img.png().toBuffer()).rotate(rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  const input = await img.png().toBuffer();
  const { width, height } = await sharp(input).metadata();
  return { input, left: Math.round(x - width / 2), top: Math.round(y - height / 2) };
}

/** Where a layer already sits in the art. */
async function inPlace(file, min = 24) {
  const box = await bounds(file, min);
  return { input: await sharp(file).extract(box).png().toBuffer(), left: box.left, top: box.top };
}

async function balloon() {
  const b = (name) => art("balloon", name);
  const crop = { left: 0, top: 1180, width: 1080, height: 740 };
  const scene = await sharp(b("baloon bg.png"))
    .composite([
      await sprite(b("baloon green.png"), { x: 120, y: 1330, scale: 0.62, rotate: -8 }),
      await sprite(b("baloon red.png"), { x: 640, y: 1300, scale: 0.72, rotate: 6 }),
      await sprite(b("baloon purple.png"), { x: 855, y: 1350, scale: 0.7, rotate: 10 }),
      await sprite(b("baloon yellow.png"), { x: 975, y: 1560, scale: 0.55, rotate: -6 }),
      await sprite(b("b2.png"), { x: 430, y: 1300, scale: 0.8, min: 8 }),
      await inPlace(b("c2.png"), 8),
      await inPlace(b("canon ball main.png")),
      await inPlace(b("canon balls extra_.png")),
      await inPlace(b("canon.png")),
    ])
    .png()
    .toBuffer();
  await sharp(scene).extract(crop).resize({ width: 840 }).webp({ quality: 82, effort: 6 }).toFile(join(out, "balloon.webp"));
}

await balloon();
console.log("public/thumbs/balloon.webp");
