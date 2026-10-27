import { normalise } from "./text";
import type { EpochStats, Row, TrainSettings, WriterModel } from "./types";

/**
 * A tiny language model: it counts which word comes after which one, two or three
 * words, and guesses the next word from those counts (Witten–Bell smoothing mixes
 * long and short contexts, so an unseen phrase still gets a guess). Its "loss" is
 * surprise in bits: how many yes/no questions the next word costs on average.
 */

const START = "^";
const TOKEN = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)*|[.,!?;:।]/gu;
const END = /^[.!?।]$/;

export function tokensOf(sentence: string): string[] {
  const t: string[] = normalise(sentence).match(TOKEN) || [];
  if (t.length && !END.test(t[t.length - 1])) t.push(".");
  return t;
}

function empty(context: number): WriterModel {
  return { kind: "writer", context, counts: Array.from({ length: context + 1 }, () => ({})), vocab: 0 };
}

/** Totals per context, cached (and dropped when a row grows): count of all followers and of different followers. */
const totals = new WeakMap<Record<string, number>, [number, number]>();

function add(m: WriterModel, tokens: string[]) {
  const seq = [...Array(m.context).fill(START), ...tokens];
  for (let i = m.context; i < seq.length; i++) {
    const w = seq[i];
    for (let k = 0; k <= m.context; k++) {
      const ctx = seq.slice(i - k, i).join(" ");
      const row = (m.counts[k][ctx] ??= {});
      totals.delete(row);
      if (k === 0 && !row[w]) m.vocab++;
      row[w] = (row[w] || 0) + 1;
    }
  }
}

function total(row: Record<string, number>): [number, number] {
  let t = totals.get(row);
  if (!t) {
    const vals = Object.values(row);
    t = [vals.reduce((a, b) => a + b, 0), vals.length];
    totals.set(row, t);
  }
  return t;
}

/** P(word | the words before it). */
export function prob(m: WriterModel, before: string[], w: string): number {
  let p = 1 / (m.vocab + 1);
  for (let k = 0; k <= m.context; k++) {
    if (k > before.length) break;
    const row = m.counts[k][before.slice(before.length - k).join(" ")];
    if (!row) break;
    const [n, u] = total(row);
    const lambda = n / (n + u);
    p = lambda * ((row[w] || 0) / n) + (1 - lambda) * p;
  }
  return p;
}

function bits(m: WriterModel, sentences: string[][]): number {
  let sum = 0;
  let n = 0;
  for (const tokens of sentences) {
    const seq = [...Array(m.context).fill(START), ...tokens];
    for (let i = m.context; i < seq.length; i++) {
      sum += -Math.log2(prob(m, seq.slice(0, i), seq[i]));
      n++;
    }
  }
  return n ? sum / n : NaN;
}

const PAGES = 10;

export class WriterTrainer {
  private readonly m: WriterModel;
  private readonly pages: string[][][];
  private readonly test: string[][];
  private read = 0;

  constructor(trainRows: Row[], testRows: Row[], settings: TrainSettings) {
    this.m = empty(Math.max(1, Math.min(3, settings.context)));
    const train = trainRows.map((r) => tokensOf(r.text)).filter((t) => t.length);
    const per = Math.max(1, Math.ceil(train.length / PAGES));
    this.pages = [];
    for (let i = 0; i < train.length; i += per) this.pages.push(train.slice(i, i + per));
    this.test = testRows.map((r) => tokensOf(r.text)).filter((t) => t.length);
  }

  /** How many pages there are to read; each counts as one round. */
  get rounds() {
    return this.pages.length;
  }

  start(): EpochStats {
    // Before reading anything every word is as likely as any other.
    return { epoch: 0, trainLoss: NaN, testLoss: NaN, trainScore: NaN, testScore: NaN };
  }

  epoch(): EpochStats {
    if (this.read < this.pages.length) for (const s of this.pages[this.read++]) add(this.m, s);
    return {
      epoch: this.read,
      trainLoss: bits(this.m, this.pages.slice(0, this.read).flat()),
      testLoss: bits(this.m, this.test),
      trainScore: this.m.vocab,
      testScore: NaN,
    };
  }

  model(): WriterModel {
    return this.m;
  }
}

/** The likeliest next words after `before`. */
export function nextWords(m: WriterModel, before: string[], n = 6): { word: string; p: number }[] {
  const ctx = [...Array(m.context).fill(START), ...before];
  return Object.keys(m.counts[0][""] || {})
    .map((word) => ({ word, p: prob(m, ctx, word) }))
    .sort((a, b) => b.p - a.p)
    .slice(0, n);
}

/** Write on from a prompt. Low temperature: always the safest word. High: surprises. */
export function generate(m: WriterModel, prompt: string, temperature: number, words: number, rnd: () => number = Math.random): string[] {
  // Not tokensOf: a prompt ends mid-sentence, so no full stop is added.
  const out: string[] = normalise(prompt).match(TOKEN) || [];
  const vocab = Object.keys(m.counts[0][""] || {});
  if (!vocab.length) return out;
  let made = 0;
  while (made < words) {
    const ctx = [...Array(m.context).fill(START), ...lastSentence(out)];
    const ps = vocab.map((w) => prob(m, ctx, w) ** (1 / Math.max(0.05, temperature)));
    const sum = ps.reduce((a, b) => a + b, 0);
    let r = rnd() * sum;
    let pick = vocab.length - 1;
    for (let i = 0; i < ps.length; i++) {
      r -= ps[i];
      if (r <= 0) {
        pick = i;
        break;
      }
    }
    out.push(vocab[pick]);
    made++;
    if (END.test(vocab[pick]) && made >= words * 0.6) break;
  }
  return out;
}

/** Words since the last full stop: a new sentence starts from scratch, as in training. */
function lastSentence(tokens: string[]): string[] {
  let i = tokens.length;
  while (i > 0 && !END.test(tokens[i - 1])) i--;
  return tokens.slice(i);
}

/** Tokens back into a sentence: punctuation hugs the word before; sentences start with a capital. */
export function detokenise(tokens: string[]): string {
  let out = "";
  let cap = true;
  for (const t of tokens) {
    const word = t === "i" ? "I" : cap ? t.charAt(0).toUpperCase() + t.slice(1) : t;
    out += /^[.,!?;:।]$/.test(t) || !out ? word : " " + word;
    cap = END.test(t);
  }
  return out;
}

/** Share of the written text's 4-word runs that were copied word for word from the training text. */
export function copiedShare(trainRows: Row[], tokens: string[]): number {
  const runs = new Set<string>();
  for (const r of trainRows) {
    const t = tokensOf(r.text);
    for (let i = 0; i + 4 <= t.length; i++) runs.add(t.slice(i, i + 4).join(" "));
  }
  let n = 0;
  let hit = 0;
  for (let i = 0; i + 4 <= tokens.length; i++) {
    n++;
    if (runs.has(tokens.slice(i, i + 4).join(" "))) hit++;
  }
  return n ? hit / n : 0;
}
