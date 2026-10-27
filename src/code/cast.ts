/**
 * Scratch's value rules (scratch-vm's Cast and operator blocks), so scripts give the
 * same answers here as in Scratch: "10" + 5 is 15, "Apple" = "apple" is true,
 * -7 mod 3 is 2, and an empty string is not 0 when comparing.
 */

export type Value = string | number | boolean;

export function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isNaN(v) ? 0 : v;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

export function toBoolean(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return !(v === "" || v === "0" || v.toLowerCase() === "false");
  return Boolean(v);
}

export function toStr(v: unknown): string {
  return String(v);
}

const isWhiteSpace = (v: unknown) => v === null || (typeof v === "string" && v.trim().length === 0);

export function compare(a: unknown, b: unknown): number {
  let n1 = Number(a);
  let n2 = Number(b);
  if (n1 === 0 && isWhiteSpace(a)) n1 = NaN;
  else if (n2 === 0 && isWhiteSpace(b)) n2 = NaN;
  if (Number.isNaN(n1) || Number.isNaN(n2)) {
    const s1 = String(a).toLowerCase();
    const s2 = String(b).toLowerCase();
    return s1 < s2 ? -1 : s1 > s2 ? 1 : 0;
  }
  if ((n1 === Infinity && n2 === Infinity) || (n1 === -Infinity && n2 === -Infinity)) return 0;
  return n1 - n2;
}

/** scratch-vm's limitPrecision: hide float noise such as 9.999999999. */
export function limit(n: number): number {
  const r = Math.round(n);
  return Math.abs(n - r) < 1e-9 ? r : n;
}

export function isInt(v: unknown): boolean {
  if (typeof v === "number") return Number.isNaN(v) || v === Math.floor(v);
  if (typeof v === "boolean") return true;
  if (typeof v === "string") return v.indexOf(".") < 0;
  return false;
}

export function random(from: unknown, to: unknown): number {
  const a = toNumber(from);
  const b = toNumber(to);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (lo === hi) return lo;
  if (isInt(from) && isInt(to)) return lo + Math.floor(Math.random() * (hi + 1 - lo));
  return Math.random() * (hi - lo) + lo;
}

export function mod(a: unknown, b: unknown): number {
  const n = toNumber(a);
  const m = toNumber(b);
  let r = n % m;
  if (r / m < 0) r += m;
  return r;
}

export function mathop(op: string, v: unknown): number {
  const n = toNumber(v);
  switch (op) {
    case "abs": return Math.abs(n);
    case "floor": return Math.floor(n);
    case "ceiling": return Math.ceil(n);
    case "sqrt": return Math.sqrt(n);
    case "sin": return parseFloat(Math.sin((Math.PI * n) / 180).toFixed(10));
    case "cos": return parseFloat(Math.cos((Math.PI * n) / 180).toFixed(10));
    case "tan": {
      const a = n % 360;
      if (a === -270 || a === 90) return Infinity;
      if (a === -90 || a === 270) return -Infinity;
      return parseFloat(Math.tan((Math.PI * a) / 180).toFixed(10));
    }
    case "asin": return (Math.asin(n) * 180) / Math.PI;
    case "acos": return (Math.acos(n) * 180) / Math.PI;
    case "atan": return (Math.atan(n) * 180) / Math.PI;
    case "ln": return Math.log(n);
    case "log": return Math.log(n) / Math.LN10;
    case "e ^": return Math.exp(n);
    case "10 ^": return Math.pow(10, n);
  }
  return 0;
}

export function letterOf(str: unknown, index: unknown): string {
  const s = toStr(str);
  const i = toNumber(index) - 1;
  return i < 0 || i >= s.length ? "" : s.charAt(i);
}

export function contains(a: unknown, b: unknown): boolean {
  return toStr(a).toLowerCase().includes(toStr(b).toLowerCase());
}

/* ---------- lists ---------- */

export const LIST_INVALID = -1;
export const LIST_ALL = -2;

/** Scratch's list index: 1-based, plus "last", "random"/"any" and (where allowed) "all". */
export function listIndex(index: unknown, length: number, acceptAll: boolean): number {
  if (typeof index !== "number") {
    const s = String(index);
    if (s === "all") return acceptAll ? LIST_ALL : LIST_INVALID;
    if (s === "last") return length > 0 ? length : LIST_INVALID;
    if (s === "random" || s === "any") return length > 0 ? 1 + Math.floor(Math.random() * length) : LIST_INVALID;
  }
  const i = Math.floor(toNumber(index));
  return i < 1 || i > length ? LIST_INVALID : i;
}

export function listContents(list: Value[]): string {
  const letters = list.every((x) => typeof x === "string" && x.length === 1);
  return list.join(letters ? "" : " ");
}

export function daysSince2000(): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = new Date(2000, 0, 1);
  const today = new Date();
  const dstAdjust = today.getTimezoneOffset() - start.getTimezoneOffset();
  let ms = today.valueOf() - start.valueOf();
  ms += (today.getTimezoneOffset() - dstAdjust) * 60 * 1000;
  return ms / msPerDay;
}

export function current(what: string): number {
  const d = new Date();
  switch (what) {
    case "year": return d.getFullYear();
    case "month": return d.getMonth() + 1;
    case "date": return d.getDate();
    case "dayofweek": return d.getDay() + 1;
    case "hour": return d.getHours();
    case "minute": return d.getMinutes();
    case "second": return d.getSeconds();
  }
  return 0;
}

/** 1-based index i wrapped onto 0..length-1 (costume and sound numbers wrap round). */
export function listIndexWrap(i: number, length: number): number {
  return (((i - 1) % length) + length) % length;
}
