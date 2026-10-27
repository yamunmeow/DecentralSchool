import { distance, isNumber, normalise, rescueNumber, toNumber, wordsOf } from "./text";
import type { LearnMode, Row } from "./types";

/**
 * Data checks: each finds one kind of problem real data scientists look for, says
 * why it matters to Zo, and offers fixes. Fixes return new rows; nothing changes
 * until the student picks one.
 */

export type IssueKind =
  | "blank"
  | "spaces"
  | "duplicate"
  | "contradiction"
  | "label-variant"
  | "rare-label"
  | "imbalance"
  | "too-few"
  | "personal"
  | "link"
  | "junk"
  | "not-number"
  | "outlier"
  | "too-short";

export interface Fix {
  label: string;
  apply: (rows: Row[]) => Row[];
}

export interface Issue {
  id: string;
  kind: IssueKind;
  /** "fix": this will confuse Zo. "think": worth a look; maybe it's fine. */
  level: "fix" | "think";
  title: string;
  why: string;
  rows: string[];
  fixes: Fix[];
}

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const URL = /\b(?:https?:\/\/|www\.)\S+/gi;

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const without = (ids: Iterable<string>) => {
  const set = new Set(ids);
  return (rows: Row[]) => rows.filter((r) => !set.has(r.id));
};
const tidy = (s: string) => s.replace(/\s+/g, " ").trim();
const countBy = <T>(list: T[], key: (x: T) => string) => {
  const m = new Map<string, T[]>();
  for (const x of list) m.set(key(x), [...(m.get(key(x)) || []), x]);
  return m;
};

export function checkData(rows: Row[], mode: LearnMode): Issue[] {
  const issues: Issue[] = [];
  const labelled = mode !== "write";

  // Empty rows teach nothing, and an example without its label is a question without an answer.
  const blank = rows.filter((r) => !r.text.trim() || (labelled && !r.label.trim()));
  if (blank.length)
    issues.push({
      id: "blank",
      kind: "blank",
      level: "fix",
      title: `${plural(blank.length, "row")} with something missing`,
      why: labelled ? "An example without its answer (or an answer without its example) can't teach Zo anything." : "Empty lines are just noise.",
      rows: blank.map((r) => r.id),
      fixes: [{ label: "Remove them", apply: without(blank.map((r) => r.id)) }],
    });
  const filled = rows.filter((r) => !blank.includes(r));

  const spaced = filled.filter((r) => tidy(r.text) !== r.text || tidy(r.label) !== r.label);
  if (spaced.length)
    issues.push({
      id: "spaces",
      kind: "spaces",
      level: "fix",
      title: `${plural(spaced.length, "row")} with extra spaces`,
      why: "To a computer “happy ” and “happy” are different things. Tidying is the first job in every data project.",
      rows: spaced.map((r) => r.id),
      fixes: [{ label: "Tidy them", apply: (rs) => rs.map((r) => ({ ...r, text: tidy(r.text), label: tidy(r.label) })) }],
    });

  // Personal details have no place in training data: models can repeat what they saw.
  const personal = filled.filter((r) => r.text.match(EMAIL) || r.text.match(PHONE));
  if (personal.length && mode !== "predict")
    issues.push({
      id: "personal",
      kind: "personal",
      level: "fix",
      title: `${plural(personal.length, "row")} with an email or phone number`,
      why: "Models can remember and repeat what they were trained on. Keep people's details out.",
      rows: personal.map((r) => r.id),
      fixes: [
        { label: "Hide the details", apply: (rs) => rs.map((r) => (personal.includes(r) ? { ...r, text: r.text.replace(EMAIL, "[email]").replace(PHONE, "[phone]") } : r)) },
        { label: "Remove the rows", apply: without(personal.map((r) => r.id)) },
      ],
    });

  const linked = filled.filter((r) => r.text.match(URL));
  if (linked.length && mode !== "predict")
    issues.push({
      id: "link",
      kind: "link",
      level: "fix",
      title: `${plural(linked.length, "row")} with a web link`,
      why: "Links are long strings of letters that mean nothing to Zo; they only add noise.",
      rows: linked.map((r) => r.id),
      fixes: [{ label: "Take the links out", apply: (rs) => rs.map((r) => (linked.includes(r) ? { ...r, text: tidy(r.text.replace(URL, "")) } : r)) }],
    });

  if (mode !== "predict") {
    const junk = filled.filter((r) => r.text.trim() && !wordsOf(r.text).some((w) => /\p{L}/u.test(w)));
    if (junk.length)
      issues.push({
        id: "junk",
        kind: "junk",
        level: "fix",
        title: `${plural(junk.length, "row")} with no words in it`,
        why: "Zo learns from words. Rows of only symbols or numbers give it nothing to go on.",
        rows: junk.map((r) => r.id),
        fixes: [{ label: "Remove them", apply: without(junk.map((r) => r.id)) }],
      });
  }

  // The same example twice counts twice: Zo thinks it matters more than the others.
  const groups = countBy(filled, (r) => normalise(r.text) + "\u0000" + (labelled ? normalise(r.label) : ""));
  const extras = [...groups.values()].filter((g) => g.length > 1).flatMap((g) => g.slice(1));
  if (extras.length)
    issues.push({
      id: "duplicate",
      kind: "duplicate",
      level: "fix",
      title: `${plural(extras.length, "copy", "copies")} of rows that are already there`,
      why: "A row that appears twice counts twice. Copies also leak into the test, so Zo looks cleverer than it is.",
      rows: [...groups.values()].filter((g) => g.length > 1).flatMap((g) => g.map((r) => r.id)),
      fixes: [{ label: "Keep one of each", apply: without(extras.map((r) => r.id)) }],
    });

  if (mode === "sort" || mode === "reply") issues.push(...labelChecks(filled, mode));
  if (mode === "predict") issues.push(...numberChecks(filled));

  const usable = filled.length - extras.length;
  if (mode === "write") {
    const words = filled.reduce((s, r) => s + wordsOf(r.text).length, 0);
    if (words < 300)
      issues.push({
        id: "too-short",
        kind: "too-short",
        level: "think",
        title: `Only ${words} words to read`,
        why: "A writer learns from reading. With little text Zo can only copy the sentences it saw.",
        rows: [],
        fixes: [],
      });
  } else if (usable < (mode === "predict" ? 10 : 16))
    issues.push({
      id: "too-few",
      kind: "too-few",
      level: "think",
      title: `Only ${plural(usable, "example")}`,
      why: "More examples, and more different ones, help Zo find the pattern instead of remembering each one.",
      rows: [],
      fixes: [],
    });

  return issues;
}

function labelChecks(rows: Row[], mode: "sort" | "reply"): Issue[] {
  const out: Issue[] = [];
  const answer = mode === "reply" ? "answer" : "label";

  // The same text with two different labels: Zo is told two things at once.
  const byText = countBy(rows, (r) => normalise(r.text));
  const clashes = [...byText.values()].filter((g) => new Set(g.map((r) => normalise(r.label))).size > 1);
  if (clashes.length) {
    const keepMost = (g: Row[]) => {
      const counts = countBy(g, (r) => normalise(r.label));
      const sorted = [...counts.values()].sort((a, b) => b.length - a.length);
      return sorted.length > 1 && sorted[0].length === sorted[1].length ? g : sorted.slice(1).flat();
    };
    out.push({
      id: "contradiction",
      kind: "contradiction",
      level: "fix",
      title: `${plural(clashes.length, "example")} with two different ${answer}s`,
      why: `The same words can't be two things at once for Zo. Decide which ${answer} is right, or drop the example.`,
      rows: clashes.flat().map((r) => r.id),
      fixes: [
        { label: `Keep the most common ${answer}`, apply: without(clashes.flatMap(keepMost).map((r) => r.id)) },
        { label: "Remove them all", apply: without(clashes.flat().map((r) => r.id)) },
      ],
    });
  }

  // Labels that are almost the same: a typo or a capital letter splits one label into two.
  const byLabel = countBy(rows, (r) => r.label.trim());
  const names = [...byLabel.keys()].sort((a, b) => byLabel.get(b)!.length - byLabel.get(a)!.length);
  const merged = new Set<string>();
  for (let i = 0; i < names.length; i++) {
    const big = names[i];
    if (merged.has(big)) continue;
    const variants = names.filter((other, j) => {
      if (j <= i || merged.has(other)) return false;
      const a = normalise(big);
      const b = normalise(other);
      if (a === b) return true;
      const room = Math.max(1, Math.floor(Math.min(a.length, b.length) / 4));
      return distance(a, b, room) <= room && byLabel.get(other)!.length <= Math.max(2, byLabel.get(big)!.length / 3);
    });
    if (!variants.length) continue;
    variants.forEach((v) => merged.add(v));
    const ids = variants.flatMap((v) => byLabel.get(v)!.map((r) => r.id));
    out.push({
      id: `variant:${big}`,
      kind: "label-variant",
      level: "fix",
      title: `${variants.map((v) => `“${v}”`).join(", ")} looks like “${big}”`,
      why: `Zo treats every spelling as a different ${answer}. One typo can split a ${answer} in two.`,
      rows: ids,
      fixes: [{ label: `Change to “${big}”`, apply: (rs) => rs.map((r) => (variants.includes(r.label.trim()) ? { ...r, label: big } : r)) }],
    });
  }

  if (mode === "sort") {
    const real = names.filter((n) => !merged.has(n));
    const sizes = real.map((n) => byLabel.get(n)!.length);
    const rare = real.filter((n) => byLabel.get(n)!.length < 4);
    if (rare.length && real.length > 1)
      out.push({
        id: "rare-label",
        kind: "rare-label",
        level: "think",
        title: `${rare.map((n) => `“${n}”`).join(", ")} ${rare.length === 1 ? "has" : "have"} very few examples`,
        why: "Zo needs several examples of each label to spot what they share. Add more, or drop the label.",
        rows: rare.flatMap((n) => byLabel.get(n)!.map((r) => r.id)),
        fixes: [{ label: "Drop these labels", apply: without(rare.flatMap((n) => byLabel.get(n)!.map((r) => r.id))) }],
      });
    const big = Math.max(...sizes);
    const small = Math.min(...sizes.filter((s) => s >= 4));
    if (real.length > 1 && isFinite(small) && big >= 3 * small) {
      const cap = Math.ceil(small * 1.5);
      const trim = real.filter((n) => byLabel.get(n)!.length > cap).flatMap((n) => byLabel.get(n)!.slice(cap).map((r) => r.id));
      out.push({
        id: "imbalance",
        kind: "imbalance",
        level: "think",
        title: `“${names.find((n) => byLabel.get(n)!.length === big)}” has ${Math.round(big / small)}× more examples than the smallest label`,
        why: "With lopsided data Zo can score well by always guessing the big label. Balance it, or check the test per label.",
        rows: [],
        fixes: [{ label: `Keep at most ${cap} of each`, apply: without(trim) }],
      });
    }
  }
  return out;
}

function numberChecks(rows: Row[]): Issue[] {
  const out: Issue[] = [];
  const bad = rows.filter((r) => !isNumber(r.text) || !isNumber(r.label));
  if (bad.length) {
    const rescuable = bad.filter((r) => !isNaN(rescueNumber(r.text)) && !isNaN(rescueNumber(r.label)));
    out.push({
      id: "not-number",
      kind: "not-number",
      level: "fix",
      title: `${plural(bad.length, "row")} where a value isn't a number`,
      why: "“7 hrs” or “five” is easy for you to read, but Zo can only do maths with plain numbers.",
      rows: bad.map((r) => r.id),
      fixes: [
        ...(rescuable.length
          ? [{ label: `Turn ${rescuable.length === bad.length ? "them" : rescuable.length} into numbers`, apply: (rs: Row[]) => rs.map((r) => (rescuable.includes(r) ? { ...r, text: String(rescueNumber(r.text)), label: String(rescueNumber(r.label)) } : r)) }]
          : []),
        { label: "Remove them", apply: without(bad.map((r) => r.id)) },
      ],
    });
  }

  // Points far from the trend: a typo, or something real and unusual. Worth a look either way.
  const good = rows.filter((r) => isNumber(r.text) && isNumber(r.label));
  if (good.length >= 8) {
    const xs = good.map((r) => toNumber(r.text));
    const ys = good.map((r) => toNumber(r.label));
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    const slope = sxx ? xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / sxx : 0;
    const res = ys.map((y, i) => y - (my + slope * (xs[i] - mx)));
    const med = (a: number[]) => {
      const s = [...a].sort((p, q) => p - q);
      return s[Math.floor(s.length / 2)];
    };
    const spread = 1.4826 * med(res.map((r) => Math.abs(r - med(res)))) || 1e-9;
    const far = good.filter((_, i) => Math.abs(res[i] - med(res)) > 3.5 * spread);
    if (far.length && far.length <= good.length / 5)
      out.push({
        id: "outlier",
        kind: "outlier",
        level: "think",
        title: `${plural(far.length, "point")} far from all the others`,
        why: "An outlier can be a typo or something real and rare. One wrong point can pull Zo's whole line off.",
        rows: far.map((r) => r.id),
        fixes: [{ label: "Remove them", apply: without(far.map((r) => r.id)) }],
      });
  }
  return out;
}

/** Rows per label, biggest first (sort and reply). */
export function labelCounts(rows: Row[]): { label: string; n: number }[] {
  const m = countBy(
    rows.filter((r) => r.text.trim() && r.label.trim()),
    (r) => r.label.trim(),
  );
  return [...m].map(([label, g]) => ({ label, n: g.length })).sort((a, b) => b.n - a.n);
}
