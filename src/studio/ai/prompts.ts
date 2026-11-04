import { MATH_KINDS } from "../../shared/math";
import { grammarItem, normalize, question, word } from "../../shared/normalize";
import type { Game, GrammarItem, Passage, Question, Template, Word } from "../../shared/types";
import { getLang, t } from "../i18n";
import { gameDefaults } from "../templates";

const QUESTION_FORMAT = `  { "type": "mcq", "q": "...", "options": ["...", "..."], "answer": index of the right option, "explain": "optional" }
  { "type": "tf", "q": "statement", "answer": true | false, "explain": "..." }
  { "type": "short", "q": "...", "accept": ["every accepted answer", "spelling variants"], "explain": "..." }
  { "type": "order", "q": "instruction", "items": ["in", "the", "correct", "order"] }
  { "type": "match", "q": "instruction", "pairs": [["left", "right"], ...] }   (3 to 5 pairs)`;

const GRAMMAR_FORMAT = `         { "type": "fix", "text": "sentence with exactly one mistake", "wrong": "the wrong word(s), exactly as in text", "right": "the correction", "options": ["2-3 other wrong choices"], "explain": "..." }
         { "type": "gap", "text": "sentence with ___ for the gap", "options": ["..."], "answer": index }
         { "type": "judge", "text": "sentence", "correct": true | false, "fix": "corrected sentence if false", "explain": "..." }
         { "type": "unscramble", "text": "a correct sentence (shown shuffled)" }`;

const schema = (own: boolean) => `GAME FORMAT (JSON). Every game has:
  "template": "quiz" | "math" | "balloon" | "grammar" | "vocab" | "reading"${own ? ' | "custom"' : ""}
  "title": short title; "subtitle": optional one line; "emoji": one emoji
  "tint": "lilac" | "sky" | "peach" | "mint" | "lemon" | "sage" | "rose" | "sand"
  "settings": { "round": questions per round (default 10), "timer": seconds per question, 0 = none,
                "lives": hearts per round, 0 = unlimited, "instant": show the answer after each question (true),
                "fresh": prefer unseen questions (true), "speech": voice like "en-GB", "hi-IN", "fr-FR",
                "ui": language of the buttons "en" | "hi" | "fr" | "es", "sound": true }

A question (used by quiz, math "questions" and reading passages) is one of:
${QUESTION_FORMAT}

quiz:    { "questions": [question, ...] }
math:    { "sets": [{ "kind": K, "min": n, "max": n, "weight": 1-5 }], "answer": "type" | "choose", "questions": [question, ...] }
         Problems are generated fresh each round from "sets". min and max limit each number in a problem, not
         the answer: for additions with answers up to 20, use "add" with max 10. K is one of:
         ${Object.entries(MATH_KINDS).map(([k, m]) => `${k} (${m.label}; min/max = ${m.range.join("/").toLowerCase()}; e.g. ${m.example})`).join("\n         ")}
         Use "questions" only for topic-specific word problems the generators can't make.
balloon: { "sets": [...], "answer": "type" | "choose", "questions": [...], "speed": 1 (gentle) | 2 | 3 (fast) }
         The same "sets" and "questions" as math, at the top level of the game (not inside a "math" object).
         A cannon game: each right answer loads a cannonball, the student fires at balloons coming down,
         and "round" is the number of balloons.
grammar: { "items": [item, ...] } where item is one of
${GRAMMAR_FORMAT}
vocab:   { "words": [{ "word", "meaning", "example": "sentence containing the word exactly", "emoji", "opposite", "translation" }],
           "modes": any of ["meaning", "word", "gap", "spell", "listen", "opposite", "translate", "pairs"] }
reading: { "passages": [{ "title", "text": "paragraphs separated by blank lines", "questions": [question, ...], "glossary": [{ "word", "meaning" }] }],
           "activities": any of ["questions", "cloze", "sequence", "truefalse", "glossary"] }
         One passage is picked per round. cloze, sequence and truefalse are made automatically from the text.${own ? '\ncustom:  { "html": "a complete single-file HTML game" }' : ""}`;

/** When each ready-made template is the right one. */
const CHOOSING = `Every game is built from one of these ready-made templates. Each already has its own screens, animations and sounds; you only choose the template and write what goes in it. Never write HTML or code.
  balloon: adding and subtracting, and other quick number drills (times tables, mental maths), as an action game: each right answer loads a cannon that pops falling balloons. Always use it for adding and subtracting, at any age, unless the teacher asks for a game without the cannon.
  math:    maths beyond quick sums: fractions, decimals, percentages, time, area, algebra, word problems.
  quiz:    facts on any subject: multiple choice, true/false, short answers, ordering and matching (memory or matching games too).
  grammar: spotting and fixing mistakes, gap fills, unscrambling sentences.
  vocab:   learning words: meanings, spelling, listening, opposites, translations.
  reading: a text to read, then questions about it.
If the idea doesn't fit one exactly (a race, a board game, a puzzle), use the closest template and say in one short sentence which one you used.`;

const RULES = `RULES
- Facts and answers must be correct and unambiguous; exactly one option is right.
- Make the bank bigger than one round (about 2-3x "round") so each round differs.
- Suit the age, level and language the teacher asks for. Write the game in that language and set "speech" and "ui" to match.
- Keep explanations to one short sentence that teaches why.`;

const CUSTOM_RULES = `- For "custom" games: one self-contained HTML document, inline CSS and JS only. No external files, fonts, images, CDNs or network requests (the network is switched off when it runs). No frameworks. Portrait phone first (360 px wide), big touch targets, readable on cheap Android phones, playable in 2-5 minutes, randomised each play, with a clear score and a "Play again" button. Use emoji or CSS/SVG for pictures. Wrap any localStorage use in try/catch. Keep it under 40 KB.`;

/** `own`: the teacher asked for a game of their own ("Your own game"), the one time the assistant writes HTML. */
export function assistantSystem(game: Game | null, own = false): string {
  const custom = own || game?.template === "custom";
  return `You are the game designer inside DecentralSchool, a tool teachers use to make short, private, offline learning games that students play on cheap phones. Help the teacher try out their own teaching ideas.

When you create or change a game, reply with one or two short sentences, then the COMPLETE game JSON (not a diff) in one fenced block that starts with \`\`\`game and ends with \`\`\`. Don't repeat the JSON outside the block. If the teacher only asks a question, answer briefly without a block. Ask a question back only if you truly can't make something sensible; otherwise make reasonable choices and say what they were.

${custom ? `This is the teacher's own game, written from scratch as "custom": one HTML document.` : CHOOSING}

${schema(custom)}

${RULES}${custom ? `\n${CUSTOM_RULES}` : ""}
${getLang() === "fr" ? '- The teacher uses the studio in French. Reply in French. Unless they ask for another language, write games in French with "speech": "fr-FR" and "ui": "fr", using French typography.\n' : ""}${game ? `\nTHE CURRENT GAME (change this one unless the teacher asks for a new game):\n\`\`\`game\n${JSON.stringify(strip(game))}\n\`\`\`` : ""}`;
}

/** What the model needs to see of a game: no ids or bookkeeping. */
function strip(game: Game) {
  const { id: _id, created: _c, updated: _u, app: _a, v: _v, ...rest } = game;
  return rest;
}

/* ---------- reading the model's reply ---------- */

const FENCE = /```([a-zA-Z]*)[^\n]*\n([\s\S]*?)(?:```|$)/g;

/** Lenient JSON: tolerates trailing commas, comments and smart quotes around keys. */
export function looseJson(text: string): unknown {
  const start = text.search(/[[{]/);
  if (start < 0) throw new Error("no JSON found");
  let body = text.slice(start);
  const open = body[0];
  const close = open === "{" ? "}" : "]";
  const end = body.lastIndexOf(close);
  if (end > 0) body = body.slice(0, end + 1);
  try {
    return JSON.parse(body);
  } catch {
    const cleaned = body
      .replace(/\/\/[^\n"]*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/[“”]/g, '"');
    return JSON.parse(cleaned);
  }
}

export interface Reply {
  /** The reply without the game block. */
  text: string;
  game?: Game;
  /** The block was there but couldn't be read. */
  broken?: boolean;
  /** Still inside an unfinished block (while streaming). */
  writing?: boolean;
  /** The block was a game written from scratch where a template was asked for. */
  refused?: boolean;
}

export function readReply(raw: string, current: Game | null, own = false): Reply {
  let game: Game | undefined;
  let broken = false;
  let writing = false;
  const text = raw.replace(FENCE, (block, lang: string, body: string) => {
    const tag = lang.toLowerCase();
    if (!["game", "json", "html", ""].includes(tag) || (!tag && !/^\s*[{<]/.test(body))) return block;
    if (!block.trimEnd().endsWith("```") || block.trimEnd() === "```") {
      writing = true;
      return "";
    }
    try {
      if (tag === "html" || /^\s*<!doctype|^\s*<html/i.test(body)) {
        game = normalize({ ...(current && current.template === "custom" ? current : {}), template: "custom", title: current?.title || titleOf(body), emoji: current?.emoji || "✨", html: body.trim() }, keepOf(current));
      } else {
        const parsed = looseJson(body) as Record<string, unknown>;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not a game");
        // Smaller models sometimes nest the content under the template's name, or a balloon game's under "math".
        const nested = [String(parsed.template), "math"].map((k) => parsed[k]).find((v) => v && typeof v === "object" && !Array.isArray(v)) as object | undefined;
        game = normalize({ ...parsed, ...nested, settings: { ...(current?.settings || gameDefaults()), ...((parsed.settings as object) || {}) } }, keepOf(current));
        if (isEmpty(game)) throw new Error("nothing to play");
      }
    } catch {
      broken = true;
    }
    return "";
  });
  if (game?.template === "custom" && !own && current?.template !== "custom") return { text: text.trim(), refused: true, writing };
  return { text: text.trim(), game, broken, writing };
}

/** A game the student couldn't play: nothing to ask. */
function isEmpty(g: Game): boolean {
  switch (g.template) {
    case "quiz": return !g.questions.length;
    case "math":
    case "balloon": return !g.sets.length && !g.questions.length;
    case "grammar": return !g.items.length;
    case "vocab": return !g.words.length;
    case "reading": return !g.passages.length;
    case "custom": return !g.html.trim();
  }
}

const keepOf = (g: Game | null) => (g ? { id: g.id, created: g.created, app: g.app } : undefined);
const titleOf = (html: string) => html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || t("New game");

/* ---------- one-shot generators used by the editors ---------- */

export interface GenerateRequest {
  template: Exclude<Template, "custom" | "math" | "balloon"> | "math-questions";
  topic: string;
  level: string;
  count: number;
  language: string;
  /** Reading: the passage to write questions about. */
  passage?: Passage;
}

export function generatorPrompt(req: GenerateRequest): string {
  const who = [req.level && `Learners: ${req.level}.`, req.language && `Write in ${req.language}.`].filter(Boolean).join(" ");
  switch (req.template) {
    case "quiz":
    case "math-questions":
      return `Write ${req.count} varied quiz questions about: ${req.topic}. ${who}
Mix types (mostly "mcq", some "tf", "short", and at most one "order" or "match"). ${req.template === "math-questions" ? "These are maths word problems; answers must be numbers, checked carefully. Use \"short\" with numeric accept values or \"mcq\"." : ""}
Reply with only a JSON array of questions in this format, nothing else:
${QUESTION_FORMAT}
Facts and answers must be correct and unambiguous; exactly one option is right.`;
    case "grammar":
      return `Write ${req.count} grammar practice items about: ${req.topic}. ${who}
Mix item types: mostly "fix" and "gap", some "judge" and "unscramble". In "fix" items, "wrong" must appear in "text" exactly as written and be the only mistake.
Reply with only a JSON array of items:
${GRAMMAR_FORMAT}`;
    case "vocab":
      return `Make a vocabulary list of ${req.count} words for the topic: ${req.topic}. ${who}
Reply with only a JSON array: [{ "word": "...", "meaning": "simple learner-friendly definition", "example": "a short sentence that contains the word exactly", "emoji": "one fitting emoji", "opposite": "only if there is a common one" ${req.language && !/english/i.test(req.language) ? "" : ', "translation": "only if the teacher asked for a translation language"'} }]
Meanings must not contain the word itself.`;
    case "reading":
      return `Here is a reading text for students. ${who}
TITLE: ${req.passage?.title || ""}
TEXT:
${req.passage?.text || ""}

Write ${req.count} comprehension questions that can be answered from the text (mix literal and inference; mostly "mcq", some "tf" and "short"; at most one "order" about the sequence of events), and a glossary of 4-8 harder words from the text with simple meanings.
Reply with only JSON: { "questions": [question, ...], "glossary": [{ "word": "as written in the text", "meaning": "..." }] }
Question format:
${QUESTION_FORMAT}`;
  }
}

export function readGenerated(req: GenerateRequest, raw: string): { questions?: Question[]; items?: GrammarItem[]; words?: Word[]; glossary?: Word[] } {
  const parsed = looseJson(raw.replace(/```[a-z]*\n?|```/gi, ""));
  const list = (x: unknown): unknown[] => (Array.isArray(x) ? x : x && typeof x === "object" ? Object.values(x).find(Array.isArray) || [] : []);
  switch (req.template) {
    case "quiz":
    case "math-questions":
      return { questions: list(parsed).map(question).filter((q): q is Question => !!q) };
    case "grammar":
      return { items: list(parsed).map(grammarItem).filter((g): g is GrammarItem => !!g) };
    case "vocab":
      return { words: list(parsed).map(word).filter((w): w is Word => !!w) };
    case "reading": {
      const obj = (parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : { questions: parsed }) as Record<string, unknown>;
      return {
        questions: list(obj.questions).map(question).filter((q): q is Question => !!q),
        glossary: list(obj.glossary).map(word).filter((w): w is Word => !!w),
      };
    }
  }
}
