import type { Game, Question } from "../shared/types";

/**
 * A game's content in formats other tools read: CSV for spreadsheets, and GIFT for
 * Moodle and the other learning platforms that import it. Generated maths problems
 * are made fresh each round, so only the teacher's own questions travel.
 */

export function questionsOf(game: Game): Question[] {
  if (game.template === "quiz" || game.template === "math") return game.questions;
  if (game.template === "reading") return game.passages.flatMap((p) => p.questions);
  return [];
}

const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const rows = (r: unknown[][]) => r.map((x) => x.map(cell).join(",")).join("\r\n") + "\r\n";

export function toCsv(game: Game): string | null {
  if (game.template === "vocab") return rows([["word", "meaning", "example", "emoji", "opposite", "translation"], ...game.words.map((w) => [w.word, w.meaning, w.example, w.emoji, w.opposite, w.translation])]);
  if (game.template === "grammar")
    return rows([
      ["type", "sentence", "answer", "options", "explain"],
      ...game.items.map((g) =>
        g.type === "fix" ? [g.type, g.text, `${g.wrong} → ${g.right}`, (g.options || []).join(" | "), g.explain] : g.type === "gap" ? [g.type, g.text, g.options[g.answer], g.options.join(" | "), g.explain] : g.type === "judge" ? [g.type, g.text, g.correct ? "correct" : g.fix || "wrong", "", g.explain] : [g.type, g.text, g.text, "", g.explain],
      ),
    ]);
  const qs = questionsOf(game);
  if (!qs.length) return null;
  return rows([
    ["type", "question", "answer", "other options", "explain"],
    ...qs.map((q) => {
      switch (q.type) {
        case "mcq":
          return [q.type, q.q, q.options[q.answer], q.options.filter((_, i) => i !== q.answer).join(" | "), q.explain];
        case "tf":
          return [q.type, q.q, q.answer ? "true" : "false", "", q.explain];
        case "short":
          return [q.type, q.q, q.accept.join(" | "), "", q.explain];
        case "order":
          return [q.type, q.q, q.items.join(" | "), "", q.explain];
        case "match":
          return [q.type, q.q, q.pairs.map(([a, b]) => `${a} = ${b}`).join(" | "), "", q.explain];
      }
    }),
  ]);
}

const gift = (s: string) => s.replace(/([~=#{}:\\])/g, "\\$1").replace(/\n/g, "\\n");

export function toGift(game: Game): string | null {
  const qs = questionsOf(game).filter((q) => q.type !== "order");
  if (!qs.length) return null;
  const out = [`// ${game.title}`, `$CATEGORY: ${gift(game.title)}`, ""];
  qs.forEach((q, i) => {
    const fb = q.explain ? ` #${gift(q.explain)}` : "";
    const name = `::${i + 1}::`;
    if (q.type === "mcq") out.push(`${name}${gift(q.q)} {${q.options.map((o, j) => `${j === q.answer ? "=" : "~"}${gift(o)}`).join(" ")}${fb}}`);
    else if (q.type === "tf") out.push(`${name}${gift(q.q)} {${q.answer ? "TRUE" : "FALSE"}${fb}}`);
    else if (q.type === "short") out.push(`${name}${gift(q.q)} {${q.accept.map((a) => `=${gift(a)}`).join(" ")}${fb}}`);
    else if (q.type === "match") out.push(`${name}${gift(q.q)} {${q.pairs.map(([a, b]) => `=${gift(a)} -> ${gift(b)}`).join(" ")}}`);
    out.push("");
  });
  return out.join("\n");
}
