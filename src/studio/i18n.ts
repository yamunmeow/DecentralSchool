import { createElement, Fragment, useEffect, useState, type ReactNode } from "react";

/**
 * The studio's languages. Every string is written in English in the code and looked up
 * in the French dictionary (src/studio/i18n/fr) when French is on, so a missing entry
 * falls back to English instead of showing a key. The dictionary loads only when needed.
 */

export type Lang = "en" | "fr";
export const LANGS: { id: Lang; short: string; name: string }[] = [
  { id: "en", short: "EN", name: "English" },
  { id: "fr", short: "FR", name: "Français" },
];

const KEY = "ds-lang";
type Dict = Record<string, string>;

const saved = (): Lang | null => {
  try {
    const s = localStorage.getItem(KEY);
    return s === "en" || s === "fr" ? s : null;
  } catch {
    return null;
  }
};

let lang: Lang = saved() || (/^fr\b/i.test(navigator.language || "") ? "fr" : "en");
let dict: Dict | null = null;
const missing = new Set<string>();

/** French spacing and apostrophes, applied once so the dictionary can be typed plainly. */
const polish = (d: Dict): Dict => {
  const out: Dict = {};
  for (const [k, v] of Object.entries(d))
    out[k] = v
      .replace(/ ([?!:;»])/g, " $1")
      .replace(/« /g, "« ")
      .replace(/(\p{L})'(\p{L})/gu, "$1’$2");
  return out;
};

async function load(l: Lang) {
  if (l === "fr" && !dict) dict = polish((await import("./i18n/fr")).default);
}

/** Loads the dictionary before the first paint (main.tsx waits for it). */
export const ready = () => load(lang).then(() => document.documentElement.setAttribute("lang", lang));

export const getLang = () => lang;

export async function setLang(next: Lang) {
  if (next === lang) return;
  await load(next);
  lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* private mode: the choice lasts until the tab closes */
  }
  document.documentElement.setAttribute("lang", next);
  window.dispatchEvent(new Event("langchange"));
}

const fill = (s: string, vars?: Record<string, string | number>) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s);

/** The text for `en` in the current language. `{name}` placeholders are filled from `vars`. */
export function t(en: string, vars?: Record<string, string | number>): string {
  if (lang === "en" || !dict) return fill(en, vars);
  const s = dict[en];
  // Symbols, single letters and numbers ("%1 + %2", "x", "10 ^") read the same in every language.
  if (s === undefined && import.meta.env.DEV && /\p{L}{2}/u.test(en.replace(/%\d/g, "")) && !missing.has(en)) {
    missing.add(en);
    console.warn("[fr] missing:", en);
  }
  return fill(s ?? en, vars);
}

/** The same English word meaning something else here: looked up as "context: text". */
export function tc(context: string, en: string, vars?: Record<string, string | number>): string {
  if (lang === "en" || !dict) return fill(en, vars);
  const key = `${context}: ${en}`;
  return key in dict ? fill(dict[key], vars) : t(en, vars);
}

/** A counted phrase: `one` for 1 (and 0 in French), `other` otherwise. `{n}` is the count. */
export function tn(n: number, one: string, other: string, vars?: Record<string, string | number>): string {
  const single = lang === "fr" ? Math.abs(n) < 2 : n === 1;
  return t(single ? one : other, { n: n.toLocaleString(locale()), ...vars });
}

/** Like t(), but placeholders can be elements (a link inside a sentence). */
export function tj(en: string, parts: Record<string, ReactNode>): ReactNode {
  const text = t(en);
  const pieces = text.split(/\{(\w+)\}/g);
  return createElement(Fragment, null, ...pieces.map((p, i) => (i % 2 ? createElement(Fragment, { key: i }, p in parts ? parts[p] : `{${p}}`) : p)));
}

/** For Intl and toLocale*String. */
export const locale = () => (lang === "fr" ? "fr-FR" : undefined);

export const dateText = (ms: number | string | Date, opts?: Intl.DateTimeFormatOptions) => new Date(ms).toLocaleDateString(locale(), opts);

/** Re-renders with the current language; App remounts the studio on a change. */
export function useLang(): Lang {
  const [l, setL] = useState(lang);
  useEffect(() => {
    const on = () => setL(lang);
    window.addEventListener("langchange", on);
    return () => window.removeEventListener("langchange", on);
  }, []);
  return l;
}

if (import.meta.env.DEV) (window as unknown as { __missingFr: Set<string> }).__missingFr = missing;
