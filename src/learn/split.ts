import { normalise, seeded, shuffled } from "./text";
import type { LearnMode, Row } from "./types";

export interface Split {
  train: Row[];
  test: Row[];
}

/**
 * Practice and test sets. In sort and reply each label is split on its own, so the
 * test has a fair share of every kind (a label with one example stays in practice).
 */
export function split(rows: Row[], mode: LearnMode, share: number, seed: number): Split {
  const rnd = seeded(seed);
  const usable = rows.filter((r) => r.text.trim() && (mode === "write" || r.label.trim()));
  if (mode === "write" || mode === "predict") {
    const all = shuffled(usable, rnd);
    const n = Math.min(all.length - 1, Math.round(all.length * share));
    return { test: all.slice(0, Math.max(0, n)), train: all.slice(Math.max(0, n)) };
  }
  const groups = new Map<string, Row[]>();
  for (const r of usable) {
    const k = normalise(r.label);
    groups.set(k, [...(groups.get(k) || []), r]);
  }
  const train: Row[] = [];
  const test: Row[] = [];
  let carry = 0;
  for (const [, g] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    const list = shuffled(g, rnd);
    const want = list.length * share + carry;
    const n = Math.min(list.length - 1, Math.floor(want));
    carry = want - Math.max(0, n);
    test.push(...list.slice(0, Math.max(0, n)));
    train.push(...list.slice(Math.max(0, n)));
  }
  return { train: shuffled(train, rnd), test: shuffled(test, rnd) };
}
