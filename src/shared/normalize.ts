import { MATH_KINDS } from "./math";
import { uid } from "./random";
import type {
  Game, GrammarItem, MathKind, MathSet, Passage, Question, ReadingActivity, Settings, Template, Tint, UiLang, VocabMode, Word,
} from "./types";

/**
 * Turns anything that looks roughly like a game (an assistant's reply, an old link,
 * a hand-edited file) into a valid Game. Unknown fields are dropped, missing ones
 * get defaults, and broken questions are skipped rather than failing the whole game.
 */

export const TEMPLATES: Template[] = ["quiz", "math", "grammar", "vocab", "reading", "custom"];
export const TINTS: Tint[] = ["lilac", "sky", "peach", "mint", "lemon", "sage", "rose", "sand"];
export const UI_LANGS: UiLang[] = ["en", "hi", "fr", "es"];
export const VOCAB_MODES: VocabMode[] = ["meaning", "word", "gap", "spell", "listen", "opposite", "translate", "pairs"];
export const READING_ACTIVITIES: ReadingActivity[] = ["questions", "cloze", "sequence", "truefalse", "glossary"];

export const DEFAULT_SETTINGS: Settings = { round: 10, timer: 0, lives: 0, instant: true, fresh: true, speech: "en-GB", ui: "en", sound: true };

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === "object" && x !== null && !Array.isArray(x);
const str = (x: unknown, fallback = ""): string => (typeof x === "string" ? x : typeof x === "number" ? String(x) : fallback);
const opt = (x: unknown): string | undefined => {
  const s = str(x).trim();
  return s ? s : undefined;
};
const num = (x: unknown, fallback: number, min = -Infinity, max = Infinity): number => {
  const n = typeof x === "number" ? x : typeof x === "string" && x.trim() !== "" ? Number(x) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const bool = (x: unknown, fallback: boolean): boolean =>
  typeof x === "boolean" ? x : x === "true" ? true : x === "false" ? false : fallback;
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const strs = (x: unknown): string[] => arr(x).map((v) => str(v).trim()).filter(Boolean);
const oneOf = <T extends string>(x: unknown, list: readonly T[], fallback: T): T => (list.includes(x as T) ? (x as T) : fallback);

export function question(x: unknown): Question | null {
  if (!isObj(x)) return null;
  const q = str(x.q ?? x.question ?? x.prompt).trim();
  const explain = opt(x.explain ?? x.explanation);
  const type = str(x.type).toLowerCase();
  if (type === "tf" || type === "truefalse" || type === "true_false" || (typeof x.answer === "boolean" && !x.options)) {
    return q ? { type: "tf", q, answer: bool(x.answer, true), explain } : null;
  }
  if (type === "short" || type === "text" || (!x.options && (x.accept || typeof x.answer === "string" || typeof x.answer === "number"))) {
    const accept = strs(x.accept).length ? strs(x.accept) : strs([x.answer]);
    return q && accept.length ? { type: "short", q, accept, explain } : null;
  }
  if (type === "order" || type === "sequence") {
    const items = strs(x.items);
    return items.length >= 2 ? { type: "order", q, items, explain } : null;
  }
  if (type === "match" || type === "pairs") {
    const pairs = arr(x.pairs)
      .map((p) => (Array.isArray(p) ? [str(p[0]).trim(), str(p[1]).trim()] : isObj(p) ? [str(p.left ?? p.a).trim(), str(p.right ?? p.b).trim()] : ["", ""]))
      .filter(([a, b]) => a && b) as [string, string][];
    return pairs.length >= 2 ? { type: "match", q, pairs, explain } : null;
  }
  const options = strs(x.options ?? x.choices);
  if (!q || options.length < 2) return null;
  let answer = typeof x.answer === "number" ? x.answer : options.findIndex((o) => o === str(x.answer).trim());
  if (answer < 0 || answer >= options.length) answer = 0;
  return { type: "mcq", q, options, answer, explain };
}

const questions = (x: unknown) => arr(x).map(question).filter((q): q is Question => !!q);

export function word(x: unknown): Word | null {
  if (!isObj(x)) return null;
  const w = str(x.word ?? x.term).trim();
  const meaning = str(x.meaning ?? x.definition).trim();
  if (!w || !meaning) return null;
  return { word: w, meaning, example: opt(x.example), emoji: opt(x.emoji), opposite: opt(x.opposite ?? x.antonym), translation: opt(x.translation) };
}

const words = (x: unknown) => arr(x).map(word).filter((w): w is Word => !!w);

export function grammarItem(x: unknown): GrammarItem | null {
  if (!isObj(x)) return null;
  const text = str(x.text ?? x.sentence).trim();
  const explain = opt(x.explain ?? x.explanation);
  if (!text) return null;
  switch (str(x.type).toLowerCase()) {
    case "fix": {
      const wrong = str(x.wrong).trim(), right = str(x.right).trim();
      return wrong && right ? { type: "fix", text, wrong, right, options: strs(x.options), explain } : null;
    }
    case "gap": {
      const options = strs(x.options);
      if (options.length < 2) return null;
      let answer = typeof x.answer === "number" ? x.answer : options.indexOf(str(x.answer).trim());
      if (answer < 0 || answer >= options.length) answer = 0;
      return { type: "gap", text, options, answer, explain };
    }
    case "judge":
      return { type: "judge", text, correct: bool(x.correct, true), fix: opt(x.fix), explain };
    case "unscramble":
      return { type: "unscramble", text, explain };
  }
  return null;
}

function mathSet(x: unknown): MathSet | null {
  if (!isObj(x)) return null;
  const kind = str(x.kind) as MathKind;
  if (!(kind in MATH_KINDS)) return null;
  const [lo, hi] = MATH_KINDS[kind].defaults;
  return { kind, min: num(x.min, lo, -1e6, 1e6), max: num(x.max, hi, -1e6, 1e6), weight: num(x.weight, 1, 0, 10) };
}

function passage(x: unknown): Passage | null {
  if (!isObj(x)) return null;
  const text = str(x.text).trim();
  if (!text) return null;
  return { title: str(x.title).trim(), text, questions: questions(x.questions), glossary: words(x.glossary) };
}

export function settings(x: unknown): Settings {
  const s = isObj(x) ? x : {};
  const d = DEFAULT_SETTINGS;
  return {
    round: Math.round(num(s.round, d.round, 1, 100)),
    timer: Math.round(num(s.timer, d.timer, 0, 600)),
    lives: Math.round(num(s.lives, d.lives, 0, 10)),
    instant: bool(s.instant, d.instant),
    fresh: bool(s.fresh, d.fresh),
    speech: str(s.speech, d.speech).trim() || d.speech,
    ui: oneOf(s.ui, UI_LANGS, d.ui),
    sound: bool(s.sound, d.sound),
  };
}

export function normalize(input: unknown, keep?: Partial<Pick<Game, "id" | "created" | "app">>): Game {
  const x = isObj(input) ? input : {};
  const template = oneOf(x.template, TEMPLATES, "quiz");
  const now = Date.now();
  const app = isObj(x.app)
    ? { id: str(x.app.id).trim(), version: str(x.app.version, "1.0").trim() || "1.0", versionCode: Math.round(num(x.app.versionCode, 1, 1, 2100000000)) }
    : undefined;
  const base = {
    v: 1 as const,
    id: keep?.id || str(x.id).trim() || uid(),
    title: str(x.title).trim() || "Untitled game",
    subtitle: opt(x.subtitle),
    emoji: str(x.emoji).trim() || "🎲",
    tint: oneOf(x.tint, TINTS, "lilac"),
    settings: settings(x.settings),
    app: keep?.app ?? (app?.id ? app : undefined),
    created: keep?.created || num(x.created, now),
    updated: num(x.updated, now),
  };
  switch (template) {
    case "quiz":
      return { ...base, template, questions: questions(x.questions) };
    case "math":
      return {
        ...base,
        template,
        sets: arr(x.sets).map(mathSet).filter((s): s is MathSet => !!s),
        answer: x.answer === "choose" ? "choose" : "type",
        questions: questions(x.questions),
      };
    case "grammar":
      return { ...base, template, items: arr(x.items).map(grammarItem).filter((g): g is GrammarItem => !!g) };
    case "vocab": {
      const modes = strs(x.modes).filter((m): m is VocabMode => VOCAB_MODES.includes(m as VocabMode));
      return { ...base, template, words: words(x.words), modes: modes.length ? modes : ["meaning", "word", "gap", "spell"] };
    }
    case "reading": {
      const acts = strs(x.activities).filter((a): a is ReadingActivity => READING_ACTIVITIES.includes(a as ReadingActivity));
      return { ...base, template, passages: arr(x.passages).map(passage).filter((p): p is Passage => !!p), activities: acts.length ? acts : ["questions", "cloze", "sequence"] };
    }
    case "custom":
      return { ...base, template, html: str(x.html) };
  }
}
