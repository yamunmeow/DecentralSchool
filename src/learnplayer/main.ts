import { zoSvg } from "../code/art/zo";
import { predict } from "../learn/classifier";
import { predictLine } from "../learn/regression";
import type { LearnApp } from "../learn/types";
import { detokenise, generate } from "../learn/writer";
import css from "./learnplayer.css?inline";

/** A trained Zo as a page of its own: a downloaded file or an APK. No network, no training data inside. */

const SURE = 0.4;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = "") => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const pct = (n: number) => `${Math.round(n * 100)}%`;
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
    input.placeholder = "Ask Zo something";
    input.setAttribute("aria-label", "Question");
    const send = el("button", "btn", "Ask");
    form.append(input, send);
    form.onsubmit = (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      const out = predict(m, q);
      const top = out.probs[0];
      log.append(el("p", "me", q), el("p", "zo-says", top && top.p >= SURE && out.known > 0 ? top.label : "I haven't learned that yet."));
      input.value = "";
      log.scrollTop = log.scrollHeight;
    };
    main.append(log, form);
  } else if (m.kind === "classifier") {
    const input = el("textarea");
    input.rows = 3;
    input.placeholder = "Type something for Zo to sort";
    input.setAttribute("aria-label", "Text");
    const out = el("div", "out");
    out.setAttribute("aria-live", "polite");
    const go = () => {
      out.textContent = "";
      if (!input.value.trim()) return;
      const r = predict(m, input.value);
      const top = r.probs[0];
      out.append(el("p", "answer", `${top.label} (${pct(top.p)} sure)`), bars(r.probs.slice(0, 5), top.label));
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
      if (x < m.xMin || x > m.xMax) out.append(el("p", "note", `Zo only practised from ${fmt(m.xMin)} to ${fmt(m.xMax)}. Out here it's a stretch.`));
    };
    main.append(label, out);
  } else {
    const label = el("label", "field");
    const input = el("input");
    label.append(el("span", "", "Start with"), input);
    const heat = el("input");
    heat.type = "range";
    heat.min = "0.1";
    heat.max = "2";
    heat.step = "0.1";
    heat.value = "0.8";
    const hl = el("label", "field");
    hl.append(el("span", "", "Creativity"), heat);
    const btn = el("button", "btn", "Write");
    const out = el("p", "writing");
    out.setAttribute("aria-live", "polite");
    btn.onclick = () => (out.textContent = detokenise(generate(m, input.value, Number(heat.value), 40)));
    main.append(label, hl, btn, out);
  }

  const about = el("details", "about");
  about.append(el("summary", "", "About this model"));
  const dl = el("dl");
  const row = (k: string, v: string) => v.trim() && dl.append(el("dt", "", k), el("dd", "", v));
  row("Made by", app.card.by);
  row("Good at", app.card.goodAt);
  row("Not good at", app.card.badAt);
  row("Learned from", `${app.facts.examples} examples`);
  if (app.facts.score) row(app.facts.scoreName || "Test score", app.facts.score);
  row("Trained", new Date(app.facts.trained).toLocaleDateString());
  about.append(dl, el("p", "note", "Zo can be wrong. Check what it says."));

  root.append(head, main, about);
}

const data = document.getElementById("zo-app");
if (data) start(JSON.parse(data.textContent || "{}") as LearnApp);
