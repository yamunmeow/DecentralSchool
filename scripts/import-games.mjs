#!/usr/bin/env node
/**
 * Copies standalone HTML games into public/library/ so they can be played in the
 * browser without installing anything, and writes an editable quick-game template
 * (template.json, a DecentralSchool game) for each one the studio understands.
 *
 * Each source is a folder laid out as games/<name>/{game.json, icon.png, www/}:
 *
 *   node scripts/import-games.mjs "../CAEB Games/VocabGame/games/word-quest" …
 *
 * A www/content.json with word decks becomes a vocabulary game, a page with a
 * STORIES list becomes reading games (one per language), and the multiplication
 * quest becomes a maths game. Anything else is still playable and can be edited
 * as its own HTML.
 *
 * Each known game also gets a French copy (index.fr.html, see library-fr.mjs) and
 * French-button versions of its templates (*.fr.json). To remake only those from
 * what is already in public/library/: node scripts/import-games.mjs --french
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import vm from "node:vm";
import { mathQuestFr, readingQuestFr, wordQuestFr } from "./library-fr.mjs";

const root = resolve(import.meta.dirname, "..");
const out = join(root, "public", "library");
const settings = (patch = {}) => ({ round: 10, timer: 0, lives: 0, instant: true, fresh: true, speech: "en-GB", ui: "en", sound: true, ...patch });

function vocabTemplate(content) {
  return [
    {
      file: "template.json",
      game: {
        template: "vocab",
        title: content.title || "Word Quest",
        subtitle: content.subtitle,
        emoji: "🔤",
        tint: "sky",
        settings: settings({ round: content.roundLength || 10, speech: content.speechLang || "en-GB" }),
        words: content.decks.flatMap((d) => d.words.map(({ word, meaning, example, emoji, opposite }) => ({ word, meaning, example, emoji, opposite }))),
        modes: (content.questionTypes || []).filter((m) => ["meaning", "word", "gap", "spell", "listen", "opposite", "translate", "pairs"].includes(m)),
      },
    },
  ];
}

function readingTemplates(html) {
  const start = html.indexOf("const STORIES=[");
  let depth = 0;
  let end = start + "const STORIES=".length;
  for (; end < html.length; end++) {
    if (html[end] === "[") depth++;
    else if (html[end] === "]" && --depth === 0) break;
  }
  const stories = vm.runInNewContext(html.slice(start + "const STORIES=".length, end + 1));
  const langs = [
    { key: "en", file: "template.json", title: "Reading Quest", subtitle: "Short stories to read, then answer.", speech: "en-GB" },
    { key: "fr", file: "template-fr.json", title: "Reading Quest (français)", subtitle: "De petites histoires à lire, puis des questions.", speech: "fr-FR" },
  ];
  return langs
    .filter((l) => stories.some((s) => s[l.key]))
    .map((l) => ({
      file: l.file,
      game: {
        template: "reading",
        title: l.title,
        subtitle: l.subtitle,
        emoji: "📖",
        tint: "sage",
        settings: settings({ round: 8, speech: l.speech, ui: l.key }),
        activities: ["questions", "cloze", "sequence", "truefalse"],
        passages: stories
          .filter((s) => s[l.key])
          .map((s) => ({
            title: `${s.icon || ""} ${s[l.key].title}`.trim(),
            text: s[l.key].text,
            questions: s[l.key].q.map(([q, ...options]) => ({ type: "mcq", q, options, answer: 0 })),
            glossary: [],
          })),
      },
    }));
}

const mathTemplate = () => [
  {
    file: "template.json",
    game: {
      template: "math",
      title: "Math Quest",
      subtitle: "Times tables from 1 to 9.",
      emoji: "✖️",
      tint: "mint",
      settings: settings({ round: 27 }),
      answer: "type",
      sets: [{ kind: "mul", min: 1, max: 9, weight: 1 }],
      questions: [],
    },
  },
];

/** French titles for the templates whose players get French buttons. */
const FR_TITLES = {
  "Word Quest": ["Défi Vocabulaire", "Apprends des mots anglais. Écoute, joue et épelle."],
  "Reading Quest": ["Défi Lecture (anglais)", "De petites histoires en anglais à lire, puis des questions."],
  "Math Quest": ["Défi Maths", "Les tables de multiplication de 1 à 9."],
};

function addFrench(dest) {
  const read = (f) => readFileSync(join(dest, f), "utf8");
  const html = read("index.html");
  if (existsSync(join(dest, "content.json"))) {
    const { page, content } = wordQuestFr(html, JSON.parse(read("content.json")));
    writeFileSync(join(dest, "index.fr.html"), page);
    writeFileSync(join(dest, "content.fr.json"), JSON.stringify(content, null, 1) + "\n");
  } else if (html.includes("const STORIES=[")) writeFileSync(join(dest, "index.fr.html"), readingQuestFr(html));
  else if (/multiplication/i.test(html)) writeFileSync(join(dest, "index.fr.html"), mathQuestFr(html));
  else return;
  if (!existsSync(join(dest, "template.json"))) return;
  const game = JSON.parse(read("template.json"));
  const [title, subtitle] = FR_TITLES[game.title] || [game.title, game.subtitle];
  const speech = game.template === "math" ? "fr-FR" : game.settings.speech;
  writeFileSync(join(dest, "template.fr.json"), JSON.stringify({ ...game, title, subtitle, settings: { ...game.settings, ui: "fr", speech } }, null, 1) + "\n");
}

if (process.argv[2] === "--french") {
  for (const name of readdirSync(out)) if (existsSync(join(out, name, "index.html"))) addFrench(join(out, name)), console.log(`French copy: public/library/${name}/`);
  process.exit(0);
}

for (const src of process.argv.slice(2)) {
  const dir = resolve(src);
  const meta = JSON.parse(readFileSync(join(dir, "game.json"), "utf8"));
  const name = basename(dir);
  const dest = join(out, name);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(join(dir, "www"), dest, { recursive: true });
  if (existsSync(join(dir, "icon.png"))) cpSync(join(dir, "icon.png"), join(dest, "icon.png"));

  const html = readFileSync(join(dir, "www", "index.html"), "utf8");
  const contentFile = join(dir, "www", "content.json");
  const templates = existsSync(contentFile)
    ? vocabTemplate(JSON.parse(readFileSync(contentFile, "utf8")))
    : html.includes("const STORIES=[")
      ? readingTemplates(html)
      : /multiplication/i.test(html)
        ? mathTemplate()
        : [];
  for (const t of templates) writeFileSync(join(dest, t.file), JSON.stringify(t.game, null, 1) + "\n");
  addFrench(dest);
  console.log(`${meta.name}: public/library/${name}/ (${templates.map((t) => t.file).join(", ") || "play only"})`);
}
