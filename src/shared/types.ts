/**
 * The game format. A game is one JSON object; the student player turns it into a
 * fresh, shuffled round every time it starts. The same object travels in a link,
 * inside a downloaded .html file, and inside an APK.
 */

export type Template = "quiz" | "math" | "grammar" | "vocab" | "reading" | "custom";
export type Tint = "lilac" | "sky" | "peach" | "mint" | "lemon" | "sage" | "rose" | "sand";
export type UiLang = "en" | "hi" | "fr" | "es";

export interface Settings {
  /** Questions per round. The bank can be bigger; each round draws from it. */
  round: number;
  /** Seconds per question, 0 = no timer. */
  timer: number;
  /** Hearts per round, 0 = unlimited. */
  lives: number;
  /** Show the right answer straight after each question. */
  instant: boolean;
  /** Prefer questions this phone hasn't seen yet. */
  fresh: boolean;
  /** Voice for read-aloud, e.g. "en-GB". */
  speech: string;
  /** Language of the player's own buttons. */
  ui: UiLang;
  sound: boolean;
}

export interface AppInfo {
  /** Android application id. A different id installs as a separate app. */
  id: string;
  version: string;
  versionCode: number;
}

interface Base {
  v: 1;
  id: string;
  title: string;
  subtitle?: string;
  emoji: string;
  tint: Tint;
  settings: Settings;
  app?: AppInfo;
  created: number;
  updated: number;
}

/* ---------- questions shared by quiz, reading and the custom question lists ---------- */

export type Question =
  | { type: "mcq"; q: string; options: string[]; answer: number; explain?: string }
  | { type: "tf"; q: string; answer: boolean; explain?: string }
  | { type: "short"; q: string; accept: string[]; explain?: string }
  | { type: "order"; q: string; items: string[]; explain?: string }
  | { type: "match"; q: string; pairs: [string, string][]; explain?: string };

export type QuestionType = Question["type"];

export interface QuizGame extends Base {
  template: "quiz";
  questions: Question[];
}

/* ---------- maths ---------- */

export type MathKind =
  | "add" | "sub" | "mul" | "div" | "mixed" | "missing" | "compare" | "integers"
  | "place" | "round" | "order-ops" | "frac-of" | "frac-add" | "frac-simplify"
  | "decimal" | "percent" | "linear" | "powers" | "area" | "time" | "word";

export interface MathSet {
  kind: MathKind;
  /** Smallest and largest operand. */
  min: number;
  max: number;
  /** Relative share of the round. */
  weight: number;
}

export interface MathGame extends Base {
  template: "math";
  sets: MathSet[];
  /** "type" shows a number pad, "choose" shows four answers. */
  answer: "type" | "choose";
  /** Teacher-written problems mixed in with the generated ones. */
  questions: Question[];
}

/* ---------- grammar ---------- */

export type GrammarItem =
  /** One wrong word in a sentence: tap it, then fix it. */
  | { type: "fix"; text: string; wrong: string; right: string; options?: string[]; explain?: string }
  /** Fill the ___ gap from options; answer is the index of the right one. */
  | { type: "gap"; text: string; options: string[]; answer: number; explain?: string }
  /** Is this sentence correct? */
  | { type: "judge"; text: string; correct: boolean; fix?: string; explain?: string }
  /** Put the words back in order. */
  | { type: "unscramble"; text: string; explain?: string };

export interface GrammarGame extends Base {
  template: "grammar";
  items: GrammarItem[];
}

/* ---------- vocabulary ---------- */

export interface Word {
  word: string;
  meaning: string;
  example?: string;
  emoji?: string;
  opposite?: string;
  translation?: string;
}

export type VocabMode = "meaning" | "word" | "gap" | "spell" | "listen" | "opposite" | "translate" | "pairs";

export interface VocabGame extends Base {
  template: "vocab";
  words: Word[];
  modes: VocabMode[];
}

/* ---------- reading ---------- */

export interface Passage {
  title: string;
  text: string;
  /** Comprehension questions about this passage. */
  questions: Question[];
  /** Words worth learning, with meanings; they become vocabulary questions. */
  glossary: Word[];
}

export type ReadingActivity = "questions" | "cloze" | "sequence" | "glossary" | "truefalse";

export interface ReadingGame extends Base {
  template: "reading";
  passages: Passage[];
  activities: ReadingActivity[];
}

/* ---------- free-form (assistant-written) ---------- */

export interface CustomGame extends Base {
  template: "custom";
  /** A complete, self-contained HTML document. It runs with the network switched off. */
  html: string;
}

export type Game = QuizGame | MathGame | GrammarGame | VocabGame | ReadingGame | CustomGame;
