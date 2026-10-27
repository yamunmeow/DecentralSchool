import { normalize } from "../../shared/normalize";
import { uid } from "../../shared/random";
import type { CustomGame, Game } from "../../shared/types";

/**
 * Finished games that ship with the studio (public/library/, made by
 * scripts/import-games.mjs). Each plays as it is, and each can be copied into the
 * studio as an editable quick game or as its own HTML.
 */

export interface LibraryGame {
  id: string;
  title: string;
  blurb: string;
  by: string;
  tags: string[];
  /** Has a content.json beside index.html. */
  content?: boolean;
  templates: { file: string; label: string }[];
}

export const LIBRARY: LibraryGame[] = [
  {
    id: "word-quest",
    title: "Word Quest",
    blurb: "144 English words in 12 packs. Listen, choose, complete the sentence and spell.",
    by: "CAEB English class, Porto-Novo",
    tags: ["English", "Vocabulary", "A1–A2"],
    content: true,
    templates: [{ file: "template.json", label: "Vocabulary game" }],
  },
  {
    id: "reading-quest",
    title: "Reading Quest",
    blurb: "26 short, funny stories to read aloud, then answer, in English or French.",
    by: "CAEB English class, Porto-Novo",
    tags: ["English", "Français", "Reading"],
    templates: [
      { file: "template.json", label: "Reading game (English)" },
      { file: "template-fr.json", label: "Reading game (français)" },
    ],
  },
  {
    id: "math-quest",
    title: "Math Quest",
    blurb: "Times tables from 1 to 9, a quick quest or all 81, with a report to print.",
    by: "CAEB, Porto-Novo",
    tags: ["Maths", "Times tables"],
    templates: [{ file: "template.json", label: "Maths game" }],
  },
];

export const libraryUrl = (g: LibraryGame, file = "index.html") => `/library/${g.id}/${file}`;

/** An editable copy of a library game as a quick game. */
export async function fromLibrary(g: LibraryGame, file: string): Promise<Game> {
  const res = await fetch(libraryUrl(g, file));
  if (!res.ok) throw new Error("Couldn't load that game.");
  return normalize(await res.json(), { id: uid() });
}

/**
 * The game as one HTML file. A content.json is folded in, answered from memory when
 * the page asks for it, so the file also opens offline and from disk.
 */
export async function singleFile(g: LibraryGame): Promise<string> {
  const html = await fetch(libraryUrl(g)).then((r) => r.text());
  if (!g.content) return html;
  const content = await fetch(libraryUrl(g, "content.json")).then((r) => r.text());
  const safe = content.replace(/</g, "\\u003c");
  const shim = `<script>(function(){var c=${safe};var f=window.fetch;window.fetch=function(u,o){return /(^|\\/)content\\.json(\\?|$)/.test(String(u))?Promise.resolve(new Response(JSON.stringify(c),{headers:{"Content-Type":"application/json"}})):f.call(window,u,o)}})();</script>`;
  return html.replace(/<head[^>]*>/i, (m) => m + shim);
}

/** The original game as a custom (own HTML) quick game. */
export async function asCustom(g: LibraryGame): Promise<Game> {
  const game: Partial<CustomGame> = { template: "custom", title: g.title, subtitle: g.blurb, emoji: "🎮", tint: "sky", html: await singleFile(g) };
  return normalize(game, { id: uid() });
}
