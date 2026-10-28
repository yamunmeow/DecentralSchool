import { zoSvg } from "../code/art/zo";
import { predict } from "../learn/classifier";
import { predictLine } from "../learn/regression";
import type { LearnApp } from "../learn/types";
import { detokenise, generate } from "../learn/writer";
import css from "./learnplayer.css?inline";

/** A trained Zo as a page of its own: a downloaded file or an APK. No network, no training data inside. */

const SURE = 0.4;

/** The page's language, set by the studio when the app was saved. */
const FR = /^fr/i.test(document.documentElement.lang || "");
const T = FR
  ? {
      ask: "Pose une question à Zo",
      question: "Question",
      send: "Demander",
      unknown: "Je n'ai pas encore appris ça.",
      sortHint: "Écris quelque chose que Zo doit classer",
      text: "Texte",
      sure: (p: string) => `(sûr à ${p})`,
      range: (a: string, b: string) => `Zo ne s'est entraîné que de ${a} à ${b}. Ici, c'est un peu hasardeux.`,
      startWith: "Commencer par",
      creativity: "Créativité",
      write: "Écrire",
      about: "À propos de ce modèle",
      by: "Créé par",
      goodAt: "Fait bien",
      badAt: "Fait moins bien",
      learned: "A appris de",
      examples: (n: number) => `${n} exemple${n > 1 ? "s" : ""}`,
      score: "Score au test",
      trained: "Entraîné le",
      wrong: "Zo peut se tromper. Vérifie ce qu'il dit.",
    }
  : {
      ask: "Ask Zo something",
      question: "Question",
      send: "Ask",
      unknown: "I haven't learned that yet.",
      sortHint: "Type something for Zo to sort",
      text: "Text",
      sure: (p: string) => `(${p} sure)`,
      range: (a: string, b: string) => `Zo only practised from ${a} to ${b}. Out here it's a stretch.`,
      startWith: "Start with",
      creativity: "Creativity",
      write: "Write",
      about: "About this model",
      by: "Made by",
      goodAt: "Good at",
      badAt: "Not good at",
      learned: "Learned from",
      examples: (n: number) => `${n} examples`,
      score: "Test score",
      trained: "Trained",
      wrong: "Zo can be wrong. Check what it says.",
    };
const pct = (n: number) => (FR ? `${Math.round(n * 100)}\u00a0%` : `${Math.round(n * 100)}%`);

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = "") => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const fmt = (n: number) => (Math.abs(n) >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10));
const zoImg = (outfit: string, pose: "stand" | "wave" | "cheer", size: number) => {
  const img = el("img", "zo");
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(zoSvg(outfit, pose))}`;
  img.alt = "";
  img.width = size;
  img.height = Math.round(size * 1.25);
  return img;
};

function bars(items: { label: string; p: number }[], top: string) {
  const ul = el("ul", "bars");
  for (const i of items) {
    const li = el("li", i.label === top ? "on" : "");
    const track = el("span", "track");
    const bar = el("span", "bar");
    bar.style.width = `${Math.max(2, i.p * 100)}%`;
    track.append(bar);
    li.append(el("span", "name", i.label), track, el("span", "val", pct(i.p)));
    ul.append(li);
  }
  return ul;
}

function start(app: LearnApp) {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  document.title = app.title;
  const root = document.getElementById("app")!;
  root.className = "zl";

  const head = el("header", "head");
  head.append(zoImg(app.facts.pass ? "graduate" : "robot", "wave", 64), el("h1", "", app.title));
  const main = el("main", "card");
  const m = app.model;

  if (m.kind === "classifier" && app.mode === "reply") {
    const log = el("div", "chat");
    log.setAttribute("aria-live", "polite");
    const form = el("form", "row");
    const input = el("input");
    input.placeholder = T.ask;
    input.setAttribute("aria-label", T.question);
    const send = el("button", "btn", T.send);
    form.append(input, send);
    form.onsubmit = (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      const out = predict(m, q);
      const top = out.probs[0];
      log.append(el("p", "me", q), el("p", "zo-says", top && top.p >= SURE && out.known > 0 ? top.label : T.unknown));
      input.value = "";
      log.scrollTop = log.scrollHeight;
    };
    main.append(log, form);
  } else if (m.kind === "classifier") {
    const input = el("textarea");
    input.rows = 3;
    input.placeholder = T.sortHint;
    input.setAttribute("aria-label", T.text);
    const out = el("div", "out");
    out.setAttribute("aria-live", "polite");
    const go = () => {
      out.textContent = "";
      if (!input.value.trim()) return;
      const r = predict(m, input.value);
      const top = r.probs[0];
      out.append(el("p", "answer", `${top.label} ${T.sure(pct(top.p))}`), bars(r.probs.slice(0, 5), top.label));
    };
    input.oninput = go;
    main.append(input, out);
  } else if (m.kind === "line") {
    const label = el("label", "field");
    const input = el("input");
    input.inputMode = "decimal";
    label.append(el("span", "", app.columns[0]), input);
    const out = el("div", "out");
    out.setAttribute("aria-live", "polite");
    input.oninput = () => {
      out.textContent = "";
      const x = Number(input.value.replace(",", "."));
      if (!input.value.trim() || !isFinite(x)) return;
      out.append(el("p", "answer", `${app.columns[1]}: ${fmt(predictLine(m, x))}`));
      if (x < m.xMin || x > m.xMax) out.append(el("p", "note", T.range(fmt(m.xMin), fmt(m.xMax))));
    };
    main.append(label, out);
  } else {
    const label = el("label", "field");
    const input = el("input");
    label.append(el("span", "", T.startWith), input);
    const heat = el("input");
    heat.type = "range";
    heat.min = "0.1";
    heat.max = "2";
    heat.step = "0.1";
    heat.value = "0.8";
    const hl = el("label", "field");
    hl.append(el("span", "", T.creativity), heat);
    const btn = el("button", "btn", T.write);
    const out = el("p", "writing");
    out.setAttribute("aria-live", "polite");
    btn.onclick = () => (out.textContent = detokenise(generate(m, input.value, Number(heat.value), 40)));
    main.append(label, hl, btn, out);
  }

  const about = el("details", "about");
  about.append(el("summary", "", T.about));
  const dl = el("dl");
  const row = (k: string, v: string) => v.trim() && dl.append(el("dt", "", k), el("dd", "", v));
  row(T.by, app.card.by);
  row(T.goodAt, app.card.goodAt);
  row(T.badAt, app.card.badAt);
  row(T.learned, T.examples(app.facts.examples));
  if (app.facts.score) row(app.facts.scoreName || T.score, app.facts.score);
  row(T.trained, new Date(app.facts.trained).toLocaleDateString(FR ? "fr-FR" : undefined));
  about.append(dl, el("p", "note", T.wrong));

  root.append(head, main, about);
}

const data = document.getElementById("zo-app");
if (data) start(JSON.parse(data.textContent || "{}") as LearnApp);
