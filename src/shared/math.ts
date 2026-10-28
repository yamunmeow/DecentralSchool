import type { MathKind, MathSet } from "./types";
import { between, pick, rand, shuffle } from "./random";

/** One generated problem. `answer` is the canonical form; checking is done by value. */
export interface Problem {
  prompt: string;
  answer: string;
  pad: "number" | "fraction" | "time";
  /** Fixed choices (e.g. < = >); otherwise distractors are made from the answer. */
  choices?: string[];
  /** Fractions must be in lowest terms to count. */
  lowest?: boolean;
  explain?: string;
}

interface Meta {
  label: string;
  /** What min and max mean for this kind. */
  range: [string, string];
  defaults: [number, number];
  example: string;
}

export const MATH_KINDS: Record<MathKind, Meta> = {
  add: { label: "Addition", range: ["Smallest number", "Largest number"], defaults: [1, 20], example: "14 + 7" },
  sub: { label: "Subtraction", range: ["Smallest number", "Largest number"], defaults: [1, 20], example: "15 − 8" },
  mul: { label: "Times tables", range: ["From table", "To table"], defaults: [2, 10], example: "7 × 8" },
  div: { label: "Division", range: ["From table", "To table"], defaults: [2, 10], example: "56 ÷ 7" },
  mixed: { label: "Mixed + − × ÷", range: ["Smallest number", "Largest number"], defaults: [1, 20], example: "9 × 3" },
  missing: { label: "Missing number", range: ["Smallest number", "Largest number"], defaults: [1, 20], example: "8 + ? = 15" },
  compare: { label: "Compare < = >", range: ["Smallest number", "Largest number"], defaults: [1, 100], example: "47 ? 74" },
  integers: { label: "Negative numbers", range: ["Smallest size", "Largest size"], defaults: [1, 20], example: "−6 + 9" },
  place: { label: "Place value", range: ["Smallest number", "Largest number"], defaults: [100, 99999], example: "value of 7 in 4,732" },
  round: { label: "Rounding", range: ["Smallest number", "Largest number"], defaults: [10, 9999], example: "round 4,732 to the nearest 100" },
  "order-ops": { label: "Order of operations", range: ["Smallest number", "Largest number"], defaults: [1, 10], example: "3 + 4 × 2" },
  "frac-of": { label: "Fraction of a number", range: ["Smallest multiple", "Largest multiple"], defaults: [1, 10], example: "3/4 of 20" },
  "frac-add": { label: "Add and subtract fractions", range: ["Smallest denominator", "Largest denominator"], defaults: [2, 12], example: "1/4 + 2/3" },
  "frac-simplify": { label: "Simplify fractions", range: ["Smallest denominator", "Largest denominator"], defaults: [2, 12], example: "6/8 → 3/4" },
  decimal: { label: "Decimals + −", range: ["Smallest number", "Largest number"], defaults: [0, 20], example: "3.5 + 1.25" },
  percent: { label: "Percentages", range: ["Smallest number", "Largest number"], defaults: [20, 400], example: "25% of 80" },
  linear: { label: "Solve for x", range: ["Smallest x", "Largest x"], defaults: [-10, 10], example: "3x + 4 = 19" },
  powers: { label: "Squares, cubes, roots", range: ["Smallest number", "Largest number"], defaults: [1, 12], example: "7², √81" },
  area: { label: "Area and perimeter", range: ["Shortest side", "Longest side"], defaults: [2, 15], example: "6 cm × 4 cm rectangle" },
  time: { label: "Telling time", range: ["Fewest minutes", "Most minutes"], defaults: [5, 120], example: "45 min after 3:30" },
  word: { label: "Word problems", range: ["Smallest number", "Largest number"], defaults: [2, 30], example: "Asha has 12 mangoes…" },
};

const NAMES = ["Asha", "Ravi", "Meera", "Kofi", "Lina", "Omar", "Sam", "Mei", "Ana", "Tariq", "Zara", "Arjun", "Nia", "Leo"];
const THINGS = ["apples", "pencils", "marbles", "stickers", "books", "mangoes", "stamps", "shells", "cards", "beads"];
// All start with a consonant, so "de" never needs eliding.
const THINGS_FR = ["pommes", "crayons", "billes", "cahiers", "livres", "mangues", "timbres", "coquillages", "cartes", "perles"];

/** The problems' wording. French follows the player's "tu"; other player languages use English. */
const EN = {
  value: (d: string, n: string) => `What is the value of the digit ${d} in ${n}?`,
  places: ["ones", "tens", "hundreds", "thousands", "ten thousands", "hundred thousands", "millions"],
  digit: (place: string, n: string) => `Which digit is in the ${place} place of ${n}?`,
  round: (n: string, p: number) => `Round ${n} to the nearest ${p.toLocaleString("en-US")}.`,
  mulFirst: (b: number, c: number, a: number) => `Multiply first: ${b} × ${c} = ${b * c}, then add ${a}.`,
  brackets: (a: number, b: number, c: number) => `Brackets first: ${a} + ${b} = ${a + b}, then × ${c}.`,
  mulSub: (a: number, b: number, d: number) => `Multiply first: ${a} × ${b} = ${a * b}, then subtract ${d}.`,
  divFirst: (cq: number, c: number, q: number, a: number) => `Divide first: ${cq} ÷ ${c} = ${q}, then add ${a}.`,
  fracOf: (f: string, n: number) => `What is ${f} of ${n}?`,
  common: (d: number, answer: string) => `Common denominator ${d}; answer in lowest terms: ${answer}`,
  simplify: (f: string) => `Simplify ${f}`,
  divideBoth: (g: number) => `Divide top and bottom by ${g}.`,
  percent: (p: number, y: number) => `What is ${p}% of ${y}?`,
  linear: (add: boolean, b: number, a: number) => `${add ? "Add" : "Subtract"} ${b}, then divide by ${a}.`,
  rectArea: (l: number, w: number) => `A rectangle is ${l} cm long and ${w} cm wide. What is its area in cm²?`,
  rectPerimeter: (l: number, w: number) => `A rectangle is ${l} cm long and ${w} cm wide. What is its perimeter in cm?`,
  square: (l: number) => `A square has sides of ${l} cm. What is its area in cm²?`,
  triangle: (b: number, h: number) => `A triangle has a base of ${b} cm and a height of ${h} cm. What is its area in cm²?`,
  time: (add: number, at: string) => `What time is it ${add} minutes after ${at}?`,
  things: THINGS,
  gets: (who: string, other: string, a: number, b: number, what: string) => `${who} has ${a} ${what}. ${other} gives ${who} ${b} more. How many ${what} does ${who} have now?`,
  gave: (who: string, other: string, x: number, y: number, what: string) => `${who} had ${x} ${what} and gave ${y} to ${other}. How many are left?`,
  bags: (who: string, bags: number, each: number, what: string) => `${who} has ${bags} bags with ${each} ${what} in each. How many ${what} altogether?`,
  shares: (who: string, total: number, kids: number, what: string) => `${who} shares ${total} ${what} equally between ${kids} friends. How many does each friend get?`,
};

const FR: typeof EN = {
  value: (d, n) => `Quelle est la valeur du chiffre ${d} dans ${n}\u00a0?`,
  places: ["unités", "dizaines", "centaines", "unités de mille", "dizaines de mille", "centaines de mille", "millions"],
  digit: (place, n) => `Quel est le chiffre des ${place} dans ${n}\u00a0?`,
  round: (n, p) => `Arrondis ${n} ${({ 10: "à la dizaine la plus proche", 100: "à la centaine la plus proche", 1000: "au millier le plus proche", 10000: "à la dizaine de milliers la plus proche" } as Record<number, string>)[p]}.`,
  mulFirst: (b, c, a) => `Multiplie d'abord\u00a0: ${b} × ${c} = ${b * c}, puis ajoute ${a}.`,
  brackets: (a, b, c) => `Les parenthèses d'abord\u00a0: ${a} + ${b} = ${a + b}, puis × ${c}.`,
  mulSub: (a, b, d) => `Multiplie d'abord\u00a0: ${a} × ${b} = ${a * b}, puis soustrais ${d}.`,
  divFirst: (cq, c, q, a) => `Divise d'abord\u00a0: ${cq} ÷ ${c} = ${q}, puis ajoute ${a}.`,
  fracOf: (f, n) => `Combien font les ${f} de ${n}\u00a0?`,
  common: (d, answer) => `Dénominateur commun\u00a0: ${d}\u00a0; réponse sous forme irréductible\u00a0: ${answer}`,
  simplify: (f) => `Simplifie ${f}`,
  divideBoth: (g) => `Divise le numérateur et le dénominateur par ${g}.`,
  percent: (p, y) => `Combien font ${p}\u00a0% de ${y}\u00a0?`,
  linear: (add, b, a) => `${add ? "Ajoute" : "Soustrais"} ${b}, puis divise par ${a}.`,
  rectArea: (l, w) => `Un rectangle mesure ${l} cm de long et ${w} cm de large. Quelle est son aire en cm²\u00a0?`,
  rectPerimeter: (l, w) => `Un rectangle mesure ${l} cm de long et ${w} cm de large. Quel est son périmètre en cm\u00a0?`,
  square: (l) => `Un carré a des côtés de ${l} cm. Quelle est son aire en cm²\u00a0?`,
  triangle: (b, h) => `Un triangle a une base de ${b} cm et une hauteur de ${h} cm. Quelle est son aire en cm²\u00a0?`,
  time: (add, at) => `Quelle heure est-il ${add} minutes après ${at}\u00a0?`,
  things: THINGS_FR,
  gets: (who, other, a, b, what) => `${who} a ${a} ${what}. ${other} lui en donne ${b} de plus. Combien en a ${who} maintenant\u00a0?`,
  gave: (who, other, x, y, what) => `${who} avait ${x} ${what} et en a donné ${y} à ${other}. Combien en reste-t-il\u00a0?`,
  bags: (who, bags, each, what) => `${who} a ${bags} sacs contenant chacun ${each} ${what}. Combien de ${what} y a-t-il en tout\u00a0?`,
  shares: (who, total, kids, what) => `${who} partage ${total} ${what} équitablement entre ${kids} amis. Combien chaque ami en reçoit-il\u00a0?`,
};

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a) || 1);
const fmt = (n: number) => (n < 0 ? `(−${-n})` : String(n));
const minus = (n: number) => (n < 0 ? `−${-n}` : String(n));
const frac = (n: number, d: number) => {
  const g = gcd(n, d);
  return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`;
};

function range(set: MathSet): [number, number] {
  const lo = Number.isFinite(set.min) ? set.min : MATH_KINDS[set.kind].defaults[0];
  const hi = Number.isFinite(set.max) ? set.max : MATH_KINDS[set.kind].defaults[1];
  return lo <= hi ? [lo, hi] : [hi, lo];
}

export function generate(set: MathSet, lang = "en"): Problem {
  const fr = lang === "fr";
  const T = fr ? FR : EN;
  // French groups thousands with a space and writes decimals with a comma.
  const thousands = (n: number) => (fr ? n.toLocaleString("fr-FR").replace(/\s/g, "\u00a0") : n.toLocaleString("en-US"));
  const dec = (n: number) => (fr ? String(n).replace(".", ",") : String(n));
  const [lo, hi] = range(set);
  const num = (prompt: string, answer: number, explain?: string): Problem => ({ prompt, answer: String(answer), pad: "number", explain });

  switch (set.kind) {
    case "add": {
      const a = between(lo, hi), b = between(lo, hi);
      return num(`${a} + ${b} = ?`, a + b);
    }
    case "sub": {
      const a = between(lo, hi), b = between(lo, hi);
      return num(`${Math.max(a, b)} − ${Math.min(a, b)} = ?`, Math.abs(a - b));
    }
    case "mul": {
      const a = between(Math.max(0, lo), hi), b = between(1, 10);
      return rand(2) ? num(`${a} × ${b} = ?`, a * b) : num(`${b} × ${a} = ?`, a * b);
    }
    case "div": {
      const b = between(Math.max(1, lo), Math.max(1, hi)), q = between(1, 10);
      return num(`${b * q} ÷ ${b} = ?`, q);
    }
    case "mixed": {
      const op = rand(4);
      if (op < 2) return generate({ ...set, kind: op ? "sub" : "add" }, lang);
      const small: MathSet = { ...set, min: Math.max(1, Math.min(lo, 10)), max: Math.max(2, Math.min(hi, 12)) };
      return generate({ ...small, kind: op === 2 ? "mul" : "div" }, lang);
    }
    case "missing": {
      const a = between(lo, hi), b = between(lo, hi);
      switch (rand(4)) {
        case 0: return num(`${a} + ? = ${a + b}`, b);
        case 1: return num(`? + ${b} = ${a + b}`, a);
        case 2: return num(`? − ${Math.min(a, b)} = ${Math.abs(a - b)}`, Math.max(a, b));
        default: {
          const f = between(2, 10), g = between(Math.max(1, Math.min(lo, 10)), Math.max(2, Math.min(hi, 12)));
          return num(`${f} × ? = ${f * g}`, g);
        }
      }
    }
    case "compare": {
      let a = between(lo, hi), b = between(lo, hi);
      if (!rand(6)) b = a;
      let left = String(a);
      if (rand(3) === 0 && a > lo + 1) {
        const part = between(lo, a - 1);
        left = `${part} + ${a - part}`;
      }
      const answer = a < b ? "<" : a > b ? ">" : "=";
      return { prompt: `${left}  ?  ${b}`, answer, pad: "number", choices: ["<", "=", ">"] };
    }
    case "integers": {
      const a = between(-hi, hi), b = between(-hi, hi);
      return rand(2) ? num(`${minus(a)} + ${fmt(b)} = ?`, a + b) : num(`${minus(a)} − ${fmt(b)} = ?`, a - b);
    }
    case "place": {
      const n = between(Math.max(10, lo), Math.max(10, hi));
      const digits = String(n).split("").reverse();
      const places = T.places;
      const unique = digits.map((d, i) => ({ d, i })).filter(({ d }) => d !== "0" && digits.filter((x) => x === d).length === 1);
      if (unique.length && rand(2)) {
        const { d, i } = pick(unique);
        return num(T.value(d, thousands(n)), Number(d) * 10 ** i);
      }
      const i = rand(Math.min(digits.length, places.length));
      return num(T.digit(places[i], thousands(n)), Number(digits[i]));
    }
    case "round": {
      const n = between(Math.max(10, lo), Math.max(10, hi));
      const options = [10, 100, 1000, 10000].filter((p) => p < n);
      const p = pick(options.length ? options : [10]);
      return num(T.round(thousands(n), p), Math.round(n / p) * p);
    }
    case "order-ops": {
      const a = between(lo, hi), b = between(lo, hi), c = between(Math.max(1, lo), Math.max(2, hi));
      switch (rand(4)) {
        case 0: return num(`${a} + ${b} × ${c} = ?`, a + b * c, T.mulFirst(b, c, a));
        case 1: return num(`(${a} + ${b}) × ${c} = ?`, (a + b) * c, T.brackets(a, b, c));
        case 2: {
          const d = Math.min(c, a * b);
          return num(`${a} × ${b} − ${d} = ?`, a * b - d, T.mulSub(a, b, d));
        }
        default: {
          const q = between(1, 10);
          return num(`${a} + ${c * q} ÷ ${c} = ?`, a + q, T.divFirst(c * q, c, q, a));
        }
      }
    }
    case "frac-of": {
      const d = pick([2, 3, 4, 5, 6, 8, 10]), m = between(1, d - 1), k = between(Math.max(1, lo), Math.max(1, hi));
      const g = gcd(m, d);
      return num(T.fracOf(`${m / g}/${d / g}`, k * d), (k * d * m) / d, `${k * d} ÷ ${d / g} × ${m / g}`);
    }
    case "frac-add": {
      const d1 = between(Math.max(2, lo), Math.max(2, hi));
      const d2 = rand(2) ? d1 : between(Math.max(2, lo), Math.max(2, hi));
      let a = between(1, d1 - 1), b = d1, c = between(1, d2 - 1), d = d2;
      const add = rand(2) === 0;
      if (!add && a / b < c / d) [a, b, c, d] = [c, d, a, b];
      const top = add ? a * d + c * b : a * d - c * b;
      const answer = frac(top, b * d);
      return { prompt: `${a}/${b} ${add ? "+" : "−"} ${c}/${d} = ?`, answer, pad: "fraction", explain: T.common((b * d) / gcd(b, d), answer) };
    }
    case "frac-simplify": {
      const d = between(Math.max(2, lo), Math.max(2, hi));
      let n = between(1, d - 1);
      let k = between(2, 5);
      if (gcd(n, d) !== 1) k = 1;
      n *= k;
      const den = d * k;
      return { prompt: T.simplify(`${n}/${den}`), answer: frac(n, den), pad: "fraction", lowest: true, explain: T.divideBoth(gcd(n, den)) };
    }
    case "decimal": {
      const places = pick([1, 1, 2]);
      const f = 10 ** places;
      const a = between(lo * f, hi * f) / f, b = between(lo * f, hi * f) / f;
      const [x, y] = a >= b ? [a, b] : [b, a];
      const add = rand(2) === 0;
      const value = Math.round((add ? x + y : x - y) * f) / f;
      return { prompt: `${dec(x)} ${add ? "+" : "−"} ${dec(y)} = ?`, answer: String(value), pad: "number" };
    }
    case "percent": {
      const p = pick([10, 20, 25, 50, 75, 5, 30, 40, 60, 15]);
      const unit = 100 / gcd(p, 100);
      const y = Math.max(unit, Math.round(between(lo, hi) / unit) * unit);
      return num(T.percent(p, y), (p * y) / 100, `${y} ÷ 100 × ${p}`);
    }
    case "linear": {
      const x = between(lo, hi), a = between(2, 9), b = between(-12, 12);
      const c = a * x + b;
      const left = b === 0 ? `${a}x` : `${a}x ${b < 0 ? "−" : "+"} ${Math.abs(b)}`;
      return num(`${left} = ${minus(c)}.  x = ?`, x, T.linear(b < 0, Math.abs(b), a));
    }
    case "powers": {
      const n = between(Math.max(0, lo), Math.max(1, hi));
      const kind = rand(n <= 10 ? 3 : 2);
      if (kind === 0) return num(`${n}² = ?`, n * n, `${n} × ${n}`);
      if (kind === 1) return num(`√${n * n} = ?`, n, `${n} × ${n} = ${n * n}`);
      return num(`${n}³ = ?`, n ** 3, `${n} × ${n} × ${n}`);
    }
    case "area": {
      const l = between(Math.max(1, lo), Math.max(1, hi)), w = between(Math.max(1, lo), Math.max(1, hi));
      switch (rand(4)) {
        case 0: return num(T.rectArea(l, w), l * w, `${l} × ${w}`);
        case 1: return num(T.rectPerimeter(l, w), 2 * (l + w), `2 × (${l} + ${w})`);
        case 2: return num(T.square(l), l * l, `${l} × ${l}`);
        default: {
          const base = l * 2;
          return num(T.triangle(base, w), (base * w) / 2, `${base} × ${w} ÷ 2`);
        }
      }
    }
    case "time": {
      const h = between(1, 12), m = rand(12) * 5;
      const add = Math.max(5, Math.round(between(lo, hi) / 5) * 5);
      const total = (h % 12) * 60 + m + add;
      const hh = Math.floor(total / 60) % 12 || 12, mm = total % 60;
      const show = (a: number, b: number) => `${a}:${String(b).padStart(2, "0")}`;
      return { prompt: T.time(add, show(h, m)), answer: show(hh, mm), pad: "time" };
    }
    case "word": {
      const who = pick(NAMES), other = pick(NAMES.filter((n) => n !== who)), what = pick(T.things);
      const a = between(lo, hi), b = between(lo, hi);
      switch (rand(4)) {
        case 0: return num(T.gets(who, other, a, b, what), a + b, `${a} + ${b}`);
        case 1: {
          const [x, y] = a >= b ? [a, b] : [b, a];
          return num(T.gave(who, other, x, y, what), x - y, `${x} − ${y}`);
        }
        case 2: {
          const bags = between(2, 10), each = between(2, Math.max(3, Math.min(hi, 12)));
          return num(T.bags(who, bags, each, what), bags * each, `${bags} × ${each}`);
        }
        default: {
          const kids = between(2, 10), each = between(2, Math.max(3, Math.min(hi, 12)));
          return num(T.shares(who, kids * each, kids, what), each, `${kids * each} ÷ ${kids}`);
        }
      }
    }
  }
}

/* ---------- checking and distractors ---------- */

/** Numeric value of "12", "-3", "−3", "2,5", "3/4", "1 1/2"; NaN if it isn't a number. */
export function valueOf(text: string): number {
  const s = text.trim().replace(/−/g, "-").replace(/\s+/g, " ");
  const mixed = s.match(/^(-?\d+) (\d+)\/(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const part = Number(mixed[2]) / Number(mixed[3]);
    return whole < 0 ? whole - part : whole + part;
  }
  const f = s.match(/^(-?\d+(?:[.,]\d+)?)\s*\/\s*(-?\d+(?:[.,]\d+)?)$/);
  if (f) return Number(f[1].replace(",", ".")) / Number(f[2].replace(",", "."));
  if (/^-?\d{1,3}(,\d{3})+$/.test(s)) return Number(s.replace(/,/g, ""));
  if (/^-?\d+(?:[.,]\d+)?$/.test(s)) return Number(s.replace(",", "."));
  return NaN;
}

export function inLowestTerms(text: string): boolean {
  const f = text.replace(/−/g, "-").match(/^\s*-?(\d+)\s*\/\s*(\d+)\s*$/);
  return !f || gcd(Number(f[1]), Number(f[2])) === 1;
}

export function sameTime(a: string, b: string): boolean {
  const t = (s: string) => {
    const m = s.trim().match(/^(\d{1,2})[:.h ]?(\d{2})$/);
    return m ? `${Number(m[1]) % 12 || 12}:${m[2]}` : s.trim();
  };
  return t(a) === t(b);
}

/** Three plausible wrong answers next to the right one, shuffled; returns options and the answer's index. */
export function withDistractors(p: Problem): { options: string[]; answer: number } {
  if (p.choices) return { options: p.choices, answer: p.choices.indexOf(p.answer) };
  const wrong = new Set<string>();
  if (p.pad === "time") {
    const [h, m] = p.answer.split(":").map(Number);
    for (const shift of shuffle([5, -5, 10, -10, 60, -60, 15, 30])) {
      const t = ((h % 12) * 60 + m + shift + 720) % 720;
      wrong.add(`${Math.floor(t / 60) || 12}:${String(t % 60).padStart(2, "0")}`);
      if (wrong.size >= 3) break;
    }
  } else if (p.pad === "fraction" && p.answer.includes("/")) {
    const [n, d] = p.answer.split("/").map(Number);
    for (const [a, b] of shuffle([[n + 1, d], [Math.max(1, n - 1), d], [n, d + 1], [d, n], [n * 2, d * 2 + 1], [n + d, d]])) {
      const s = `${a}/${b}`;
      if (s !== p.answer && valueOf(s) !== valueOf(p.answer)) wrong.add(s);
      if (wrong.size >= 3) break;
    }
  } else {
    const v = valueOf(p.answer);
    const decimals = (p.answer.split(".")[1] || "").length;
    const step = decimals ? 10 ** -decimals : 1;
    const near = [step, -step, 2 * step, -2 * step, 10 * step, -10 * step].map((d) => v + d);
    const far = [v * 2, Math.round(v / 2), v + 100 * step];
    for (const c of [...shuffle(near).slice(0, 4), ...shuffle(far)]) {
      const s = String(Math.round(c / step) * step).replace(/(\.\d*?)0{6,}\d*$/, "$1");
      const clean = decimals ? Number(s).toFixed(decimals).replace(/\.?0+$/, "") : s;
      if (clean !== p.answer && (v < 0 || Number(clean) >= 0)) wrong.add(clean);
      if (wrong.size >= 3) break;
    }
  }
  const options = shuffle([p.answer, ...Array.from(wrong).slice(0, 3)]);
  return { options, answer: options.indexOf(p.answer) };
}
