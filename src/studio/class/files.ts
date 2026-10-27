import codeRuntime from "virtual:code-runtime";
import { costumeSvg, svgUrl } from "../../code/art";
import { compileProject } from "../../code/compiler";
import { buildCodePage, scriptJson } from "../../shared/page";
import { appFile, iconSvg } from "../code/files";
import { joinLink, type Challenge, type HandIn } from "./model";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; connect-src data: blob:; font-src data:; frame-src blob: data:";

/** A hand-in is the game's own app file (it plays when opened) with the hand-in details inside. */
export const handInFile = (h: HandIn) => appFile(h.project).replace('<div id="app"></div>', `<div id="app"></div>\n<script type="application/json" id="hand-in">${scriptJson(h)}</script>`);

/** A challenge as a file: a small page with a button that opens it in the studio. */
export function challengeFile(c: Challenge): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${esc(c.title)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fffaeb;color:#3d2f10;font-family:ui-rounded,"Nunito",system-ui,sans-serif}main{max-width:30rem;margin:1rem;padding:1.5rem;border-radius:1.5rem;background:#ffffff;border:1.5px solid #f5e7bd}h1{margin:.2rem 0 .6rem}a{display:inline-block;margin-top:1rem;padding:.8rem 1.4rem;border-radius:999px;background:#f5b700;color:#3d2f10;font-weight:800;text-decoration:none}li{margin:.3rem 0}</style>
</head>
<body>
<main>
<small>A Game Lab challenge${c.teacher ? ` from ${esc(c.teacher)}` : ""}</small>
<h1>${esc(c.title)}</h1>
${c.intro ? `<p>${esc(c.intro)}</p>` : ""}
<ol>${c.steps.map((s) => `<li>${esc(s.text)}</li>`).join("")}</ol>
<a href="${esc(joinLink(c))}">Start in DecentralSchool</a>
</main>
<script type="application/json" id="challenge">${scriptJson(c)}</script>
</body>
</html>
`;
}

/**
 * The class gallery: one page with every approved game, playable offline. The game
 * player is stored once; each game's page is put together when it is opened.
 */
export function galleryFile(title: string, items: HandIn[]): string {
  const marker = "__DS_RUNTIME__";
  const games = items.map((h) => ({
    title: h.project.title,
    student: h.student,
    thumb: svgUrl(iconSvg(h.project)),
    page: buildCodePage(marker, h.project, compileProject(h.project)),
  }));
  const runtime = codeRuntime.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<style>
:root{color-scheme:light dark;--bg:#fffaeb;--paper:#ffffff;--line:#f5e7bd;--ink:#3d2f10;--ink2:#614d22;--accent:#f5b700}
@media (prefers-color-scheme:dark){:root{--bg:#1c1810;--paper:#28221a;--line:#3e3424;--ink:#fbf3dd;--ink2:#dccfad;--accent:#f2a900}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:ui-rounded,"Nunito",system-ui,sans-serif}
header{padding:max(1rem,env(safe-area-inset-top)) 1rem .5rem;max-width:60rem;margin:0 auto}h1{margin:.2rem 0}header p{margin:0;color:var(--ink2)}
ul{list-style:none;margin:0 auto;padding:1rem;max-width:60rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(10rem,1fr));gap:.8rem}
button.card{width:100%;display:flex;flex-direction:column;gap:.3rem;padding:.6rem;border-radius:1.2rem;border:1.5px solid var(--line);background:var(--paper);color:inherit;font:inherit;text-align:left;cursor:pointer}
.card img{width:100%;aspect-ratio:1;object-fit:contain;border-radius:.8rem;background:var(--bg)}.card strong{font-size:1rem}.card small{color:var(--ink2);font-weight:700}
.play{position:fixed;inset:0;display:none;flex-direction:column;background:#1c1810;z-index:9}.play.on{display:flex}.play iframe{flex:1;border:0;width:100%}
.close{position:absolute;top:max(.5rem,env(safe-area-inset-top));right:.5rem;z-index:1;width:3rem;height:3rem;border-radius:50%;border:0;background:#fff;color:#3d2f10;font-size:1.3rem;font-weight:800;cursor:pointer}
</style>
</head>
<body>
<header><small>Class gallery</small><h1>${esc(title)}</h1><p>${games.length} game${games.length === 1 ? "" : "s"} made by the class</p></header>
<ul id="list"></ul>
<div class="play" id="play"><button class="close" id="close" aria-label="Back to the gallery">✕</button></div>
<script type="text/plain" id="runtime">${runtime}</script>
<script type="application/json" id="games">${scriptJson(games)}</script>
<script>
(function () {
  var games = JSON.parse(document.getElementById("games").textContent);
  var runtime = document.getElementById("runtime").textContent;
  var list = document.getElementById("list"), play = document.getElementById("play");
  games.forEach(function (g) {
    var li = document.createElement("li"), b = document.createElement("button");
    b.className = "card";
    var img = document.createElement("img"); img.src = g.thumb; img.alt = "";
    var t = document.createElement("strong"); t.textContent = g.title;
    var s = document.createElement("small"); s.textContent = g.student;
    b.append(img, t, s);
    b.onclick = function () {
      var f = document.createElement("iframe");
      f.setAttribute("sandbox", "allow-scripts");
      f.title = g.title;
      f.srcdoc = g.page.split(${JSON.stringify(marker)}).join(runtime);
      play.appendChild(f);
      play.classList.add("on");
    };
    li.appendChild(b); list.appendChild(li);
  });
  document.getElementById("close").onclick = function () {
    var f = play.querySelector("iframe"); if (f) f.remove();
    play.classList.remove("on");
  };
})();
</script>
</body>
</html>
`;
}

export const thumbOf = (h: HandIn) => svgUrl(costumeSvg(h.project.sprites[0]?.costumes[h.project.sprites[0].costume] || h.project.stage.costumes[h.project.stage.costume]));
