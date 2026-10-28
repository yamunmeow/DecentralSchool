import leopardCss from "leopard/dist/index.min.css?inline";
import { buildRuntime, factoryFor, type ClassFactory } from "../code/build";
import { wireInput } from "../code/input";
import { scaleStage } from "../code/stage";
import { decodeProject } from "../code/link";
import type { RProject } from "../code/runtime";
import type { CodeProject } from "../code/types";
import css from "./codeplayer.css?inline";

/** Plays a Game Lab project full screen: a downloaded file, an APK, or a link. */

declare global {
  interface Window {
    DecentralCode: { run: (factory: ClassFactory) => void };
    onShellBack?: () => boolean;
  }
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = "") => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** The page's language (set by the studio), or the device's on the hosted page. */
const FR = /^fr/i.test(document.documentElement.lang || navigator.language || "");
const T = FR
  ? { start: "Jouer", stop: "Arrêter", full: "Plein écran", broken: "Ce projet n'a pas pu démarrer.", empty: "Ouvre un lien de l'Atelier de jeux envoyé par ton professeur ou un ami." }
  : { start: "Start", stop: "Stop", full: "Full screen", broken: "This project could not start.", empty: "Open a Game Lab link from your teacher or a friend." };

function start(project: CodeProject, factory: ClassFactory) {
  const style = document.createElement("style");
  style.textContent = leopardCss + css;
  document.head.appendChild(style);
  document.title = project.title;
  const app = document.getElementById("app")!;
  app.className = "cp";

  const bar = el("header", "cp-bar");
  const flag = el("button", "cp-btn cp-flag");
  flag.setAttribute("aria-label", T.start);
  flag.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M5 3v18" stroke="#2f7d32" stroke-width="2.4" stroke-linecap="round"/><path d="M6 4c4-2 6 2 10 0 2-1 3-1 3-1v9s-1 0-3 1c-4 2-6-2-10 0z" fill="#4cbf56" stroke="#2f7d32" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  const stop = el("button", "cp-btn cp-stop");
  stop.setAttribute("aria-label", T.stop);
  stop.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z" fill="#ec5959" stroke="#b84848" stroke-width="1.5"/></svg>`;
  const title = el("h1", "cp-title", project.title);
  const full = el("button", "cp-btn", "⛶");
  full.setAttribute("aria-label", T.full);
  bar.append(flag, stop, title, full);

  const wrap = el("main", "cp-stage-wrap");
  const box = el("div", "cp-stage-box");
  const stage = el("div", "cp-stage");
  box.append(stage);
  wrap.append(box);
  app.append(bar, wrap);

  let rp: RProject;
  try {
    rp = buildRuntime(project, factory, { onError: (t, m) => console.error(`${t}: ${m}`) });
  } catch (e) {
    stage.textContent = T.broken;
    console.error(e);
    return;
  }
  wireInput(rp, stage, {});

  scaleStage(box, stage);

  flag.addEventListener("click", () => rp.greenFlag());
  stop.addEventListener("click", () => rp.stopAll());
  full.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else app.requestFullscreen?.().catch(() => undefined);
  });
  window.onShellBack = () => false;

  if (project.touchPad && matchMedia("(pointer: coarse)").matches) {
    const pad = el("div", "cp-pad");
    const key = (name: string, label: string, cls: string) => {
      const b = el("button", `cp-key ${cls}`, label);
      b.setAttribute("aria-label", name);
      const on = (e: Event) => {
        e.preventDefault();
        rp.keyDown(name);
      };
      const off = (e: Event) => {
        e.preventDefault();
        rp.keyUp(name);
      };
      b.addEventListener("pointerdown", on);
      b.addEventListener("pointerup", off);
      b.addEventListener("pointercancel", off);
      b.addEventListener("pointerleave", off);
      return b;
    };
    pad.append(key("up arrow", "▲", "k-up"), key("left arrow", "◀", "k-left"), key("down arrow", "▼", "k-down"), key("right arrow", "▶", "k-right"), key("space", "space", "k-space"));
    app.append(pad);
    app.classList.add("has-pad");
  }
}

window.DecentralCode = {
  run(factory) {
    const json = document.getElementById("project")?.textContent || "{}";
    start(JSON.parse(json), factory);
  },
};

if (!document.getElementById("project")) {
  const hosted = /^https?:$/.test(location.protocol);
  if (hosted && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => undefined);
  window.addEventListener("hashchange", () => location.reload());
  try {
    const project = decodeProject(location.hash);
    start(project, factoryFor(project));
  } catch {
    document.getElementById("app")!.innerHTML = `<p class="cp-empty">${T.empty}</p>`;
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }
}
