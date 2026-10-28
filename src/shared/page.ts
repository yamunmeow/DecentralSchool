/** The parts of a game the page itself needs (kept import-free so vite.config.ts can load this file). */
interface PageGame {
  title: string;
  emoji: string;
  settings: { ui: string };
}

/**
 * The student page: one HTML document with the player inlined. With a game it is the
 * file teachers download and the page inside the APK; without one it is the hosted
 * player at /p/, which reads the game from the link's #fragment.
 *
 * The Content-Security-Policy switches the network off: no request can leave the
 * page, so nothing a student does is sent anywhere.
 */
const policy = (hosted: boolean) =>
  [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    `img-src ${hosted ? "'self' " : ""}data: blob:`,
    "media-src data: blob:",
    "font-src data:",
    "frame-src blob: data:",
    ...(hosted ? ["worker-src 'self'", "manifest-src 'self'"] : []),
  ].join("; ");

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** JSON that is safe inside <script>: no "</script>" or "<!--" can appear. */
export const scriptJson = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

export function buildPage(runtime: string, game: PageGame | null, opts: { hosted?: boolean } = {}): string {
  const title = game ? `${game.emoji} ${game.title}` : "DecentralSchool";
  const head = opts.hosted
    ? `<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png">`
    : "";
  return `<!doctype html>
<html lang="${game?.settings.ui || "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${policy(!!opts.hosted)}">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#fffaeb">
${head}<title>${escapeHtml(title)}</title>
</head>
<body>
<div id="app"></div>
${game ? `<script type="application/json" id="game">${scriptJson(game)}</script>\n` : ""}<script>${runtime.replace(/<\/script/gi, "<\\/script")}</script>
</body>
</html>
`;
}

/**
 * A Game Lab project as one page: the runtime, the project (so the file can be
 * reopened in the studio) and its compiled scripts. Network stays off; sounds and
 * costumes are generated in the page (blob:/data: URLs). The hosted page has no
 * project and compiles one from the link, so only it allows eval.
 */
export function buildCodePage(runtime: string, project: { title: string } | null, code: string, opts: { hosted?: boolean; lang?: string } = {}): string {
  const csp = [
    "default-src 'none'",
    `script-src 'unsafe-inline'${opts.hosted ? " 'unsafe-eval'" : ""}`,
    "style-src 'unsafe-inline'",
    `img-src ${opts.hosted ? "'self' " : ""}data: blob:`,
    "media-src data: blob:",
    "connect-src data: blob:",
    "font-src data:",
    ...(opts.hosted ? ["worker-src 'self'", "manifest-src 'self'"] : []),
  ].join("; ");
  const title = project ? project.title : "DecentralSchool Game Lab";
  // The player's buttons follow this; the hosted page leaves it to the device's language.
  return `<!doctype html>
<html lang="${opts.hosted ? "" : opts.lang || "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#1c1810">
<meta name="generator" content="DecentralSchool Game Lab">
${opts.hosted ? `<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png">` : ""}<title>${escapeHtml(title)}</title>
</head>
<body>
<div id="app"></div>
${project ? `<script type="application/json" id="project">${scriptJson(project)}</script>\n` : ""}<script>${runtime.replace(/<\/script/gi, "<\\/script")}</script>
${project ? `<script>DecentralCode.run(function (L) {\n${code.replace(/<\/script/gi, "<\\/script")}\n});</script>\n` : ""}</body>
</html>
`;
}

/** A trained Zo (Zo Wants to Learn) as one page. Network off, like the others. */
export function buildLearnPage(runtime: string, app: { title: string }, lang = "en"): string {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${policy(false)}">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#fffaeb">
<meta name="generator" content="DecentralSchool: Zo Wants to Learn">
<title>${escapeHtml(app.title)}</title>
</head>
<body>
<div id="app"></div>
<script type="application/json" id="zo-app">${scriptJson(app)}</script>
<script>${runtime.replace(/<\/script/gi, "<\\/script")}</script>
</body>
</html>
`;
}
