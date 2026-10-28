import { strFromU8, unzipSync } from "fflate";
import { t, tn } from "../i18n";

/**
 * A finished HTML game, as one file the studio can play, share and pack into an APK.
 * A .zip of a game folder is folded into its page: scripts, styles, pictures and
 * sounds become inline, and files the game fetches (a content.json, say) are answered
 * from memory, so it keeps working with the network switched off.
 */

export interface HtmlGame {
  html: string;
  title: string;
  /** Things that won't work offline, said plainly. */
  warnings: string[];
}

const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", ico: "image/x-icon",
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4", mp4: "video/mp4", webm: "video/webm",
  woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf",
  json: "application/json", txt: "text/plain", csv: "text/csv", js: "text/javascript", css: "text/css", html: "text/html", xml: "application/xml",
};

const ext = (p: string) => p.split(".").pop()!.toLowerCase();
const b64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(s);
};

/** Whether an .html file is a game (it runs code), not a lesson saved as a web page. */
export const isGameHtml = (html: string) => /<script[\s>]|<canvas[\s>]|\son(click|keydown|touchstart|pointerdown)=/i.test(html);

const titleOf = (html: string, fallback: string) => new DOMParser().parseFromString(html, "text/html").title.trim() || fallback;

/** Network files the page asks for, which won't load when it runs offline. */
function remote(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/<(?:script|link|img|iframe|audio|video|source)\b[^>]*?\s(?:src|href)\s*=\s*["'](?:https?:)?\/\/([^"'/]+)/gi)) out.add(m[1]);
  for (const m of html.matchAll(/(?:fetch|import)\s*\(\s*["'](https?:\/\/[^"'/]+)/gi)) out.add(new URL(m[1]).host);
  return [...out];
}

/** Local files (not data: or the web) a single page refers to: these weren't uploaded with it. */
function missing(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/<(?:script|img|audio|source|video|link)\b[^>]*?\s(?:src|href)\s*=\s*["']([^"'#]+)["']/gi)) {
    const ref = m[1];
    if (!/^(https?:|data:|blob:|\/\/|mailto:|#)/i.test(ref)) out.add(ref);
  }
  return [...out];
}

export async function htmlGameFromFile(file: File): Promise<HtmlGame> {
  const name = file.name.replace(/\.[^.]+$/, "");
  if (/\.zip$/i.test(file.name)) return fromZip(new Uint8Array(await file.arrayBuffer()), name);
  const html = await file.text();
  const warnings: string[] = [];
  const lost = missing(html);
  if (lost.length) warnings.push(`${tn(lost.length, "It uses {n} file that wasn't uploaded", "It uses {n} files that weren't uploaded")} (${lost.slice(0, 3).join(", ")}${lost.length > 3 ? "…" : ""}). ${t("Upload the game's folder as a .zip to include them.")}`);
  const web = remote(html);
  if (web.length) warnings.push(t("It loads from the internet ({sites}), which is switched off in offline games.", { sites: web.slice(0, 3).join(", ") }));
  return { html, title: titleOf(html, name), warnings };
}

function fromZip(bytes: Uint8Array, fallback: string): HtmlGame {
  const files = unzipSync(bytes, { filter: (f) => !f.name.startsWith("__MACOSX/") && !f.name.endsWith("/") });
  const pages = Object.keys(files).filter((f) => /\.html?$/i.test(f)).sort((a, b) => a.split("/").length - b.split("/").length || Number(!/index\.html?$/i.test(a)) - Number(!/index\.html?$/i.test(b)));
  const page = pages[0];
  if (!page) throw new Error(t("There's no .html page in that .zip."));
  const dir = page.includes("/") ? page.slice(0, page.lastIndexOf("/") + 1) : "";

  const resolve = (from: string, ref: string): string | null => {
    if (/^(https?:|data:|blob:|\/\/|#|mailto:)/i.test(ref)) return null;
    const clean = decodeURI(ref.split(/[?#]/)[0]);
    const parts = (clean.startsWith("/") ? clean.slice(1) : from + clean).split("/");
    const out: string[] = [];
    for (const p of parts) {
      if (p === "..") out.pop();
      else if (p && p !== ".") out.push(p);
    }
    const path = out.join("/");
    return path in files ? path : null;
  };
  const dataUrl = (path: string) => `data:${MIME[ext(path)] || "application/octet-stream"};base64,${b64(files[path])}`;
  const used = new Set<string>([page]);

  /** url(...) inside CSS, relative to the stylesheet. */
  const css = (text: string, from: string) =>
    text.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/g, (m, ref: string) => {
      const p = resolve(from, ref);
      if (!p) return m;
      used.add(p);
      return `url("${dataUrl(p)}")`;
    });

  let html = strFromU8(files[page]);
  html = html.replace(/<script\b([^>]*?)\ssrc\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (m, a: string, ref: string, b: string) => {
    const p = resolve(dir, ref);
    if (!p) return m;
    used.add(p);
    return `<script${a}${b}>${strFromU8(files[p]).replace(/<\/script/gi, "<\\/script")}</script>`;
  });
  html = html.replace(/<link\b[^>]*?rel\s*=\s*["']?stylesheet["']?[^>]*>/gi, (m) => {
    const ref = m.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    const p = ref && resolve(dir, ref);
    if (!p) return m;
    used.add(p);
    return `<style>${css(strFromU8(files[p]), p.slice(0, p.lastIndexOf("/") + 1))}</style>`;
  });
  html = html.replace(/(<(?:img|audio|video|source|input|link)\b[^>]*?\s(?:src|href|poster)\s*=\s*)(["'])([^"']+)\2/gi, (m, head: string, q: string, ref: string) => {
    const p = resolve(dir, ref);
    if (!p) return m;
    used.add(p);
    return `${head}${q}${dataUrl(p)}${q}`;
  });
  html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_m, a: string, body: string) => `<style${a}>${css(body, dir)}</style>`);

  // Anything else the game may load at run time (data files, pictures named in code), answered from
  // memory: built as a Response here, since offline games may not fetch even data: addresses.
  const rest = Object.keys(files).filter((f) => !used.has(f) && !/\.html?$/i.test(f) && files[f].length < 3_000_000);
  if (rest.length) {
    const table: Record<string, string> = {};
    for (const f of rest) table[f.startsWith(dir) ? f.slice(dir.length) : f] = dataUrl(f);
    const shim = `<script>(function(){var F=${JSON.stringify(table).replace(/</g, "\\u003c")};function hit(u){u=String(u).split(/[?#]/)[0].replace(/^\\.?\\//,"");return F[u]||F[decodeURI(u)]}function res(d){var i=d.indexOf(","),b=atob(d.slice(i+1)),a=new Uint8Array(b.length);for(var k=0;k<b.length;k++)a[k]=b.charCodeAt(k);return new Response(a,{headers:{"Content-Type":d.slice(5,i).split(";")[0]}})}var f=window.fetch;window.fetch=function(u,o){var d=hit(u&&u.url||u);return d?Promise.resolve(res(d)):f.call(window,u,o)};var X=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){var d=hit(u);arguments[1]=d||u;return X.apply(this,arguments)};document.addEventListener("error",function(e){var t=e.target,s=t&&t.getAttribute&&t.getAttribute("src"),d=s&&hit(s);if(d)t.src=d},true)})();</script>`;
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + shim) : shim + html;
  }

  const warnings: string[] = [];
  if (pages.length > 1) warnings.push(t("The .zip has {n} pages; “{page}” was used.", { n: pages.length, page }));
  const web = remote(html);
  if (web.length) warnings.push(t("It loads from the internet ({sites}), which is switched off in offline games.", { sites: web.slice(0, 3).join(", ") }));
  return { html, title: titleOf(html, fallback), warnings };
}
