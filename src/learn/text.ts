import type { Features } from "./types";

/** Text helpers shared by the models and the data checks. No DOM, so the shared app can use them too. */

export const normalise = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

const WORD = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)*/gu;

export const wordsOf = (s: string): string[] => normalise(s).match(WORD) || [];

/** What a classifier sees in a text: words (w:), letter groups of 2–4 inside each word (c:), or both. */
export function featuresOf(text: string, kind: Features): string[] {
  const out: string[] = [];
  for (const w of wordsOf(text)) {
    if (kind !== "letters") out.push("w:" + w);
    if (kind !== "words") for (const g of letterGroups(w)) out.push("c:" + g);
  }
  return out;
}

export function letterGroups(word: string): string[] {
  const padded = ` ${word} `;
  const chars = [...padded];
  const out: string[] = [];
  for (let n = 2; n <= 4; n++) for (let i = 0; i + n <= chars.length; i++) out.push(chars.slice(i, i + n).join(""));
  return out;
}

/** How Zo shows a feature to a student. */
export const featureName = (f: string) => (f.startsWith("w:") ? f.slice(2) : `“${f.slice(2).trim()}”`);

/** Edit distance, stopping early once it passes `max`. */
export function distance(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let low = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      low = Math.min(low, cur[j]);
    }
    if (low > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** Sentences (or lines) from a longer text. */
export function sentences(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((p) => p.match(/[^.!?।]+[.!?।]+["'”’)\]]*|[^.!?।]+$/g) || [])
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Seeded random numbers, so a split or a training run can be repeated exactly. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(list: readonly T[], rnd: () => number): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
  zéro: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20,
  trente: 30, quarante: 40, cinquante: 50, soixante: 60, cent: 100,
};

/** A strict number: only digits, a sign and one decimal point (comma or dot). */
export const isNumber = (s: string) => /^\s*[-+]?(\d+([.,]\d+)?|[.,]\d+)\s*$/.test(s);
export const toNumber = (s: string) => Number(s.trim().replace(",", "."));

/** Rescue a number someone typed loosely: "7 hrs", "5.5%", "five", "cinq". NaN when there isn't one. */
export function rescueNumber(s: string): number {
  const t = s.trim().toLowerCase();
  if (isNumber(t)) return toNumber(t);
  const m = t.match(/^[^\d+.\-]*([-+]?\d+(?:[.,]\d+)?)\s*[\p{L}%°$€£₹.]*$/u);
  if (m) return toNumber(m[1]);
  const parts = t.split(/[\s-]+/).filter(Boolean);
  if (parts.length && parts.every((p) => p in NUMBER_WORDS)) return parts.reduce((s, p) => (p === "hundred" || p === "cent" ? Math.max(1, s) * 100 : s + NUMBER_WORDS[p]), 0);
  return NaN;
}

export const round = (n: number, places = 2) => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};
