import { isNumber, toNumber } from "./text";
import type { EpochStats, LineModel, Row, Shape, TrainSettings } from "./types";

/**
 * Zo draws a line (or a curve) through the points by gradient descent: guess,
 * measure how far off the guesses are, nudge, repeat. x is squeezed into −1…1 and
 * y into "how many spreads from the middle", so one learning speed suits any data.
 */

export interface Point {
  x: number;
  y: number;
}

export const pointsOf = (rows: Row[]): Point[] => rows.filter((r) => isNumber(r.text) && isNumber(r.label)).map((r) => ({ x: toNumber(r.text), y: toNumber(r.label) }));

const RATE = { slow: 0.01, medium: 0.05, fast: 0.25 };
const STEPS = 25;
const WIDTH = 0.14;

function basis(m: Pick<LineModel, "shape" | "centres">, s: number): number[] {
  if (m.shape === "straight") return [1, s];
  if (m.shape === "curve") return [1, s, s * s];
  return [1, s, ...m.centres.map((c) => Math.exp(-(((s - c) / WIDTH) ** 2)))];
}

const scaleX = (m: LineModel, x: number) => (m.xMax === m.xMin ? 0 : (2 * (x - m.xMin)) / (m.xMax - m.xMin) - 1);

export function predictLine(m: LineModel, x: number): number {
  const f = basis(m, scaleX(m, x));
  return (f.reduce((s, v, i) => s + v * m.w[i], 0) * m.yStd) + m.yMean;
}

export class LineTrainer {
  private readonly m: LineModel;
  private readonly train: { f: number[]; t: number }[];
  private readonly test: { f: number[]; t: number }[];
  private readonly mom: number[];
  private readonly vel: number[];
  private t = 0;
  private epochs = 0;

  constructor(
    trainPoints: Point[],
    testPoints: Point[],
    private readonly settings: TrainSettings,
  ) {
    const xs = trainPoints.map((p) => p.x);
    const ys = trainPoints.map((p) => p.y);
    const yMean = ys.reduce((a, b) => a + b, 0) / (ys.length || 1);
    const yStd = Math.sqrt(ys.reduce((a, b) => a + (b - yMean) ** 2, 0) / (ys.length || 1)) || 1;
    const shape: Shape = settings.shape;
    const centres = shape === "wiggly" ? Array.from({ length: 12 }, (_, i) => -1 + (2 * i) / 11) : [];
    this.m = { kind: "line", shape, xMin: Math.min(...xs), xMax: Math.max(...xs), yMean, yStd, centres, w: [] };
    this.m.w = basis(this.m, 0).map(() => 0);
    const prep = (ps: Point[]) => ps.map((p) => ({ f: basis(this.m, scaleX(this.m, p.x)), t: (p.y - yMean) / yStd }));
    this.train = prep(trainPoints);
    this.test = prep(testPoints);
    this.mom = this.m.w.map(() => 0);
    this.vel = this.m.w.map(() => 0);
  }

  start(): EpochStats {
    return { epoch: 0, ...this.measure() };
  }

  epoch(): EpochStats {
    const rate = RATE[this.settings.speed];
    const l2 = this.settings.simple ? 0.02 : 0;
    const w = this.m.w;
    for (let step = 0; step < STEPS && this.train.length; step++) {
      const g = w.map(() => 0);
      for (const { f, t } of this.train) {
        const err = f.reduce((s, v, i) => s + v * w[i], 0) - t;
        for (let i = 0; i < w.length; i++) g[i] += (2 * err * f[i]) / this.train.length;
      }
      for (let i = 1; i < w.length; i++) g[i] += 2 * l2 * w[i];
      // Adam: keeps a running average of the slope, so Zo doesn't zig-zag.
      this.t++;
      for (let i = 0; i < w.length; i++) {
        this.mom[i] = 0.9 * this.mom[i] + 0.1 * g[i];
        this.vel[i] = 0.999 * this.vel[i] + 0.001 * g[i] * g[i];
        const mh = this.mom[i] / (1 - 0.9 ** this.t);
        const vh = this.vel[i] / (1 - 0.999 ** this.t);
        w[i] -= (rate * mh) / (Math.sqrt(vh) + 1e-8);
      }
    }
    return { epoch: ++this.epochs, ...this.measure() };
  }

  private measure() {
    const of = (set: { f: number[]; t: number }[]) => {
      if (!set.length) return { loss: NaN, score: NaN };
      const errs = set.map(({ f, t }) => f.reduce((a, v, i) => a + v * this.m.w[i], 0) - t);
      const mse = errs.reduce((s, e) => s + e * e, 0) / set.length;
      // Score: the average miss in the data's own units, which is easier to read than the loss.
      return { loss: mse, score: (errs.reduce((s, e) => s + Math.abs(e), 0) / set.length) * this.m.yStd };
    };
    const a = of(this.train);
    const b = of(this.test);
    return { trainLoss: a.loss, testLoss: b.loss, trainScore: a.score, testScore: b.score };
  }

  model(): LineModel {
    return { ...this.m, w: this.m.w.map((x) => Math.round(x * 1e5) / 1e5) };
  }
}

/** How much of the spread in y the line explains (1 = all of it, 0 = no better than the average). */
export function explained(m: LineModel, points: Point[]): number {
  if (points.length < 2) return NaN;
  const mean = points.reduce((s, p) => s + p.y, 0) / points.length;
  const total = points.reduce((s, p) => s + (p.y - mean) ** 2, 0);
  const left = points.reduce((s, p) => s + (p.y - predictLine(m, p.x)) ** 2, 0);
  return total ? 1 - left / total : NaN;
}
