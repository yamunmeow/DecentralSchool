import type { Question, Word } from "../../shared/types";
import countries from "./countries.json";

/**
 * The randomizer: fresh questions for the same kind of quiz, every time. Trivia and
 * word meanings come from open, key-free services; country facts come from a dataset
 * shipped with the studio, so they work with no internet at all. Whatever is fetched
 * becomes ordinary questions in the game, so the game itself still plays offline.
 */

export type Source =
  | { kind: "trivia"; category: number; difficulty: "" | "easy" | "medium" | "hard" }
  | { kind: "countries"; topic: CountryTopic; region: string }
  | { kind: "words"; topic: string };

export type CountryTopic = "mixed" | "capital" | "country" | "continent" | "flag" | "currency" | "landlocked" | "bigger";

export interface Fetched {
  questions: Question[];
  credit: string;
  /** Made from the bundled data because the service couldn't be reached. */
  offline?: boolean;
}

export const TRIVIA_CATEGORIES: [number, string][] = [
  [9, "General knowledge"],
  [17, "Science & nature"],
  [27, "Animals"],
  [22, "Geography"],
  [23, "History"],
  [19, "Mathematics"],
  [18, "Computers"],
  [21, "Sports"],
  [25, "Art"],
  [10, "Books"],
  [12, "Music"],
];

export const COUNTRY_TOPICS: [CountryTopic, string][] = [
  ["mixed", "A mix of everything"],
  ["capital", "Capital cities"],
  ["country", "Which country has this capital?"],
  ["continent", "Continents"],
  ["flag", "Flags"],
  ["currency", "Money"],
  ["landlocked", "Coast or no coast"],
  ["bigger", "Which is bigger?"],
];

export const REGIONS = ["Africa", "Americas", "Asia", "Europe", "Oceania"];

export const WORD_TOPICS = ["animals", "food", "school", "weather", "feelings", "body", "home", "travel", "sport", "nature", "jobs", "music"];

const shuffle = <T,>(a: T[]): T[] => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/** Four choices with the right one somewhere random. */
function mcq(q: string, right: string, wrong: string[], explain?: string): Question {
  const others = shuffle(Array.from(new Set(wrong.filter((w) => w && w !== right)))).slice(0, 3);
  const options = shuffle([right, ...others]);
  return { type: "mcq", q, options, answer: options.indexOf(right), ...(explain ? { explain } : {}) };
}

/* ---------- Open Trivia Database (opentdb.com, CC BY-SA 4.0) ---------- */

const TOKEN = "ds-opentdb-token";

async function triviaToken(fresh = false): Promise<string> {
  let token = fresh ? "" : sessionStorage.getItem(TOKEN) || "";
  if (!token) {
    const r = await fetch("https://opentdb.com/api_token.php?command=request").then((r) => r.json());
    token = String(r.token || "");
    sessionStorage.setItem(TOKEN, token);
  }
  return token;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function trivia(src: Extract<Source, { kind: "trivia" }>, n: number): Promise<Fetched> {
  const ask = async (token: string) => {
    const url = new URL("https://opentdb.com/api.php");
    url.searchParams.set("amount", String(Math.min(50, n)));
    url.searchParams.set("category", String(src.category));
    if (src.difficulty) url.searchParams.set("difficulty", src.difficulty);
    url.searchParams.set("encode", "url3986");
    if (token) url.searchParams.set("token", token);
    return (await fetch(url).then((r) => r.json())) as { response_code: number; results: { type: string; question: string; correct_answer: string; incorrect_answers: string[] }[] };
  };
  let token = await triviaToken().catch(() => "");
  let res = await ask(token);
  // 4: this browser has seen every question in the category, start over; 3: token expired; 5: too fast.
  if (res.response_code === 3 || res.response_code === 4) res = await ask((token = await triviaToken(true).catch(() => "")));
  if (res.response_code === 5) {
    await wait(5200);
    res = await ask(token);
  }
  if (res.response_code === 1 && n > 10) return trivia(src, 10);
  if (res.response_code !== 0) throw new Error("The trivia service has no more questions for that choice right now.");
  const d = decodeURIComponent;
  return {
    credit: "Questions from the Open Trivia Database (opentdb.com), CC BY-SA 4.0",
    questions: res.results.map((r) =>
      r.type === "boolean" ? { type: "tf", q: d(r.question), answer: d(r.correct_answer) === "True" } : mcq(d(r.question), d(r.correct_answer), r.incorrect_answers.map(d)),
    ),
  };
}

/* ---------- countries (bundled: world-countries, ODbL-1.0) ---------- */

interface Country {
  name: string;
  capital: string;
  region: string;
  subregion: string;
  code: string;
  currency: string;
  area: number;
  landlocked: boolean;
}

const COUNTRIES: Country[] = (countries.rows as unknown[][]).map(([name, capital, region, subregion, code, currency, , area, landlocked]) => ({
  name: String(name),
  capital: String(capital),
  region: String(region),
  subregion: String(subregion),
  code: String(code),
  currency: String(currency),
  area: Number(area),
  landlocked: !!landlocked,
}));

/** A country code as its flag emoji (two regional-indicator letters). */
export const flag = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

function countryQuestion(topic: Exclude<CountryTopic, "mixed">, c: Country, pool: Country[]): Question | null {
  const near = pool.filter((o) => o !== c && o.region === c.region);
  const others = (near.length >= 3 ? near : pool.filter((o) => o !== c)).map((o) => o);
  switch (topic) {
    case "capital":
      return mcq(`What is the capital of ${c.name}?`, c.capital, shuffle(others).map((o) => o.capital));
    case "country":
      return mcq(`${c.capital} is the capital of which country?`, c.name, shuffle(others).map((o) => o.name));
    case "continent":
      return mcq(`Which part of the world is ${c.name} in?`, c.region, REGIONS);
    case "flag":
      return mcq(`Which country has this flag? ${flag(c.code)}`, c.name, shuffle(others).map((o) => o.name));
    case "currency": {
      if (!c.currency) return null;
      const money = shuffle(pool.filter((o) => o.currency && o.currency !== c.currency).map((o) => o.currency));
      return mcq(`Which money is used in ${c.name}?`, c.currency, money);
    }
    case "landlocked":
      return { type: "tf", q: `${c.name} has a coast on the sea or ocean.`, answer: !c.landlocked, explain: c.landlocked ? `${c.name} is landlocked: it has no coast.` : undefined };
    case "bigger": {
      const o = pick(others);
      if (!o || o.area === c.area) return null;
      const big = c.area > o.area ? c : o;
      return mcq(`Which country is bigger?`, big.name, [c === big ? o.name : c.name], `${big.name}: ${big.area.toLocaleString()} km²`);
    }
  }
}

function countryQuiz(src: Extract<Source, { kind: "countries" }>, n: number): Fetched {
  const pool = src.region ? COUNTRIES.filter((c) => c.region === src.region) : COUNTRIES;
  const topics = COUNTRY_TOPICS.map(([t]) => t).filter((t): t is Exclude<CountryTopic, "mixed"> => t !== "mixed");
  const out: Question[] = [];
  for (const c of shuffle(pool)) {
    if (out.length >= n) break;
    const q = countryQuestion(src.topic === "mixed" ? pick(topics) : src.topic, c, pool.length >= 4 ? pool : COUNTRIES);
    if (q) out.push(q);
  }
  return { questions: out, credit: "Country facts from world-countries by Mohammed Le Doze, ODbL-1.0" };
}

/* ---------- words (Datamuse, definitions from Wiktionary/WordNet) ---------- */

const PLACE = /\b(barangay|municipality|village|town in|city in|county|surname|given name|place ?name|census)\b/i;

/** Common single words about a topic, with a short meaning each. */
export async function fetchWords(topic: string, n = 20): Promise<Word[]> {
  const url = `https://api.datamuse.com/words?topics=${encodeURIComponent(topic)}&ml=${encodeURIComponent(topic)}&md=dfp&max=200`;
  const rows = (await fetch(url).then((r) => r.json())) as { word: string; defs?: string[]; tags?: string[] }[];
  const words: Word[] = [];
  for (const r of shuffle(rows)) {
    if (!/^[a-z]{3,12}$/.test(r.word) || !r.defs?.length) continue;
    const freq = Number(r.tags?.find((t) => t.startsWith("f:"))?.slice(2) || 0);
    if (freq < 3) continue;
    // "N" senses are names (bands, films); keep dictionary senses only.
    const def = r.defs
      .filter((d) => /^(n|v|adj|adv)\t/.test(d))
      .map((d) => d.split("\t")[1]?.trim() || "")
      .map((d) => d.replace(/^\([^)]*\)\s*/, "").replace(/\.\s*$/, ""))
      .find((d) => d.length > 6 && d.length < 110 && !d.toLowerCase().includes(r.word) && !PLACE.test(d));
    if (def) words.push({ word: r.word, meaning: def.charAt(0).toLowerCase() + def.slice(1) });
    if (words.length >= n) break;
  }
  return words;
}

function wordQuiz(words: Word[], n: number): Question[] {
  return shuffle(words)
    .slice(0, n)
    .map((w, i) =>
      i % 2
        ? mcq(`What does “${w.word}” mean?`, w.meaning, words.map((o) => o.meaning))
        : mcq(`Which word means “${w.meaning}”?`, w.word, words.map((o) => o.word)),
    );
}

async function wordsOffline(): Promise<Word[]> {
  const res = await fetch("/library/word-quest/template.json");
  return ((await res.json()) as { words: Word[] }).words;
}

/* ---------- one entry point ---------- */

export async function fetchQuestions(src: Source, n = 20): Promise<Fetched> {
  if (src.kind === "countries") return countryQuiz(src, n);
  if (src.kind === "trivia") return trivia(src, n);
  try {
    const words = await fetchWords(src.topic, n + 4);
    if (words.length < 4) throw new Error("too few");
    return { questions: wordQuiz(words, n), credit: "Words from Datamuse (datamuse.com), meanings from Wiktionary and WordNet" };
  } catch {
    return { questions: wordQuiz(await wordsOffline(), n), credit: "Words from Word Quest", offline: true };
  }
}

export const describe = (src: Source) =>
  src.kind === "trivia"
    ? `${TRIVIA_CATEGORIES.find(([id]) => id === src.category)?.[1] || "Trivia"}${src.difficulty ? `, ${src.difficulty}` : ""}`
    : src.kind === "countries"
      ? `${COUNTRY_TOPICS.find(([t]) => t === src.topic)?.[1]}${src.region ? `, ${src.region}` : ""}`
      : `Words: ${src.topic}`;
