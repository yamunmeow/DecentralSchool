import { MATH_KINDS } from "../../shared/math";
import { normalize } from "../../shared/normalize";
import { uid } from "../../shared/random";
import type { Game, GrammarItem, MathKind, MathSet, Question, Template, UiLang, Word } from "../../shared/types";
import { t, tn } from "../i18n";
import { splitPassages, wordCount } from "../importText";

/**
 * A lesson plan or worksheet, read without AI: which kind of game it makes best (maths,
 * a story to read, grammar practice, vocabulary or a quiz) and the content for each,
 * found with patterns teachers commonly write: numbered questions with a) b) c)
 * options and an answer key, "word – meaning" lists, gap sentences with (go/goes),
 * correct/incorrect sentence pairs, sums like "12 × 4 =", and paragraphs of prose.
 */

export type LessonKind = Extract<Template, "quiz" | "math" | "grammar" | "vocab" | "reading">;

export interface Lesson {
  title: string;
  lang: { ui: UiLang; speech: string };
  questions: Question[];
  /** Questions whose right answer wasn't marked (the first option is used until the teacher ticks one). */
  unmarked: number;
  words: Word[];
  grammar: GrammarItem[];
  /** Sums found in the text, with the answer worked out. */
  sums: Question[];
  mathSets: MathSet[];
  story: string;
  scores: Record<LessonKind, number>;
  best: LessonKind;
}

// English; shown through t().
export const KIND_LABEL: Record<LessonKind, string> = { quiz: "Quiz", math: "Maths", grammar: "Grammar", vocab: "Vocabulary", reading: "Story to read" };

/* ---------- lines ---------- */

const NUMBERING = /^\s*(?:q(?:uestion)?\s*)?(\d{1,3}|[ivx]{1,4})\s*[.):\-–]\s+/i;
const OPTION = /^\s*[([]?([a-eA-E])[)\].:]\s+(.+)$/;
const ANSWER_LINE = /^\s*(?:answer|ans|correct(?: answer)?|réponse|respuesta|key)\s*[:\-–=]\s*(.+)$/i;
const MARK = /\s*(?:\*|✓|✔|\(correct\)|\[correct\])\s*$/i;

function linesOf(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const strip = (l: string) => l.replace(NUMBERING, "").trim();
const isHeading = (l: string) => l.length < 70 && !/[.?!:;]$/.test(l) && !OPTION.test(l) && wordCount(l) <= 9;

/* ---------- language ---------- */

function language(text: string): Lesson["lang"] {
  if (/[ऀ-ॿ]/.test(text)) return { ui: "hi", speech: "hi-IN" };
  const words = text.toLowerCase().match(/\p{L}+/gu) || [];
  const count = (list: string[]) => words.filter((w) => list.includes(w)).length;
  const fr = count(["le", "la", "les", "et", "est", "une", "des", "du", "dans", "avec", "pour", "il", "elle"]);
  const es = count(["el", "los", "las", "y", "es", "una", "del", "con", "para", "por", "que"]);
  const en = count(["the", "and", "is", "a", "of", "to", "in", "with", "for", "he", "she", "they"]);
  if (fr > en && fr > es) return { ui: "fr", speech: "fr-FR" };
  if (es > en && es > fr) return { ui: "es", speech: "es-ES" };
  return { ui: "en", speech: "en-GB" };
}

/* ---------- quiz questions ---------- */

/** An answer key such as "1. b  2. c" or "1-b, 2-a" (often at the end of a worksheet). */
function answerKey(lines: string[]): Map<number, string> {
  const key = new Map<number, string>();
  const at = lines.findIndex((l) => /^(answers?|answer key|key|corrigé|réponses|soluciones)\b/i.test(l));
  const zone = at >= 0 ? lines.slice(at) : lines.slice(-6);
  for (const l of zone) for (const m of l.matchAll(/(\d{1,3})\s*[.)\-–:]\s*([a-eA-E])\b/g)) key.set(Number(m[1]), m[2].toLowerCase());
  return key;
}

function quiz(lines: string[]): { questions: Question[]; unmarked: number } {
  const key = answerKey(lines);
  const out: Question[] = [];
  let unmarked = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (OPTION.test(line) || ANSWER_LINE.test(line)) continue;
    const number = Number(line.match(NUMBERING)?.[1]) || out.length + 1;
    let q = strip(line);

    // Options on the same line: "Which…? (a) Mars (b) Venus (c) Earth"
    const inline = q.match(/^(.*?\?)\s*((?:[([]?[a-eA-E][)\].]\s*[^()[\]]+?\s*){2,5})$/);
    let options: { text: string; marked: boolean }[] = [];
    let j = i + 1;
    if (inline) {
      q = inline[1].trim();
      options = inline[2].split(/[([]?[a-eA-E][)\].]\s*/).map((o) => o.trim()).filter(Boolean).map((o) => ({ text: o.replace(MARK, ""), marked: MARK.test(o) }));
    } else
      for (; j < lines.length && options.length < 6; j++) {
        const m = lines[j].match(OPTION);
        if (!m) break;
        options.push({ text: m[2].replace(MARK, "").trim(), marked: MARK.test(m[2]) });
      }
    const after = lines[j]?.match(ANSWER_LINE)?.[1]?.trim();

    if (options.length >= 2) {
      let answer = options.findIndex((o) => o.marked);
      const letter = (after?.match(/^[(]?([a-eA-E])\b/)?.[1] || key.get(number) || "").toLowerCase();
      if (answer < 0 && letter) answer = letter.charCodeAt(0) - 97;
      if (answer < 0 && after) answer = options.findIndex((o) => o.text.toLowerCase() === after.toLowerCase());
      if (answer < 0 || answer >= options.length) {
        answer = 0;
        unmarked++;
      }
      out.push({ type: "mcq", q, options: options.map((o) => o.text), answer });
      i = after ? j : j - 1;
      continue;
    }

    // True or false: "True or false: The Sun is a star. — True"
    const tf = q.match(/^(?:true or false|t\/f|vrai ou faux)\s*[:\-–]?\s*(.+?)(?:\s*[-–—(]\s*(true|false|vrai|faux)\)?)?$/i);
    if (tf) {
      const ans = (tf[2] || after || "").toLowerCase();
      if (/^(true|false|vrai|faux)/.test(ans)) {
        out.push({ type: "tf", q: tf[1].trim(), answer: /^(true|vrai)/.test(ans) });
        if (after) i = j;
        continue;
      }
    }

    // Question then answer: "Q: …?  A: …", "…? Answer: …", "…? — …"
    const qa = q.match(/^(?:q\s*[:.]\s*)?(.+\?)\s*(?:(?:a|answer|ans)\s*[:.\-–]\s*|[-–—]\s+)(.+)$/i);
    const nextA = lines[i + 1]?.match(/^(?:a|answer|ans)\s*[:.\-–]\s*(.+)$/i)?.[1];
    if (qa) out.push({ type: "short", q: qa[1].replace(/^q\s*[:.]\s*/i, "").trim(), accept: [qa[2].trim()] });
    else if (/\?$/.test(q) && (nextA || after)) {
      out.push({ type: "short", q: q.replace(/^q\s*[:.]\s*/i, ""), accept: [(nextA || after)!.trim()] });
      i++;
    }
  }
  return { questions: out, unmarked };
}

/* ---------- vocabulary ---------- */

function vocabulary(lines: string[]): Word[] {
  const out: Word[] = [];
  for (const l of lines) {
    const m = strip(l).match(/^([\p{L}'’ -]{2,30}?)\s*(?:\((?:n|v|adj|adv|noun|verb|adjective|adverb)\.?\)\s*)?(?:[-–—:=]|\s\|\s)\s*(.{3,120})$/u);
    if (!m) continue;
    const [, word, meaning] = m;
    if (wordCount(word) > 3 || /\d/.test(meaning) || /\?$/.test(meaning) || /^(answers?|questions?|name|date|class|objectives?|aims?|time|level|subject|topic|title|key ?words|vocabulary|glossary|words|lesson|unit|theme|correct|incorrect|wrong|right|mistake|choose|note|homework|materials?)$/i.test(word.trim())) continue;
    const [def, example] = meaning.split(/\s*(?:e\.g\.|example:|ex:)\s*/i);
    out.push({ word: word.trim(), meaning: def.trim().replace(/[.;]$/, ""), ...(example ? { example: example.trim() } : {}) });
  }
  return out;
}

/* ---------- grammar ---------- */

const GRAMMAR_WORDS = /\b(tense|verbs?|nouns?|adjectives?|adverbs?|pronouns?|articles?|prepositions?|plurals?|singular|grammar|conjugat\w*|past simple|simple past|present (?:simple|continuous|perfect)|passive|conditional|modal|comparatives?|superlatives?|conjonction|verbes?|temps|grammaire|conjugaison|passé composé|imparfait|futur|présent|accords?|pluriels?|singulier|noms?|adjectifs?|pronoms?|déterminants?)\b/giu;

function grammar(lines: string[]): GrammarItem[] {
  const out: GrammarItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = strip(lines[i]);
    // "She ___ (go / goes) to school." or "She … to school. (go, goes, going)"
    const choice = l.match(/\(([^()]+?[/,|][^()]+?)\)/);
    if (/_{2,}|\.{3,}|…/.test(l) && choice) {
      const options = choice[1].split(/\s*[/,|]\s*/).map((o) => o.replace(MARK, "").trim()).filter(Boolean);
      if (options.length >= 2 && options.length <= 5) {
        const marked = choice[1].split(/\s*[/,|]\s*/).findIndex((o) => MARK.test(o));
        const text = l.replace(choice[0], "").replace(/\.{3,}|…|_{2,}/, "___").replace(/\s+/g, " ").trim();
        out.push({ type: "gap", text, options, answer: Math.max(0, marked) });
        continue;
      }
    }
    // A wrong sentence followed by its correction: becomes "tap the mistake and fix it".
    const wrong = l.match(/^(?:incorrect|wrong|mistake|faux)\s*[:\-–]\s*(.+)$/i);
    const right = lines[i + 1] && strip(lines[i + 1]).match(/^(?:correct(?:ed|ion)?|right|corrigé)\s*[:\-–]\s*(.+)$/i);
    if (wrong && right) {
      const fix = diff(wrong[1], right[1]);
      out.push(fix ? { type: "fix", text: wrong[1], wrong: fix[0], right: fix[1] } : { type: "judge", text: wrong[1], correct: false, fix: right[1] });
      i++;
      continue;
    }
    // "Put the words in order: school / to / goes / she" with the sentence on the next line.
    const order = l.match(/^(?:put the words in order|unscramble|reorder|remets les mots dans l'ordre|remettez les mots dans l'ordre|mets les mots dans l'ordre)\b.*?[:\-–]\s*(.*)$/i);
    if (order) {
      const answer = lines[i + 1] && strip(lines[i + 1]).match(/^(?:answer|ans|correct|réponse)\s*[:\-–]\s*(.+)$/i)?.[1];
      if (answer) {
        out.push({ type: "unscramble", text: answer });
        i++;
      }
    }
  }
  return out;
}

/** The one differing run of words between a wrong and a right sentence. */
function diff(a: string, b: string): [string, string] | null {
  const x = a.split(/\s+/);
  const y = b.split(/\s+/);
  let s = 0;
  while (s < x.length && s < y.length && x[s] === y[s]) s++;
  let e = 0;
  while (e < x.length - s && e < y.length - s && x[x.length - 1 - e] === y[y.length - 1 - e]) e++;
  const w = x.slice(s, x.length - e).join(" ");
  const r = y.slice(s, y.length - e).join(" ");
  return w && r && wordCount(w) <= 3 ? [w.replace(/[.,!?]$/, ""), r.replace(/[.,!?]$/, "")] : null;
}

/** Short, complete example sentences, to unscramble when a text is about grammar. */
function exampleSentences(lines: string[]): GrammarItem[] {
  return lines
    .map(strip)
    .filter((l) => /^[\p{Lu}"“]/u.test(l) && /[.!?]$/.test(l) && wordCount(l) >= 4 && wordCount(l) <= 10 && !/_{2,}|\(|\d|:/.test(l))
    .slice(0, 20)
    .map((text) => ({ type: "unscramble" as const, text }));
}

/* ---------- maths ---------- */

const KIND_WORDS: [MathKind, RegExp][] = [
  ["mul", /\b(multipl\w*|times tables?|tables de multiplication|product|produit|×)|\d\s*[x×*]\s*\d/i],
  ["div", /\b(divi\w*|quotient|share equally|partage\w*|÷)|\d\s*÷\s*\d/i],
  ["add", /\b(addition|add|sum|somme|plus|total)\b|\d\s*\+\s*\d/i],
  ["sub", /\b(subtract\w*|soustraction|minus|moins|difference|différence|take away)\b|\d\s*[−-]\s*\d/i],
  ["frac-add", /\b(fractions?|numerator|numérateur|denominator|dénominateur)\b|\b\d+\/\d+\b/i],
  ["decimal", /\b(decimals?|décima\w*)\b|\d[.,]\d/i],
  ["percent", /\b(percent\w*|pourcentage)\b|%/i],
  ["linear", /\b(equations?|équations?|solve for|résous|algebra|algèbre)\b|\d?x\s*[+−-]\s*\d+\s*=/i],
  ["area", /\b(area|aire|perimeter|périmètre|rectangle|square metres?|cm²|m²)\b/i],
  ["time", /\b(o'clock|half past|quarter (?:past|to)|clock|minutes? (?:past|to)|heures? et (?:demie|quart)|moins le quart|horloge|lire l'heure)\b/i],
  ["place", /\b(place value|valeur de position|hundreds|centaines|thousands|milliers|tens and ones|dizaines et unités)\b/i],
  ["round", /\b(round(?:ing)? (?:to|off)|nearest (?:ten|hundred|thousand)|arrondi\w*)\b/i],
  ["integers", /\b(negative numbers?|nombres négatifs|integers?|entiers relatifs)\b/i],
  ["powers", /\b(squares?|cubes?|square roots?|powers?)\b|²|√/i],
  ["word", /\b(how many|how much|altogether|left over|each)\b/i],
];

/** "12 + 7 =", "8 × 6 = ?", "45 ÷ 5": the sum, with its answer worked out. */
function sums(lines: string[]): Question[] {
  const out: Question[] = [];
  const seen = new Set<string>();
  for (const l of lines)
    for (const m of l.matchAll(/(\d+(?:\.\d+)?)\s*([+\-−×x*÷/])\s*(\d+(?:\.\d+)?)(?:\s*([+\-−×x*÷/])\s*(\d+(?:\.\d+)?))?\s*=\s*(?:\?|_+|\.{2,}|…|\(\s*\)|$)/g)) {
      const nums = [m[1], m[3], m[5]].filter(Boolean).map(Number);
      const ops = [m[2], m[4]].filter(Boolean).map((o) => ({ x: "×", "*": "×", "/": "÷", "-": "−" })[o] || o);
      const value = evaluate(nums, ops);
      if (value === null) continue;
      const q = `${nums.map((n, i) => (i ? ` ${ops[i - 1]} ${n}` : String(n))).join("")} = ?`;
      if (seen.has(q)) continue;
      seen.add(q);
      out.push({ type: "short", q, accept: [String(Math.round(value * 1000) / 1000)] });
    }
  return out;
}

function evaluate(nums: number[], ops: string[]): number | null {
  // × and ÷ first, then + and −.
  const n = [...nums];
  const o = [...ops];
  for (let i = 0; i < o.length; ) {
    if (o[i] === "×" || o[i] === "÷") {
      if (o[i] === "÷" && n[i + 1] === 0) return null;
      n.splice(i, 2, o[i] === "×" ? n[i] * n[i + 1] : n[i] / n[i + 1]);
      o.splice(i, 1);
    } else i++;
  }
  let v = n[0];
  for (let i = 0; i < o.length; i++) v = o[i] === "+" ? v + n[i + 1] : v - n[i + 1];
  return Number.isFinite(v) ? v : null;
}

function mathSets(text: string): { sets: MathSet[]; hits: number } {
  const numbers = (text.match(/\b\d{1,5}\b/g) || []).map(Number).filter((n) => n > 0);
  let hits = 0;
  const sets: MathSet[] = [];
  for (const [kind, re] of KIND_WORDS) {
    const found = (text.match(new RegExp(re.source, "gi")) || []).length;
    if (!found) continue;
    hits += found;
    const [lo, hi] = MATH_KINDS[kind].defaults;
    // Times tables and division take the tables used in the text; others keep their sizes within reason.
    const relevant = kind === "mul" || kind === "div" ? numbers.filter((n) => n <= 12) : numbers;
    const min = relevant.length ? Math.max(lo, Math.min(...relevant)) : lo;
    const max = relevant.length ? Math.min(Math.max(hi, min), Math.max(...relevant)) : hi;
    sets.push({ kind, min: Math.min(min, max), max: Math.max(min, max), weight: Math.min(5, found) });
  }
  return { sets: sets.sort((a, b) => b.weight - a.weight).slice(0, 4), hits };
}

/* ---------- story ---------- */

/** The longest stretch of prose paragraphs (lesson plans wrap a story in objectives and notes). */
function story(text: string): string {
  const blocks = text.split(/\n\s*\n/).filter((p) => p.trim());
  // A block of numbered questions or a) b) options is an exercise, not prose.
  const exercise = (b: string) => b.split("\n").filter((l) => NUMBERING.test(l) || OPTION.test(l)).length >= 2;
  const paras = blocks.map((b) => (exercise(b) ? "" : b.replace(/\s+/g, " ").trim()));
  const prose = (p: string) => wordCount(p) >= 25 && (p.match(/[.!?]["”']?(\s|$)/g) || []).length >= 2 && !OPTION.test(p) && (p.match(/\d/g) || []).length / p.length < 0.04;
  let best: string[] = [];
  let cur: string[] = [];
  for (const p of paras) {
    if (prose(p)) cur.push(p);
    else if (cur.length) {
      if (wordCount(cur.join(" ")) > wordCount(best.join(" "))) best = cur;
      cur = [];
    }
  }
  if (wordCount(cur.join(" ")) > wordCount(best.join(" "))) best = cur;
  return best.join("\n\n");
}

/* ---------- reading it all ---------- */

export function readLesson(text: string, fileName: string): Lesson {
  const lines = linesOf(text);
  const { questions, unmarked } = quiz(lines);
  const words = vocabulary(lines);
  const grammarItems = grammar(lines);
  const grammarHits = (text.match(GRAMMAR_WORDS) || []).length;
  const found = sums(lines);
  const { sets, hits } = mathSets(text);
  const tale = story(text);
  const taleWords = wordCount(tale);
  const digits = (text.match(/\d/g) || []).length / Math.max(1, text.length);

  const grammar_ = grammarItems.length ? grammarItems : grammarHits >= 3 ? exampleSentences(lines) : [];
  const scores: Record<LessonKind, number> = {
    quiz: questions.length >= 2 ? questions.length * 2 + 2 : 0,
    vocab: words.length >= 4 ? words.length * 1.5 : 0,
    grammar: grammar_.length ? grammarItems.length * 2.5 + grammarHits + (grammarItems.length ? 0 : grammar_.length * 0.3) : 0,
    math: sets.length && (found.length || hits >= 3) ? found.length * 2 + hits * 1.2 + (digits > 0.06 ? 6 : 0) : 0,
    reading: taleWords >= 80 ? taleWords / 30 + (questions.length ? 3 : 0) + (words.length ? 1 : 0) : 0,
  };
  const best = (Object.keys(scores) as LessonKind[]).reduce((a, b) => (scores[b] > scores[a] ? b : a), "quiz");
  const first = lines.find(isHeading)?.replace(/^(?:lesson plan|lesson|worksheet|topic|title|unit \d+)\s*[:\-–]\s*/i, "").trim();
  return {
    title: (first && !/^(lesson plan|worksheet|name|date|class)\b/i.test(first) ? first : fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ")).slice(0, 60),
    lang: language(text),
    questions,
    unmarked,
    words,
    grammar: grammar_,
    sums: found,
    mathSets: sets,
    story: tale,
    scores,
    best: scores[best] > 0 ? best : taleWords >= 40 ? "reading" : "quiz",
  };
}

/** What can be made from this lesson, best first. */
export const kindsFor = (l: Lesson) => (Object.keys(l.scores) as LessonKind[]).filter((k) => l.scores[k] > 0).sort((a, b) => l.scores[b] - l.scores[a]);

/** The lesson as a game of one kind. `id` keeps the same game when switching kinds. */
export function lessonGame(l: Lesson, kind: LessonKind, id = uid()): Game {
  const settings = { round: 10, ui: l.lang.ui, speech: l.lang.speech };
  const base = { title: l.title, settings, emoji: { quiz: "❓", math: "➗", grammar: "✏️", vocab: "🔤", reading: "📖" }[kind], tint: ({ quiz: "lilac", math: "mint", grammar: "peach", vocab: "sky", reading: "sage" } as const)[kind] };
  switch (kind) {
    case "quiz":
      return normalize({ ...base, template: "quiz", questions: [...l.questions, ...l.sums] }, { id });
    case "math":
      return normalize({ ...base, template: "math", answer: "type", sets: l.mathSets.length ? l.mathSets : [{ kind: "add", min: 1, max: 20, weight: 1 }], questions: [...l.sums, ...l.questions.filter((q) => /\d/.test(q.q))] }, { id });
    case "grammar":
      return normalize({ ...base, template: "grammar", items: l.grammar }, { id });
    case "vocab":
      return normalize({ ...base, template: "vocab", words: l.words, modes: ["meaning", "word", "spell", "listen", ...(l.words.some((w) => w.example) ? ["gap"] : [])] }, { id });
    case "reading": {
      const passages = splitPassages(l.title, l.story || "");
      passages[0] = { ...passages[0], questions: l.questions, glossary: l.words };
      return normalize({ ...base, template: "reading", settings: { ...settings, round: 8 }, passages, activities: ["cloze", "sequence", "truefalse", ...(l.questions.length ? ["questions"] : []), ...(l.words.length ? ["glossary"] : [])] }, { id });
    }
  }
}

/** One line about what was found, for the teacher. */
export function foundSummary(l: Lesson, kind: LessonKind): string {
  const parts: string[] = [];
  if (kind === "reading" && l.story) parts.push(t("a text of {n} words", { n: wordCount(l.story) }));
  if ((kind === "quiz" || kind === "reading") && l.questions.length) parts.push(tn(l.questions.length, "{n} question", "{n} questions"));
  if ((kind === "quiz" || kind === "math") && l.sums.length) parts.push(tn(l.sums.length, "{n} sum", "{n} sums"));
  if (kind === "math" && l.mathSets.length) parts.push(l.mathSets.map((s) => t(MATH_KINDS[s.kind].label).toLowerCase()).join(", "));
  if ((kind === "vocab" || kind === "reading") && l.words.length) parts.push(tn(l.words.length, "{n} word with meanings", "{n} words with meanings"));
  if (kind === "grammar" && l.grammar.length) parts.push(tn(l.grammar.length, "{n} sentence", "{n} sentences"));
  return parts.join(" · ") || t("a starting point to fill in");
}
