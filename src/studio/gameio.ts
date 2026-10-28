import { decodeGame } from "../shared/codec";
import { normalize } from "../shared/normalize";
import { uid } from "../shared/random";
import type { Game } from "../shared/types";
import { t, tn } from "./i18n";

/**
 * Games come back into the studio from anything we hand out: a student link, a
 * downloaded .html file, a single game's .json, or a full backup.
 */
export function gamesFromText(text: string): Game[] {
  const trimmed = text.trim();
  const hash = trimmed.indexOf("#g1.");
  if (hash >= 0) return [normalize(decodeGame(trimmed.slice(hash + 1).split(/\s/)[0]))];
  const embedded = trimmed.match(/<script type="application\/json" id="game">([\s\S]*?)<\/script>/);
  if (embedded) return [normalize(JSON.parse(embedded[1]))];
  const parsed = JSON.parse(trimmed);
  const list: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.games) ? parsed.games : [parsed];
  return list.map((g) => normalize(g));
}

/** Imported games keep their id (students' progress follows it) unless that id is already taken. */
export function forImport(game: Game, taken: (id: string) => boolean): Game {
  const now = Date.now();
  return taken(game.id) ? { ...game, id: uid(), title: t("{title} (copy)", { title: game.title }), created: now, updated: now, app: undefined } : { ...game, updated: now };
}

export function backup(games: Game[]): string {
  return JSON.stringify({ type: "decentralschool-backup", version: 1, saved: new Date().toISOString(), games }, null, 1);
}

export function summary(game: Game): string {
  switch (game.template) {
    case "quiz": return tn(game.questions.length, "{n} question", "{n} questions");
    case "math": return [tn(game.sets.length, "{n} problem type", "{n} problem types"), game.questions.length ? tn(game.questions.length, "{n} own problem", "{n} own problems") : ""].filter(Boolean).join(" · ");
    case "grammar": return tn(game.items.length, "{n} sentence", "{n} sentences");
    case "vocab": return tn(game.words.length, "{n} word", "{n} words");
    case "reading": return tn(game.passages.length, "{n} text", "{n} texts");
    case "custom": return game.html ? t("{n} KB of HTML", { n: Math.max(1, Math.round(game.html.length / 1024)) }) : t("Not built yet");
  }
}

export function duplicate(game: Game): Game {
  const now = Date.now();
  return { ...structuredClone(game), id: uid(), title: t("{title} (copy)", { title: game.title }), created: now, updated: now, app: undefined };
}
