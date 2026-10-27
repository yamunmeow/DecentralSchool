/**
 * Zo Wants to Learn: a student teaches Zo from their own data. Every model here is
 * real and tiny (it trains in the browser in a moment), so the curves, scores and
 * mistakes the student sees are what actually happened.
 */

/** sort: text → a label. reply: a question → an answer. write: text → more text. predict: a number → a number. */
export type LearnMode = "sort" | "reply" | "write" | "predict";

/** One example. sort: text + label. reply: question + answer. write: a sentence (label unused). predict: x + y, kept as typed. */
export interface Row {
  id: string;
  text: string;
  label: string;
}

export type Features = "words" | "letters" | "both";
export type Speed = "slow" | "medium" | "fast";
/** predict: the shape of Zo's line. */
export type Shape = "straight" | "curve" | "wiggly";

export interface TrainSettings {
  epochs: number;
  speed: Speed;
  /** sort / reply: what Zo looks at in the text. */
  features: Features;
  /** sort / reply / predict: a penalty for big weights, so Zo can't simply memorise. */
  simple: boolean;
  /** write: how many words back Zo looks (1–3). */
  context: number;
  /** predict */
  shape: Shape;
}

/** One pass over the practice data. Loss and score for practice and test. */
export interface EpochStats {
  epoch: number;
  trainLoss: number;
  testLoss: number;
  /** sort / reply: share right (0–1). predict: average miss in y units. write: unused. */
  trainScore: number;
  testScore: number;
}

/** A finished training run, kept so runs can be compared. */
export interface RunLog {
  id: string;
  at: number;
  settings: TrainSettings;
  rows: number;
  stats: EpochStats[];
}

export interface ClassifierModel {
  kind: "classifier";
  labels: string[];
  vocab: string[];
  features: Features;
  /** [label][feature]; the last column is the bias. */
  w: number[][];
}

export interface LineModel {
  kind: "line";
  shape: Shape;
  xMin: number;
  xMax: number;
  yMean: number;
  yStd: number;
  /** Bump centres for the wiggly shape, in scaled x. */
  centres: number[];
  w: number[];
}

export interface WriterModel {
  kind: "writer";
  context: number;
  /** "ctx words joined by space" → next word → count, for each context length 0..context. */
  counts: Record<string, Record<string, number>>[];
  vocab: number;
}

export type Model = ClassifierModel | LineModel | WriterModel;

export interface ModelCard {
  by: string;
  goodAt: string;
  badAt: string;
}

export interface LearnProject {
  kind: "learn";
  v: 1;
  id: string;
  title: string;
  mode: LearnMode;
  rows: Row[];
  /** predict: names of the two columns. */
  columns: [string, string];
  /** Share of rows kept back for the test (0.1–0.5). */
  testShare: number;
  seed: number;
  settings: TrainSettings;
  runs: RunLog[];
  model?: Model;
  /** Row count and seed the model was trained on, to notice when the data changed since. */
  trainedOn?: { rows: number; seed: number; testShare: number };
  card: ModelCard;
  badges: string[];
  /** Quiz question id → the answer chosen. */
  quiz: Record<string, number>;
  /** Example dataset this came from, if any. */
  example?: string;
  created: number;
  updated: number;
}

/** What a saved Zo app carries: the trained model and its card, no training data. */
export interface LearnApp {
  kind: "learn-app";
  title: string;
  mode: LearnMode;
  model: Model;
  card: ModelCard;
  columns: [string, string];
  facts: { examples: number; score?: string; scoreName?: string; pass: boolean; trained: number };
}
