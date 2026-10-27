export const rand = (n: number) => Math.floor(Math.random() * n);

/** Whole number from min to max, both included. */
export const between = (min: number, max: number) => {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  return lo + rand(hi - lo + 1);
};

export const pick = <T>(list: readonly T[]): T => list[rand(list.length)];

export function shuffle<T>(list: readonly T[]): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Up to n items from list, never the excluded ones, no repeats. */
export function sample<T>(list: readonly T[], n: number, exclude: (x: T) => boolean = () => false): T[] {
  return shuffle(list.filter((x) => !exclude(x))).slice(0, n);
}

/** Pick by weight; weights of 0 or less are skipped. */
export function weighted<T>(list: readonly T[], weight: (x: T) => number): T | undefined {
  const total = list.reduce((s, x) => s + Math.max(0, weight(x)), 0);
  if (total <= 0) return list[0];
  let r = Math.random() * total;
  for (const x of list) {
    r -= Math.max(0, weight(x));
    if (r < 0) return x;
  }
  return list[list.length - 1];
}

/** Short random id: 12 base-36 characters. */
export function uid(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}
