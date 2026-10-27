import { deflateSync, inflateSync, strToU8 } from "fflate";
import { ICON_BG } from "../palette";
import type { Game } from "../../shared/types";
import { rewriteManifest, TEMPLATE_ID } from "./manifest";
import { signApk, type SigningKey } from "./sign";
import { crc32, readZip, writeZip, type ZipEntry } from "./zip";

/**
 * Game → installable APK, entirely in the browser: the prebuilt WebView shell
 * (public/shell-template.apk, built from shell/) gets the game page as
 * assets/www/index.html, the game's id, name, version and icon, and a v2 signature.
 */

export const APP_ID_RE = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/;
const ICON_ENTRIES = ["app_icon.png", "ic_launcher.png"];

export const defaultAppId = (game: Game) => `org.decentralschool.game.g${game.id.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;

export interface ApkOptions {
  id: string;
  name: string;
  version: string;
  versionCode: number;
}

let template: Promise<Uint8Array> | null = null;
const loadTemplate = () =>
  (template ??= fetch("/shell-template.apk").then(async (r) => {
    if (!r.ok) throw new Error("Couldn't load the Android shell. Check your connection and try again.");
    return new Uint8Array(await r.arrayBuffer());
  }));

const deflated = (name: string, raw: Uint8Array): ZipEntry => ({ name, method: 8, crc: crc32(raw), size: raw.length, data: deflateSync(raw, { level: 9 }), attrs: 0 });
const stored = (name: string, raw: Uint8Array): ZipEntry => ({ name, method: 0, crc: crc32(raw), size: raw.length, data: raw, attrs: 0 });

const ICON = 256;

function iconCanvas(bg: string): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = ICON;
  const g = canvas.getContext("2d")!;
  g.fillStyle = bg;
  g.beginPath();
  g.arc(ICON / 2, ICON / 2, ICON / 2, 0, Math.PI * 2);
  g.fill();
  return [canvas, g];
}

async function png(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Couldn't draw the app icon.");
  return new Uint8Array(await blob.arrayBuffer());
}

/** A 256×256 launcher icon: the game's emoji on its colour. */
export async function makeIcon(game: Game): Promise<Uint8Array> {
  const [canvas, g] = iconCanvas(ICON_BG[game.tint]);
  g.font = `${Math.round(ICON * 0.56)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(game.emoji, ICON / 2, ICON / 2 + ICON * 0.04);
  return png(canvas);
}

/** A launcher icon from a drawing (a Game Lab sprite), fitted inside the circle. */
export async function makeIconFromSvg(svgMarkup: string, bg = "#ece4fb"): Promise<Uint8Array> {
  const [canvas, g] = iconCanvas(bg);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  await img.decode();
  const box = ICON * 0.7;
  const k = Math.min(box / img.naturalWidth, box / img.naturalHeight);
  const w = img.naturalWidth * k;
  const h = img.naturalHeight * k;
  g.drawImage(img, (ICON - w) / 2, (ICON - h) / 2, w, h);
  return png(canvas);
}

export async function buildApk(icon: Uint8Array, page: string, opts: ApkOptions & { keepScreenOn?: boolean }, key: SigningKey): Promise<Blob> {
  if (!APP_ID_RE.test(opts.id) || opts.id === TEMPLATE_ID) throw new Error("The app id must look like org.school.mygame.");
  const zip = await loadTemplate();
  const entries: ZipEntry[] = [];
  for (const e of readZip(zip)) {
    if (e.name.endsWith("/") || e.name.startsWith("assets/") || /^META-INF\/[^/]+\.(MF|SF|RSA|DSA|EC)$/i.test(e.name)) continue;
    const raw = () => (e.method === 8 ? inflateSync(e.data) : e.data);
    if (e.name === "AndroidManifest.xml") entries.push(deflated(e.name, rewriteManifest(raw(), opts)));
    else if (e.name.startsWith("res/") && ICON_ENTRIES.includes(e.name.split("/").pop()!)) entries.push(stored(e.name, icon));
    else if (e.name === "resources.arsc" && e.method !== 0) entries.push(stored(e.name, raw()));
    else entries.push(e);
  }
  const shell = { backgroundColor: opts.keepScreenOn ? "#1c1810" : "#fffaeb", orientation: opts.keepScreenOn ? "any" : "portrait", keepScreenOn: !!opts.keepScreenOn, start: "index.html" };
  entries.push(deflated("assets/shell.json", strToU8(JSON.stringify(shell))));
  entries.push(deflated("assets/www/index.html", strToU8(page)));
  const { body, central, eocd } = writeZip(entries);
  const apk = await signApk(body, central, eocd, key);
  return new Blob([apk as BlobPart], { type: "application/vnd.android.package-archive" });
}
