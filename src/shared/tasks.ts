import { generate, inLowestTerms, sameTime, valueOf, withDistractors } from "./math";
import { pick, sample, shuffle, weighted } from "./random";
import type { Game, GrammarItem, Passage, Question, ReadingActivity, VocabMode, Word } from "./types";

interface TaskBase {
  /** Stable id of the source question, used to rotate through the bank. */
  key: string;
  prompt: string;
  /** Which instruction the player shows above the prompt (see the player's ASK strings). */
  ask?: Ask;
  big?: boolean;
  emoji?: string;
  /** Text the 🔊 button reads. With `listen`, the prompt stays hidden and is only heard. */
  speak?: string;
  listen?: boolean;
  explain?: string;
  /** Reading games: which passage to look back at. */
  passage?: number;
}

export type Ask = "judge" | "word-for" | "meaning-of" | "fill" | "spell" | "listen" | "opposite" | "translate" | "pairs" | "sequence" | "said" | "unscramble";

export type Pad = "number" | "fraction" | "time" | "text";

export type Task = TaskBase &
  (
    | { k: "choice"; options: string[]; answer: number }
    | { k: "tf"; answer: boolean }
    | { k: "type"; accept: string[]; pad: Pad; lowest?: boolean }
    | { k: "order"; items: string[]; join: "" | " " | "\n" }
    | { k: "match"; pairs: [string, string][] }
    | { k: "spot"; words: string[]; wrong: number; fix: string; options: string[] }
  );

export type Step = Task | { k: "read"; key: string; passage: number };

export interface RoundOptions {
  seen?: Set<string>;
  /** Only these keys (used for "practise my mistakes"). */
  only?: string[];
  /** Whether the device can speak; listening questions are swapped out otherwise. */
  canSpeak?: boolean;
}

interface Candidate {
  key: string;
  group?: string;
  make: () => Task | null;
}

/* ---------- text helpers ---------- */

export function norm(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/^[\s"'(]+|[\s"'.!?,;:)]+$/g, "")
    .trim();
}

export function sentences(text: string): string[] {
  const found = text.replace(/\s+/g, " ").match(/[^.!?।]+[.!?।]+["')\]]*|[^.!?।]+$/g) || [];
  return found.map((s) => s.trim()).filter((s) => s.length > 1);
}

const STOP = new Set(
  "the a an and or but if then than that this these those with from into onto over under about after before because while when where which who whom whose what there their they them were was are is be been being have has had does did doing will would could should shall might must can very just also only even much many more most some such each every other another your yours ours mine his hers its our for not nor yet too out off down here".split(" "),
);

function contentWords(text: string): string[] {
  const words = text.match(/[\p{L}][\p{L}\p{M}'-]*/gu) || [];
  return Array.from(new Set(words.filter((w) => w.length >= 4 && !STOP.has(w.toLowerCase()))));
}

/** Splits a sentence into tappable words, keeping `phrase` (if any) as one token. */
export function tokens(text: string, phrase?: string): { words: string[]; at: number } {
  const split = (s: string) => s.split(/\s+/).filter(Boolean);
  if (phrase) {
    const lower = text.toLowerCase();
    const p = phrase.toLowerCase().trim();
    let i = lower.indexOf(p);
    while (i >= 0) {
      const before = i === 0 || /[\s"'(]/.test(text[i - 1]);
      const after = i + p.length >= text.length || /[\s.,!?;:"')]/.test(text[i + p.length]);
      if (before && after) break;
      i = lower.indexOf(p, i + 1);
    }
    if (i >= 0) {
      let end = i + p.length;
      while (end < text.length && /[.,!?;:"')]/.test(text[end])) end++;
      const head = split(text.slice(0, i));
      return { words: [...head, text.slice(i, end), ...split(text.slice(end))], at: head.length };
    }
  }
  return { words: split(text), at: -1 };
}

const blank = (sentence: string, word: string) => {
  const re = new RegExp(`(^|[^\\p{L}\\p{M}])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[^\\p{L}\\p{M}]|$)`, "iu");
  return re.test(sentence) ? sentence.replace(re, "$1_____") : null;
};

/* ---------- question → task ---------- */

const KEEP_ORDER = /\b(all|none|both|neither) of (the )?(above|these)\b/i;

export function fromQuestion(q: Question, key: string, passage?: number): Task | null {
  const base = { key, prompt: q.q, explain: q.explain, passage };
  switch (q.type) {
    case "mcq": {
      const opts = q.options.map((o, i) => ({ o, i })).filter((x) => x.o.trim());
      if (opts.length < 2 || !q.options[q.answer]?.trim()) return null;
      const order = opts.some((x) => KEEP_ORDER.test(x.o)) ? opts : shuffle(opts);
      return { ...base, k: "choice", options: order.map((x) => x.o), answer: order.findIndex((x) => x.i === q.answer) };
    }
    case "tf":
      return { ...base, k: "tf", answer: q.answer };
    case "short": {
      const accept = q.accept.filter((a) => a.trim());
      if (!accept.length) return null;
      const numeric = accept.every((a) => !Number.isNaN(valueOf(a)));
      return { ...base, k: "type", accept, pad: numeric ? (accept.some((a) => a.includes("/")) ? "fraction" : "number") : "text" };
    }
    case "order": {
      const items = q.items.filter((x) => x.trim());
      return items.length < 2 ? null : { ...base, k: "order", items, join: "\n" };
    }
    case "match": {
      const pairs = q.pairs.filter(([a, b]) => a.trim() && b.trim());
      return pairs.length < 2 ? null : { ...base, k: "match", pairs };
    }
  }
}

/* ---------- per template ---------- */

function quizCandidates(questions: Question[], prefix = "q"): Candidate[] {
  return questions.map((q, i) => ({ key: `${prefix}${i}:${q.q.slice(0, 40)}`, make: () => fromQuestion(q, `${prefix}${i}:${q.q.slice(0, 40)}`) }));
}

function grammarTask(item: GrammarItem, key: string): Task | null {
  switch (item.type) {
    case "fix": {
      const { words, at } = tokens(item.text, item.wrong);
      if (at < 0) return null;
      const options = shuffle(Array.from(new Set([item.right, ...(item.options || [])].filter((o) => o.trim() && norm(o) !== norm(item.wrong)))));
      return { key, k: "spot", prompt: item.text, words, wrong: at, fix: item.right, options: options.length > 1 ? options : [], explain: item.explain };
    }
    case "gap": {
      if (item.options.length < 2 || !item.options[item.answer]) return null;
      const order = shuffle(item.options.map((o, i) => ({ o, i })));
      return { key, k: "choice", prompt: item.text.includes("_") ? item.text.replace(/_+/g, "_____") : `${item.text} _____`, options: order.map((x) => x.o), answer: order.findIndex((x) => x.i === item.answer), explain: item.explain };
    }
    case "judge":
      return { key, k: "tf", prompt: item.text, ask: "judge", answer: item.correct, explain: [item.fix && !item.correct ? `✓ ${item.fix}` : "", item.explain || ""].filter(Boolean).join("\n") || undefined };
    case "unscramble": {
      const words = item.text.split(/\s+/).filter(Boolean);
      return words.length < 2 ? null : { key, k: "order", prompt: "", ask: "unscramble", items: words, join: " ", explain: item.explain };
    }
  }
}

function vocabTask(mode: VocabMode, w: Word, words: Word[], key: string): Task | null {
  const others = (n: number, f: (x: Word) => string | undefined) =>
    sample(words, n, (x) => x === w || !f(x) || norm(f(x)!) === norm(f(w) || "")).map((x) => f(x)!);
  const choice = (prompt: string, right: string, wrong: string[], extra: Partial<TaskBase> = {}): Task | null => {
    if (wrong.length < 1) return null;
    const options = shuffle([right, ...wrong]);
    return { key, k: "choice", prompt, options, answer: options.indexOf(right), ...extra };
  };
  const tell = w.example ? `${w.word}: ${w.meaning}\n“${w.example}”` : `${w.word}: ${w.meaning}`;
  switch (mode) {
    case "meaning":
      return choice(w.meaning, w.word, others(3, (x) => x.word), { emoji: w.emoji, ask: "word-for", explain: tell });
    case "word":
      return choice(w.word, w.meaning, others(3, (x) => x.meaning), { big: true, emoji: w.emoji, speak: w.word, ask: "meaning-of", explain: w.example });
    case "gap": {
      const gap = w.example ? blank(w.example, w.word) : null;
      return gap ? choice(gap, w.word, others(3, (x) => x.word), { ask: "fill", explain: tell }) : null;
    }
    case "spell": {
      const letters = Array.from(w.word.trim());
      if (letters.length < 2) return null;
      if (letters.length > 12) return { key, k: "type", prompt: w.meaning, emoji: w.emoji, accept: [w.word], pad: "text", ask: "spell", speak: w.word, explain: tell };
      return { key, k: "order", prompt: w.meaning, emoji: w.emoji, items: letters, join: "", ask: "spell", speak: w.word, explain: tell };
    }
    case "listen":
      return choice(w.word, w.word, others(3, (x) => x.word), { listen: true, speak: w.word, ask: "listen", explain: tell });
    case "opposite":
      return w.opposite ? choice(w.word, w.opposite, others(3, (x) => x.word).filter((x) => norm(x) !== norm(w.opposite!)), { big: true, ask: "opposite", explain: `${w.word} ↔ ${w.opposite}` }) : null;
    case "translate":
      return w.translation ? choice(w.word, w.translation, others(3, (x) => x.translation), { big: true, speak: w.word, emoji: w.emoji, ask: "translate" }) : null;
    case "pairs":
      return null;
  }
}

function pairsTask(words: Word[], key: string): Task | null {
  const set = sample(words, 4);
  return set.length < 3 ? null : { key, k: "match", prompt: "", ask: "pairs", pairs: set.map((w) => [w.emoji ? `${w.emoji} ${w.word}` : w.word, w.meaning] as [string, string]) };
}

function vocabCandidates(words: Word[], modes: VocabMode[], canSpeak: boolean): Candidate[] {
  const usable = words.filter((w) => w.word.trim() && w.meaning.trim());
  const list: Candidate[] = [];
  for (const mode of modes) {
    if (mode === "pairs") {
      for (let i = 0; i < Math.ceil(usable.length / 4); i++) list.push({ key: `pairs:${i}`, make: () => pairsTask(usable, `pairs:${i}`) });
      continue;
    }
    const m: VocabMode = mode === "listen" && !canSpeak ? "word" : mode;
    for (const w of usable) {
      const key = `${mode}:${w.word}`;
      list.push({ key, group: w.word, make: () => vocabTask(m, w, usable, key) });
    }
  }
  return list;
}

/* ---------- reading ---------- */

function readingCandidates(p: Passage, index: number, activities: ReadingActivity[], canSpeak: boolean): Candidate[] {
  const out: Candidate[] = [];
  const lines = sentences(p.text);
  const vocab = contentWords(p.text);
  const at = `p${index}`;
  const tag = (t: Task | null) => (t ? { ...t, passage: index } : null);

  if (activities.includes("questions"))
    p.questions.forEach((q, i) => out.push({ key: `${at}:q${i}`, make: () => fromQuestion(q, `${at}:q${i}`, index) }));

  if (activities.includes("cloze"))
    lines.forEach((s, i) => {
      const words = contentWords(s);
      if (s.split(" ").length < 6 || !words.length) return;
      const key = `${at}:c${i}`;
      out.push({
        key,
        make: () => {
          const target = pick(words);
          const gap = blank(s, target);
          const pool = vocab.filter((w) => norm(w) !== norm(target) && !words.some((x) => norm(x) === norm(w)));
          const close = pool.sort((a, b) => Math.abs(a.length - target.length) - Math.abs(b.length - target.length)).slice(0, 8);
          const wrong = sample(close, 3);
          if (!gap || wrong.length < 2) return null;
          const options = shuffle([target, ...wrong]);
          return { key, k: "choice", prompt: gap, ask: "fill", options, answer: options.indexOf(target), passage: index, explain: s };
        },
      });
    });

  if (activities.includes("sequence") && lines.length >= 3)
    for (let i = 0; i + 3 <= lines.length; i += 3) {
      const key = `${at}:s${i}`;
      const run = lines.slice(i, i + Math.min(4, lines.length - i));
      out.push({ key, make: () => ({ key, k: "order", prompt: "", ask: "sequence", items: run, join: "\n", passage: index }) });
    }

  if (activities.includes("truefalse"))
    lines.forEach((s, i) => {
      const words = contentWords(s);
      if (s.split(" ").length < 5 || !words.length) return;
      const key = `${at}:t${i}`;
      out.push({
        key,
        make: () => {
          const others = vocab.filter((w) => !words.some((x) => norm(x) === norm(w)));
          if (Math.random() < 0.5 || !others.length) return { key, k: "tf", prompt: s, ask: "said", answer: true, passage: index };
          const target = pick(words);
          const swap = pick(others);
          const changed = blank(s, target)?.replace("_____", target[0] === target[0].toUpperCase() ? swap[0].toUpperCase() + swap.slice(1) : swap.toLowerCase());
          return changed ? { key, k: "tf", prompt: changed, ask: "said", answer: false, passage: index, explain: s } : null;
        },
      });
    });

  if (activities.includes("glossary") && p.glossary.length >= 2)
    for (const c of vocabCandidates(p.glossary, ["meaning", "word", "gap"], canSpeak))
      out.push({ key: `${at}:g:${c.key}`, group: c.group, make: () => tag(c.make()) });

  return out;
}

/* ---------- rounds ---------- */

/** Unseen first (shuffled), then the rest (shuffled); skip a second question about the same word. */
function choose(cands: Candidate[], n: number, seen?: Set<string>): Task[] {
  const fresh = shuffle(cands.filter((c) => !seen?.has(c.key)));
  const old = shuffle(cands.filter((c) => seen?.has(c.key)));
  const out: Task[] = [];
  const groups = new Set<string>();
  const leftovers: Candidate[] = [];
  for (const c of [...fresh, ...old]) {
    if (out.length >= n) break;
    if (c.group && groups.has(c.group)) {
      leftovers.push(c);
      continue;
    }
    const t = c.make();
    if (!t) continue;
    if (c.group) groups.add(c.group);
    out.push(t);
  }
  for (const c of leftovers) {
    if (out.length >= n) break;
    const t = c.make();
    if (t) out.push(t);
  }
  return out;
}

export function buildRound(game: Game, opts: RoundOptions = {}): Step[] {
  const n = Math.max(1, Math.min(100, game.settings.round || 10));
  const canSpeak = opts.canSpeak !== false;
  const filter = (c: Candidate[]) => (opts.only ? c.filter((x) => opts.only!.includes(x.key)) : c);
  const seen = game.settings.fresh ? opts.seen : undefined;

  switch (game.template) {
    case "quiz":
      return choose(filter(quizCandidates(game.questions)), n, seen);
    case "grammar":
      return choose(filter(game.items.map((it, i) => ({ key: `g${i}:${it.text.slice(0, 40)}`, make: () => grammarTask(it, `g${i}:${it.text.slice(0, 40)}`) }))), n, seen);
    case "vocab":
      return choose(filter(vocabCandidates(game.words, game.modes.length ? game.modes : ["meaning", "word"], canSpeak)), n, seen);
    case "math": {
      const own = filter(quizCandidates(game.questions, "m"));
      // Practising mistakes regenerates fresh problems of the kinds that went wrong.
      const sets = game.sets.filter((s) => s.weight > 0 && (!opts.only || opts.only.includes(`gen:${s.kind}`)));
      const mine = !sets.length ? choose(own, n, seen) : choose(own, opts.only ? own.length : Math.round(n / 3), seen);
      const made: Task[] = [];
      // Checking is by value, so a French decimal comma still counts.
      const decimals = (x: string) => (game.settings.ui === "fr" ? x.replace(/(\d)\.(\d)/g, "$1,$2") : x);
      const prompts = new Set<string>();
      for (let tries = 0; sets.length && made.length < n - mine.length && tries < n * 20; tries++) {
        const set = weighted(sets, (s) => s.weight)!;
        const p = generate(set, game.settings.ui);
        if (prompts.has(p.prompt)) continue;
        prompts.add(p.prompt);
        const key = `gen:${set.kind}`;
        if (game.answer === "choose" || p.choices) {
          const { options, answer } = withDistractors(p);
          made.push({ key, k: "choice", prompt: p.prompt, big: p.prompt.length < 24, options: options.map(decimals), answer, explain: p.explain });
        } else {
          made.push({ key, k: "type", prompt: p.prompt, big: p.prompt.length < 24, accept: [decimals(p.answer)], pad: p.pad, lowest: p.lowest, explain: p.explain });
        }
      }
      return shuffle([...mine, ...made]);
    }
    case "reading": {
      const passages = game.passages.map((p, i) => ({ p, i })).filter(({ p }) => p.text.trim());
      if (!passages.length) return [];
      const missed = opts.only?.map((k) => Number(/^p(\d+):/.exec(k)?.[1])).filter((x) => !Number.isNaN(x));
      const unread = missed ? passages.filter(({ i }) => missed.includes(i)) : passages.filter(({ i }) => !seen?.has(`read:${i}`));
      const { p, i } = pick(unread.length ? unread : passages);
      const acts: ReadingActivity[] = game.activities.length ? game.activities : ["questions", "cloze"];
      const cands = filter(readingCandidates(p, i, acts, canSpeak));
      // The teacher's own questions come first; automatic activities fill the rest.
      const own = cands.filter((c) => /:q\d+$/.test(c.key));
      const auto = cands.filter((c) => !/:q\d+$/.test(c.key));
      const picked = choose(own, n, seen);
      const rest = choose(auto, n - picked.length, seen);
      const tasks = [...picked, ...shuffle(rest)];
      return opts.only ? tasks : [{ k: "read", key: `read:${i}`, passage: i }, ...tasks];
    }
    case "custom":
      return [];
  }
}

/* ---------- checking ---------- */

export function checkTyped(task: Extract<Task, { k: "type" }>, given: string): boolean {
  if (!given.trim()) return false;
  if (task.pad === "time") return task.accept.some((a) => sameTime(a, given));
  if (task.pad === "number" || task.pad === "fraction") {
    const v = valueOf(given);
    if (Number.isNaN(v)) return task.accept.some((a) => norm(a) === norm(given));
    if (task.lowest && !inLowestTerms(given)) return false;
    return task.accept.some((a) => Math.abs(valueOf(a) - v) < 1e-9);
  }
  return task.accept.some((a) => norm(a) === norm(given));
}

export const orderAnswer = (task: Extract<Task, { k: "order" }>) => task.items.join(task.join === "\n" ? " | " : task.join);
