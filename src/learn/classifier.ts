import { featuresOf, letterGroups, normalise, seeded, shuffled, wordsOf } from "./text";
import type { ClassifierModel, EpochStats, Features, Row, TrainSettings } from "./types";

/**
 * Softmax regression: one weight per (label, feature), learned by stochastic gradient
 * descent. Small enough to explain, real enough to overfit.
 */

interface Vec {
  i: number[];
  v: number[];
}

const RATE = { slow: 0.08, medium: 0.6, fast: 4 };
const MAX_FEATURES = 4000;

function vectorise(text: string, kind: Features, index: Map<string, number>): Vec {
  const counts = new Map<number, number>();
  for (const f of featuresOf(text, kind)) {
    const k = index.get(f);
    if (k !== undefined) counts.set(k, (counts.get(k) || 0) + 1);
  }
  const i = [...counts.keys()];
  const v = i.map((k) => Math.log1p(counts.get(k)!));
  const norm = Math.hypot(...v) || 1;
  return { i, v: v.map((x) => x / norm) };
}

function softmax(z: number[]): number[] {
  const m = Math.max(...z);
  const e = z.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

function scores(w: number[][], x: Vec): number[] {
  return w.map((row) => {
    let s = row[row.length - 1];
    for (let k = 0; k < x.i.length; k++) s += row[x.i[k]] * x.v[k];
    return s;
  });
}

export class ClassifierTrainer {
  readonly labels: string[];
  readonly vocab: string[];
  private readonly index: Map<string, number>;
  private readonly w: number[][];
  private readonly train: { x: Vec; y: number }[];
  private readonly test: { x: Vec; y: number }[];
  private readonly rnd: () => number;
  private epochs = 0;

  constructor(
    trainRows: Row[],
    testRows: Row[],
    private readonly settings: TrainSettings,
    seed: number,
  ) {
    const byKey = new Map<string, string>();
    for (const r of trainRows) if (!byKey.has(normalise(r.label))) byKey.set(normalise(r.label), r.label.trim());
    this.labels = [...byKey.values()];
    const labelIndex = new Map([...byKey.keys()].map((k, i) => [k, i]));

    // Zo only knows the words (or letter groups) it met in practice: test words are new to it.
    const freq = new Map<string, number>();
    for (const r of trainRows) for (const f of new Set(featuresOf(r.text, settings.features))) freq.set(f, (freq.get(f) || 0) + 1);
    const minCount = settings.features === "words" ? 1 : 2;
    this.vocab = [...freq]
      .filter(([f, n]) => n >= minCount || f.startsWith("w:"))
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_FEATURES)
      .map(([f]) => f);
    this.index = new Map(this.vocab.map((f, i) => [f, i]));
    this.w = this.labels.map(() => new Array(this.vocab.length + 1).fill(0));
    const prep = (rows: Row[]) => rows.map((r) => ({ x: vectorise(r.text, settings.features, this.index), y: labelIndex.get(normalise(r.label)) ?? -1 }));
    this.train = prep(trainRows);
    this.test = prep(testRows);
    this.rnd = seeded(seed + 1);
  }

  /** Before any learning: every label equally likely. */
  start(): EpochStats {
    return { epoch: 0, ...this.measure() };
  }

  epoch(): EpochStats {
    const rate = RATE[this.settings.speed];
    const l2 = this.settings.simple ? 0.02 : 0;
    for (const { x, y } of shuffled(this.train, this.rnd)) {
      const p = softmax(scores(this.w, x));
      for (let c = 0; c < this.w.length; c++) {
        const g = p[c] - (c === y ? 1 : 0);
        const row = this.w[c];
        for (let k = 0; k < x.i.length; k++) row[x.i[k]] -= rate * (g * x.v[k] + l2 * row[x.i[k]]);
        row[row.length - 1] -= rate * g * 0.1;
      }
    }
    return { epoch: ++this.epochs, ...this.measure() };
  }

  private measure() {
    const of = (set: { x: Vec; y: number }[]) => {
      if (!set.length) return { loss: NaN, score: NaN };
      let loss = 0;
      let right = 0;
      for (const { x, y } of set) {
        const p = softmax(scores(this.w, x));
        loss += -Math.log(Math.max(1e-9, y >= 0 ? p[y] : 0));
        if (y >= 0 && p.indexOf(Math.max(...p)) === y) right++;
      }
      return { loss: loss / set.length, score: right / set.length };
    };
    const a = of(this.train);
    const b = of(this.test);
    return { trainLoss: a.loss, testLoss: b.loss, trainScore: a.score, testScore: b.score };
  }

  model(): ClassifierModel {
    return { kind: "classifier", labels: this.labels, vocab: this.vocab, features: this.settings.features, w: this.w.map((r) => r.map((x) => Math.round(x * 1e4) / 1e4)) };
  }
}

export interface Prediction {
  probs: { label: string; p: number }[];
  /** Each word of the text and how much it pushed Zo towards the top label (+) or away (−). */
  words: { word: string; push: number }[];
  /** Share of the text's features Zo has met before. */
  known: number;
}

export function predict(model: ClassifierModel, text: string): Prediction {
  const index = new Map(model.vocab.map((f, i) => [f, i]));
  const x = vectorise(text, model.features, index);
  const p = softmax(scores(model.w, x));
  const order = p.map((_, i) => i).sort((a, b) => p[b] - p[a]);
  const top = order[0];
  const weightOf = new Map(x.i.map((k, n) => [k, x.v[n]]));
  const push = (f: string) => {
    const k = index.get(f);
    if (k === undefined) return 0;
    const xv = weightOf.get(k) || 0;
    const mean = model.w.reduce((s, r) => s + r[k], 0) / model.w.length;
    return (model.w[top][k] - mean) * xv;
  };
  const all = featuresOf(text, model.features);
  return {
    probs: order.map((i) => ({ label: model.labels[i], p: p[i] })),
    words: wordsOf(text).map((word) => {
      let s = model.features === "letters" ? 0 : push("w:" + word);
      if (model.features !== "words") for (const g of new Set(letterGroups(word))) s += push("c:" + g);
      return { word, push: s };
    }),
    known: all.length ? all.filter((f) => index.has(f)).length / all.length : 0,
  };
}

/** The features that push hardest towards each label: what Zo "thinks" a label looks like. */
export function strongest(model: ClassifierModel, label: string, n = 8): { feature: string; weight: number }[] {
  const c = model.labels.indexOf(label);
  if (c < 0) return [];
  return model.vocab
    .map((feature, k) => ({ feature, weight: model.w[c][k] - model.w.reduce((s, r) => s + r[k], 0) / model.w.length }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, n);
}

/** Predicted label for every row, for the confusion table and the list of mistakes. */
export function judge(model: ClassifierModel, rows: Row[]) {
  return rows.map((r) => {
    const out = predict(model, r.text);
    return { row: r, guess: out.probs[0]?.label ?? "", p: out.probs[0]?.p ?? 0, right: normalise(out.probs[0]?.label ?? "") === normalise(r.label) };
  });
}
