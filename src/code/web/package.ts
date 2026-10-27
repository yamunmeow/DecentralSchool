import { strToU8, zipSync } from "fflate";
import webJs from "./web.js?raw";
import type { WebAsset, WebFiles } from "./translate";

/** The library every web project uses (shown to students as web.js). */
export const WEB_JS = webJs;

const toDataUrl = (a: WebAsset) =>
  typeof a.data === "string"
    ? `data:${a.type};charset=utf-8,${encodeURIComponent(a.data)}`
    : `data:${a.type};base64,${btoa(Array.from(a.data, (b) => String.fromCharCode(b)).join(""))}`;

/**
 * One page that runs the three files with their pictures and sounds inlined, for the
 * preview frame. File paths in the files ("costumes/zo/zo-stand.svg") are answered
 * from the inlined copies, so students can keep writing normal relative paths.
 */
export function previewPage(files: WebFiles, assets: WebAsset[]): string {
  const map = Object.fromEntries(assets.map((a) => [a.path, toDataUrl(a)]));
  const swap = (text: string) => text.replace(/(costumes|backdrops|sounds)\/[A-Za-z0-9_\-./]+/g, (path) => map[path] || path);
  const resolver = `<script>
(function () {
  var FILES = ${JSON.stringify(map).replace(/</g, "\\u003c")};
  var fix = function (v) { return typeof v === "string" && FILES[v] ? FILES[v] : v; };
  var src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  Object.defineProperty(HTMLImageElement.prototype, "src", { get: src.get, set: function (v) { src.set.call(this, fix(v)); } });
  var NativeAudio = window.Audio;
  window.Audio = function (path) { return new NativeAudio(fix(path)); };
  var bg = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, "backgroundImage");
  if (bg) Object.defineProperty(CSSStyleDeclaration.prototype, "backgroundImage", { get: bg.get, set: function (v) { bg.set.call(this, String(v).replace(/url\\("([^"]+)"\\)/, function (m, p) { return 'url("' + fix(p) + '")'; })); } });
  window.addEventListener("error", function (e) { parent.postMessage({ webError: e.message + (e.lineno ? " (line " + e.lineno + ")" : "") }, "*"); });
  window.addEventListener("unhandledrejection", function (e) { if (e.reason && e.reason.message !== "stopped") parent.postMessage({ webError: String(e.reason && e.reason.message || e.reason) }, "*"); });
})();
</script>`;
  const body = swap(files.html)
    .replace(/<link rel="stylesheet" href="style.css">/, `<style>\n${swap(files.css)}\n</style>`)
    .replace(/<script src="web.js"><\/script>/, () => `${resolver}\n<script>\n${WEB_JS.replace(/<\/script/gi, "<\\/script")}\n</script>`)
    .replace(/<script src="script.js"><\/script>/, () => `<script>\n${swap(files.js).replace(/<\/script/gi, "<\\/script")}\n</script>`);
  return body;
}

/** The web project as a .zip: index.html, style.css, script.js, web.js, pictures and sounds. */
export function webZip(files: WebFiles, assets: WebAsset[], title: string): Uint8Array {
  const entries: Record<string, Uint8Array> = {
    "index.html": strToU8(files.html),
    "style.css": strToU8(files.css),
    "script.js": strToU8(files.js),
    "web.js": strToU8(WEB_JS),
    "README.txt": strToU8(
      `${title}\n\nOpen index.html in a browser to play. Change the files in any text editor and reload.\n\n` +
        `index.html  the page: the stage, and a picture (img) for each character\n` +
        `style.css   how it looks: where each character starts, colours, sizes\n` +
        `script.js   what happens: the scripts from your blocks, in JavaScript\n` +
        `web.js      the helpers script.js uses (Sprite, wait, nextFrame, ...)\n\n` +
        `Some browsers block sounds and pictures when a page is opened straight from a folder.\n` +
        `If that happens, serve the folder (for example: python3 -m http.server) and open http://localhost:8000.\n`,
    ),
  };
  for (const a of assets) entries[a.path] = typeof a.data === "string" ? strToU8(a.data) : a.data;
  return zipSync(entries, { level: 6 });
}
