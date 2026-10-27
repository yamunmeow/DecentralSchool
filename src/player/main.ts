import { decodeGame } from "../shared/decode";
import { normalize } from "../shared/normalize";
import type { CustomGame, Game } from "../shared/types";
import { sound, store } from "./device";
import { h, mount } from "./dom";
import { STRINGS } from "./i18n";
import { loadProgress, startRound, type Ctx } from "./play";
import css from "./player.css?inline";

interface Saved {
  id: string;
  title: string;
  emoji: string;
  tint: string;
  hash: string;
  at: number;
}

const LIBRARY = "ds:lib";
const SOUND = "ds:sound";

function boot() {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  const root = document.getElementById("app")!;
  sound.on = store.get(SOUND, true);

  const embedded = document.getElementById("game");
  const hosted = !embedded && /^https?:$/.test(location.protocol);
  if (hosted && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => undefined);
  window.addEventListener("hashchange", () => location.reload());

  if (embedded) return open(root, normalize(JSON.parse(embedded.textContent || "{}")), false);
  if (location.hash.length > 4) {
    try {
      const game = normalize(decodeGame(location.hash));
      remember(game, location.hash);
      return open(root, game, hosted);
    } catch {
      return mount(root, h("main", { class: "screen center" }, h("div", { class: "hero-emoji" }, "🧩"), h("p", { class: "lead" }, STRINGS.en.broken), library(root)));
    }
  }
  mount(root, h("main", { class: "screen" }, library(root)));
}

function remember(game: Game, hash: string) {
  const list = store.get<Saved[]>(LIBRARY, []).filter((g) => g.id !== game.id);
  list.unshift({ id: game.id, title: game.title, emoji: game.emoji, tint: game.tint, hash, at: Date.now() });
  store.set(LIBRARY, list.slice(0, 60));
}

function library(root: HTMLElement): HTMLElement {
  const t = STRINGS.en;
  const list = store.get<Saved[]>(LIBRARY, []);
  return h(
    "section",
    { class: "library" },
    h("h1", null, t.yourGames),
    list.length
      ? h("ul", { class: "lib-list" }, list.map((g) =>
          h("li", { "data-tint": g.tint }, h("a", { href: g.hash, class: "lib-game" }, h("span", { class: "lib-emoji" }, g.emoji), h("span", { class: "lib-title" }, g.title)),
            h("button", {
              class: "lib-remove",
              "aria-label": `${t.remove} ${g.title}`,
              onclick: () => {
                store.set(LIBRARY, store.get<Saved[]>(LIBRARY, []).filter((x) => x.id !== g.id));
                store.remove(`ds:p:${g.id}`);
                mount(root, h("main", { class: "screen" }, library(root)));
              },
            }, "✕"))))
      : h("p", { class: "lead muted" }, t.noGames),
  );
}

function open(root: HTMLElement, game: Game, hosted: boolean) {
  document.documentElement.dataset.tint = game.tint;
  document.documentElement.lang = game.settings.ui;
  document.title = `${game.emoji} ${game.title}`;
  if (game.template === "custom") return runCustom(root, game);
  const t = STRINGS[game.settings.ui] || STRINGS.en;
  sound.on = sound.on && game.settings.sound;
  const ctx: Ctx = { game, t, root, home: () => home(ctx, hosted) };
  home(ctx, hosted);
}

function home(ctx: Ctx, hosted: boolean) {
  const { game, t, root } = ctx;
  window.onShellBack = () => false;
  const p = loadProgress(game.id);
  const soundBtn: HTMLButtonElement = h("button", {
    class: "chip",
    "aria-pressed": String(sound.on),
    onclick: () => {
      sound.on = !sound.on;
      store.set(SOUND, sound.on);
      soundBtn.setAttribute("aria-pressed", String(sound.on));
      soundBtn.textContent = `${sound.on ? "🔊" : "🔇"} ${t.sound}`;
    },
  }, `${sound.on ? "🔊" : "🔇"} ${t.sound}`);
  mount(
    root,
    h(
      "main",
      { class: "screen center home" },
      h("div", { class: "hero-emoji" }, game.emoji),
      h("h1", null, game.title),
      game.subtitle && h("p", { class: "lead" }, game.subtitle),
      p.plays > 0 && h("p", { class: "home-stats" }, h("span", null, "★".repeat(p.stars) + "☆".repeat(3 - p.stars)), h("span", null, `${t.best}: ${p.best}`)),
      h(
        "div",
        { class: "end-actions" },
        h("button", { class: "btn btn-primary btn-big", onclick: () => startRound(ctx) }, `▶ ${t.play}`),
        p.wrong.length > 0 && h("button", { class: "btn btn-soft btn-big", onclick: () => startRound(ctx, p.wrong) }, `🎯 ${t.practise}`),
      ),
      h("div", { class: "home-foot" }, soundBtn, hosted && h("a", { class: "chip", href: "./" }, `☰ ${t.yourGames}`)),
    ),
  );
}

/** Teacher-made free-form games run in a sandboxed frame with the network off. */
function runCustom(root: HTMLElement, game: CustomGame) {
  window.onShellBack = () => false;
  const guard =
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:">` +
    `<script>try{localStorage.getItem("x")}catch(e){var m={};Object.defineProperty(window,"localStorage",{value:{getItem:function(k){return k in m?m[k]:null},setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]},clear:function(){m={}},key:function(i){return Object.keys(m)[i]||null},get length(){return Object.keys(m).length}}})}</script>`;
  const html = /<head[^>]*>/i.test(game.html) ? game.html.replace(/<head[^>]*>/i, (m) => m + guard) : guard + game.html;
  const frame = h("iframe", { class: "custom-frame", sandbox: "allow-scripts allow-modals", title: game.title });
  frame.srcdoc = html;
  mount(root, frame);
  document.body.classList.add("is-custom");
}

boot();
