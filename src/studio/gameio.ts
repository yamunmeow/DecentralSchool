import { decodeGame } from "../shared/codec";
import { normalize } from "../shared/normalize";
import { uid } from "../shared/random";
import type { Game } from "../shared/types";

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
  return taken(game.id) ? { ...game, id: uid(), title: `${game.title} (copy)`, created: now, updated: now, app: undefined } : { ...game, updated: now };
}

export function backup(games: Game[]): string {
  return JSON.stringify({ type: "decentralschool-backup", version: 1, saved: new Date().toISOString(), games }, null, 1);
}

export function summary(game: Game): string {
  const n = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
  switch (game.template) {
    case "quiz": return n(game.questions.length, "question");
    case "math": return [n(game.sets.length, "problem type"), game.questions.length ? n(game.questions.length, "own problem") : ""].filter(Boolean).join(" · ");
    case "grammar": return n(game.items.length, "sentence");
    case "vocab": return n(game.words.length, "word");
    case "reading": return n(game.passages.length, "text");
    case "custom": return game.html ? `${Math.max(1, Math.round(game.html.length / 1024))} KB of HTML` : "Not built yet";
  }
}

export function duplicate(game: Game): Game {
  const now = Date.now();
  return { ...structuredClone(game), id: uid(), title: `${game.title} (copy)`, created: now, updated: now, app: undefined };
}
