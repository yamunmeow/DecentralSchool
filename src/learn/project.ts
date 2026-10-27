import { uid } from "../shared/random";
import { ClassifierTrainer, judge } from "./classifier";
import type { Example } from "./examples";
import { explained, LineTrainer, pointsOf } from "./regression";
import { split } from "./split";
import type { EpochStats, LearnMode, LearnProject, Model, Row, TrainSettings } from "./types";
import { WriterTrainer } from "./writer";

export const DEFAULT_SETTINGS: TrainSettings = { epochs: 30, speed: "medium", features: "words", simple: false, context: 2, shape: "straight" };

export function newLearnProject(mode: LearnMode, title: string, rows: [string, string][] = [], columns: [string, string] = ["x", "y"]): LearnProject {
  const now = Date.now();
  return {
    kind: "learn",
    v: 1,
    id: uid(),
    title,
    mode,
    rows: rows.map(([text, label]) => ({ id: uid(), text, label })),
    columns,
    testShare: 0.25,
    seed: Math.floor(Math.random() * 1e9),
    settings: { ...DEFAULT_SETTINGS, features: mode === "reply" ? "both" : "words" },
    runs: [],
    card: { by: "", goodAt: "", badAt: "" },
    badges: [],
    quiz: {},
    created: now,
    updated: now,
  };
}

export const fromExample = (e: Example) => ({ ...newLearnProject(e.mode, e.title, e.rows, e.columns), example: e.id });

export interface Trainer {
  rounds: number;
  start(): EpochStats;
  epoch(): EpochStats;
  model(): Model;
}

export function makeTrainer(p: LearnProject): Trainer {
  const { train, test } = split(p.rows, p.mode, p.testShare, p.seed);
  if (p.mode === "write") {
    const t = new WriterTrainer(train, test, p.settings);
    return { rounds: t.rounds, start: () => t.start(), epoch: () => t.epoch(), model: () => t.model() };
  }
  if (p.mode === "predict") {
    const t = new LineTrainer(pointsOf(train), pointsOf(test), p.settings);
    return { rounds: p.settings.epochs, start: () => t.start(), epoch: () => t.epoch(), model: () => t.model() };
  }
  const t = new ClassifierTrainer(train, test, p.settings, p.seed);
  return { rounds: p.settings.epochs, start: () => t.start(), epoch: () => t.epoch(), model: () => t.model() };
}

export const splitOf = (p: LearnProject) => split(p.rows, p.mode, p.testShare, p.seed);

/** Is the model out of date (the data or the split changed since it was trained)? */
export const stale = (p: LearnProject) => !!p.model && (!p.trainedOn || p.trainedOn.rows !== usableRows(p.rows, p.mode).length || p.trainedOn.seed !== p.seed || p.trainedOn.testShare !== p.testShare);

export const usableRows = (rows: Row[], mode: LearnMode) => rows.filter((r) => r.text.trim() && (mode === "write" || r.label.trim()));

/** The headline result on the test, with whether it is good enough to graduate. */
export function testResult(p: LearnProject): { value: number; text: string; pass: boolean } | null {
  const m = p.model;
  if (!m) return null;
  const { test } = splitOf(p);
  if (m.kind === "classifier") {
    if (!test.length) return null;
    const right = judge(m, test).filter((j) => j.right).length / test.length;
    return { value: right, text: `${Math.round(right * 100)}%`, pass: right >= 0.75 };
  }
  if (m.kind === "line") {
    const r2 = explained(m, pointsOf(test));
    if (!isFinite(r2)) return null;
    return { value: r2, text: `${Math.round(Math.max(0, r2) * 100)}%`, pass: r2 >= 0.7 };
  }
  const last = p.runs[0]?.stats.at(-1);
  if (!last || !isFinite(last.testLoss)) return null;
  const blind = Math.log2(m.vocab + 1);
  const better = 1 - last.testLoss / blind;
  return { value: better, text: `${Math.round(better * 100)}%`, pass: better >= 0.2 };
}
