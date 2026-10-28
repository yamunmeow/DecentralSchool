import { buildRound, checkTyped, orderAnswer, type Pad, type Step, type Task } from "../shared/tasks";
import type { Game, Passage } from "../shared/types";
import { beep, canSpeak, speak, speakLong, stopSpeaking, store } from "./device";
import { h, lines, mount } from "./dom";
import type { Strings } from "./i18n";

export interface Ctx {
  game: Game;
  t: Strings;
  root: HTMLElement;
  home: () => void;
}

export interface Progress {
  best: number;
  plays: number;
  stars: number;
  seen: string[];
  wrong: string[];
}

/** Whether "again" brings different questions: generated ones, or a bank bigger than a round. */
const moreThanARound = (g: Game) => {
  const n = g.settings.round;
  if (g.template === "quiz") return g.questions.length > n;
  if (g.template === "grammar") return g.items.length > n;
  if (g.template === "vocab") return g.words.length * g.modes.length > n;
  return g.template === "math" || g.template === "reading";
};

export const progressKey = (id: string) => `ds:p:${id}`;
export const loadProgress = (id: string): Progress => ({ best: 0, plays: 0, stars: 0, seen: [], wrong: [], ...store.get<Partial<Progress>>(progressKey(id), {}) });

interface Result {
  task: Task;
  ok: boolean;
}

interface View {
  el: HTMLElement;
  /** Shows the right answer and locks the question (time ran out). */
  reveal: () => void;
}

type Done = (ok: boolean) => void;

/** Window-level listeners for the current question only. */
let cleanups: (() => void)[] = [];
const cleanup = () => {
  cleanups.forEach((f) => f());
  cleanups = [];
};
function listen<K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void) {
  window.addEventListener(type, fn);
  cleanups.push(() => window.removeEventListener(type, fn));
}

const speakBtn = (text: string, lang: string, label: string, big = false) =>
  h("button", { class: `say${big ? " say-big" : ""}`, "aria-label": label, title: label, onclick: () => speak(text, lang) }, "🔊");

export function rightAnswer(task: Task, t: Strings): string {
  switch (task.k) {
    case "choice": return task.options[task.answer];
    case "tf": return task.ask === "judge" ? (task.answer ? t.correct : t.hasMistake) : task.ask === "said" ? (task.answer ? t.yes : t.no) : task.answer ? t.true : t.false;
    case "type": return task.accept[0];
    case "order": return orderAnswer(task);
    case "match": return task.pairs.map(([a, b]) => `${a} → ${b}`).join(" · ");
    case "spot": return `${task.words[task.wrong]} → ${task.fix}`;
  }
}

/* ---------- question views ---------- */

function choiceView(task: Extract<Task, { k: "choice" }>, done: Done): View {
  let locked = false;
  const lock = () => {
    locked = true;
    buttons.forEach((b) => (b.disabled = true));
    buttons[task.answer].classList.add("ok");
  };
  const buttons = task.options.map((o, i) =>
    h("button", {
      class: "opt",
      onclick: () => {
        if (locked) return;
        buttons[i].classList.add(i === task.answer ? "ok" : "bad");
        lock();
        done(i === task.answer);
      },
    }, h("span", { class: "opt-key" }, "ABCDEFGH"[i] || ""), h("span", { class: "opt-text" }, o)),
  );
  const long = task.options.some((o) => o.length > 28);
  return { el: h("div", { class: `opts${long ? " opts-long" : ""}` }, buttons), reveal: lock };
}

function tfView(task: Extract<Task, { k: "tf" }>, t: Strings, done: Done): View {
  const [yes, no] = task.ask === "judge" ? [t.correct, t.hasMistake] : task.ask === "said" ? [t.yes, t.no] : [t.true, t.false];
  let locked = false;
  const lock = () => {
    locked = true;
    a.disabled = b.disabled = true;
    (task.answer ? a : b).classList.add("ok");
  };
  const choose = (value: boolean, btn: HTMLButtonElement) => {
    if (locked) return;
    btn.classList.add(value === task.answer ? "ok" : "bad");
    lock();
    done(value === task.answer);
  };
  const a: HTMLButtonElement = h("button", { class: "opt tf tf-yes", onclick: () => choose(true, a) }, h("span", { class: "tf-icon" }, "✓"), yes);
  const b: HTMLButtonElement = h("button", { class: "opt tf tf-no", onclick: () => choose(false, b) }, h("span", { class: "tf-icon" }, "✗"), no);
  return { el: h("div", { class: "opts opts-tf" }, a, b), reveal: lock };
}

const PAD_EXTRA: Record<Pad, [string, string]> = { number: ["−", "."], fraction: ["−", "/"], time: [":", ""], text: ["", ""] };

function typeView(task: Extract<Task, { k: "type" }>, t: Strings, done: Done): View {
  let locked = false;
  let value = "";
  let box: HTMLElement;
  const shown = h("div", { class: "typed", role: "status", "aria-live": "polite" });
  const paint = () => {
    shown.textContent = value || " ";
    check.disabled = !value.trim();
  };
  const submit = () => {
    if (locked || !value.trim()) return;
    const ok = checkTyped(task, value.replace(/−/g, "-"));
    shown.classList.add(ok ? "ok" : "bad");
    lock();
    done(ok);
  };
  const lock = () => {
    locked = true;
    box.querySelectorAll("button, input").forEach((b) => ((b as HTMLButtonElement).disabled = true));
  };
  const check: HTMLButtonElement = h("button", { class: "btn btn-primary key-check", onclick: submit, disabled: true }, t.check);

  if (task.pad === "text") {
    const input = h("input", { class: "text-answer", type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: "false", enterkeyhint: "done", "aria-label": t.answer });
    input.addEventListener("input", () => {
      value = input.value;
      check.disabled = !value.trim();
    });
    input.addEventListener("keydown", (e) => e.key === "Enter" && submit());
    box = h("div", { class: "type-text" }, input, check);
    setTimeout(() => input.focus(), 50);
    return {
      el: box,
      reveal: () => {
        lock();
        input.classList.add("bad");
      },
    };
  }

  const press = (k: string) => {
    if (locked) return;
    beep("tap");
    if (k === "⌫") value = value.slice(0, -1);
    else if (value.length < 12) value += k;
    paint();
  };
  const key = (k: string, cls = "") => (k ? h("button", { class: `key ${cls}`, onclick: () => press(k), "aria-label": k === "⌫" ? t.clear : k }, k) : h("span", { class: "key key-blank" }));
  const [x1, pad2] = PAD_EXTRA[task.pad];
  // French and Spanish write decimals with a comma; checking reads either.
  const x2 = pad2 === "." ? t.decimal : pad2;
  box = h(
    "div",
    { class: "pad" },
    shown,
    h("div", { class: "keys" }, ["7", "8", "9"].map((k) => key(k)), key("⌫", "key-fn"), ["4", "5", "6"].map((k) => key(k)), key(x1, "key-fn"), ["1", "2", "3"].map((k) => key(k)), key(x2, "key-fn"), key("0", "key-zero"), check),
  );
  listen("keydown", (e) => {
    if (e.key === "Enter") submit();
    else if (e.key === "Backspace") press("⌫");
    else if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === "-" && x1 === "−") press("−");
    else if ((e.key === "." || e.key === ",") && pad2 === ".") press(x2);
    else if (e.key === "/" && x2 === "/") press("/");
    else if (e.key === ":" && x1 === ":") press(":");
  });
  paint();
  return {
    el: box,
    reveal: () => {
      lock();
      shown.classList.add("bad");
    },
  };
}

function orderView(task: Extract<Task, { k: "order" }>, t: Strings, done: Done): View {
  let locked = false;
  const tiles = task.items.map((text, id) => ({ text, id }));
  let pool = scramble(tiles);
  let placed: typeof tiles = [];
  const kind = task.join === "" ? "letters" : task.join === " " ? "words" : "lines";
  const answerRow = h("div", { class: `tiles tiles-answer tiles-${kind}` });
  const poolRow = h("div", { class: `tiles tiles-pool tiles-${kind}` });
  const check: HTMLButtonElement = h("button", { class: "btn btn-primary", disabled: true, onclick: () => submit() }, t.check);
  const tile = (x: (typeof tiles)[number], from: "pool" | "placed") =>
    h("button", {
      class: "tile",
      onclick: () => {
        if (locked) return;
        beep("tap");
        if (from === "pool") {
          pool = pool.filter((y) => y !== x);
          placed = [...placed, x];
        } else {
          placed = placed.filter((y) => y !== x);
          pool = [...pool, x];
        }
        paint();
      },
    }, kind === "lines" && from === "placed" ? h("span", { class: "tile-n" }, placed.indexOf(x) + 1) : null, x.text);
  const paint = () => {
    answerRow.textContent = "";
    poolRow.textContent = "";
    placed.forEach((x) => answerRow.appendChild(tile(x, "placed")));
    if (!placed.length) answerRow.appendChild(h("span", { class: "tiles-hint" }, "…"));
    pool.forEach((x) => poolRow.appendChild(tile(x, "pool")));
    check.disabled = pool.length > 0;
  };
  const submit = () => {
    if (locked || pool.length) return;
    const ok = placed.every((x, i) => x.text === task.items[i]);
    answerRow.classList.add(ok ? "ok" : "bad");
    lock();
    done(ok);
  };
  const solution = h("div", { class: `tiles tiles-solution tiles-${kind}`, hidden: true }, task.items.map((x, i) => h("span", { class: "tile tile-ok" }, kind === "lines" ? h("span", { class: "tile-n" }, i + 1) : null, x)));
  const lock = () => {
    locked = true;
    check.disabled = true;
    el.querySelectorAll(".tile").forEach((b) => ((b as HTMLButtonElement).disabled = true));
    if (!answerRow.classList.contains("ok")) solution.hidden = false;
  };
  const el = h("div", { class: "order" }, answerRow, poolRow, solution, h("div", { class: "row-end" }, check));
  paint();
  return {
    el,
    reveal: () => {
      answerRow.classList.add("bad");
      lock();
    },
  };
}

function scramble<T>(items: T[]): T[] {
  const out = items.slice();
  for (let n = 0; n < 8; n++) {
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    if (out.some((x, i) => x !== items[i])) break;
  }
  return out;
}

function matchView(task: Extract<Task, { k: "match" }>, done: Done): View {
  let mistakes = 0;
  let matched = 0;
  let chosen: { side: 0 | 1; i: number; btn: HTMLButtonElement } | null = null;
  const make = (side: 0 | 1) =>
    scramble(task.pairs.map((p, i) => ({ text: p[side], i }))).map((x) => {
      const btn: HTMLButtonElement = h("button", { class: "opt match-opt", onclick: () => tap(side, x.i, btn) }, x.text);
      return btn;
    });
  const tap = (side: 0 | 1, i: number, btn: HTMLButtonElement) => {
    if (btn.disabled) return;
    if (!chosen || chosen.side === side) {
      chosen?.btn.classList.remove("picked");
      chosen = { side, i, btn };
      btn.classList.add("picked");
      beep("tap");
      return;
    }
    const other = chosen;
    chosen = null;
    other.btn.classList.remove("picked");
    if (other.i === i) {
      for (const b of [btn, other.btn]) {
        b.classList.add("ok");
        b.disabled = true;
      }
      beep("tap");
      if (++matched === task.pairs.length) done(mistakes <= 1);
    } else {
      mistakes++;
      beep("wrong");
      for (const b of [btn, other.btn]) {
        b.classList.add("bad");
        setTimeout(() => b.classList.remove("bad"), 450);
      }
    }
  };
  const left = make(0);
  const right = make(1);
  const el = h("div", { class: "match" }, h("div", { class: "match-col" }, left), h("div", { class: "match-col" }, right));
  return {
    el,
    reveal: () => {
      [...left, ...right].forEach((b) => (b.disabled = true));
      el.after(h("ul", { class: "pairs-solution" }, task.pairs.map(([a, b]) => h("li", null, h("strong", null, a), " → ", b))));
    },
  };
}

function spotView(task: Extract<Task, { k: "spot" }>, t: Strings, done: Done): View {
  let locked = false;
  const fixRow = h("div", { class: "fix", hidden: true });
  const words = task.words.map((w, i) =>
    h("button", {
      class: "word",
      onclick: () => {
        if (locked) return;
        if (i !== task.wrong) {
          words[i].classList.add("bad");
          reveal();
          done(false);
          return;
        }
        words[i].classList.add("ok");
        if (!task.options.length) {
          finish();
          done(true);
          return;
        }
        locked = true;
        beep("tap");
        fixRow.hidden = false;
        fixRow.append(
          h("p", { class: "ask" }, t.chooseFix),
          h("div", { class: "opts" }, task.options.map((o) => {
            const b: HTMLButtonElement = h("button", {
              class: "opt",
              onclick: () => {
                const ok = o === task.fix;
                b.classList.add(ok ? "ok" : "bad");
                fixRow.querySelectorAll("button").forEach((x) => {
                  x.disabled = true;
                  if (x.textContent === task.fix) x.classList.add("ok");
                });
                finish();
                done(ok);
              },
            }, o);
            return b;
          })),
        );
      },
    }, w),
  );
  const finish = () => {
    locked = true;
    words.forEach((w) => (w.disabled = true));
  };
  const reveal = () => {
    finish();
    words[task.wrong].classList.add("ok");
    fixRow.hidden = false;
    fixRow.textContent = "";
    fixRow.append(h("p", { class: "fix-show" }, h("s", null, task.words[task.wrong]), " → ", h("strong", null, task.fix)));
  };
  return { el: h("div", { class: "spot" }, h("div", { class: "sentence" }, words), fixRow), reveal };
}

/* ---------- reading ---------- */

function passageBody(p: Passage, lang: string, t: Strings) {
  let speaking = false;
  const btn: HTMLButtonElement = h("button", {
    class: "btn btn-soft btn-sm",
    onclick: () => {
      speaking = !speaking;
      if (speaking) speakLong(p.text, lang, () => {
        speaking = false;
        btn.textContent = `🔊 ${t.readAloud}`;
      });
      else stopSpeaking();
      btn.textContent = speaking ? `■ ${t.stop}` : `🔊 ${t.readAloud}`;
    },
  }, `🔊 ${t.readAloud}`);
  const paras = p.text.split(/\n\s*\n|\n/).map((s) => s.trim()).filter(Boolean);
  return h("article", { class: "passage" }, p.title && h("h2", null, p.title), canSpeak() && btn, paras.map((para) => h("p", null, para)));
}

function lookBack(p: Passage, lang: string, t: Strings) {
  const close = () => {
    stopSpeaking();
    sheet.remove();
  };
  const sheet = h("div", { class: "sheet", role: "dialog", "aria-modal": "true" }, h("div", { class: "sheet-inner" }, h("button", { class: "sheet-close", onclick: close, "aria-label": t.close }, "✕"), passageBody(p, lang, t)));
  sheet.addEventListener("click", (e) => e.target === sheet && close());
  document.body.appendChild(sheet);
}

/** In-page yes/no: native confirm() shows the page's address, which means nothing to a student. */
function confirmSheet(t: Strings, text: string, onYes: () => void) {
  const close = () => sheet.remove();
  const sheet = h(
    "div",
    { class: "sheet sheet-center", role: "alertdialog", "aria-modal": "true" },
    h("div", { class: "sheet-inner confirm" }, h("p", { class: "lead" }, text), h("div", { class: "confirm-actions" }, h("button", { class: "btn btn-ghost", onclick: close }, t.no), h("button", { class: "btn btn-primary", onclick: () => (close(), onYes()) }, t.yes))),
  );
  sheet.addEventListener("click", (e) => e.target === sheet && close());
  document.body.appendChild(sheet);
  (sheet.querySelector(".btn-primary") as HTMLButtonElement).focus();
}

/* ---------- the round ---------- */

export function startRound(ctx: Ctx, only?: string[]) {
  const { game, t, root } = ctx;
  const s = game.settings;
  const progress = loadProgress(game.id);
  const steps: Step[] = buildRound(game, { seen: new Set(progress.seen), only, canSpeak: canSpeak() });
  const total = steps.filter((x) => x.k !== "read").length;
  if (!total) {
    mount(root, h("main", { class: "screen center" }, h("p", { class: "lead" }, t.empty), h("button", { class: "btn btn-primary", onclick: ctx.home }, t.home)));
    return;
  }

  let at = 0;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let lives = s.lives || 0;
  let timer = 0;
  const results: Result[] = [];
  const passages = game.template === "reading" ? game.passages : [];
  let inRound = true;

  window.onShellBack = () => {
    if (!inRound) return false;
    if (document.querySelector(".sheet")) document.querySelector(".sheet")!.remove();
    else askQuit();
    return true;
  };
  const askQuit = () => (results.length ? confirmSheet(t, t.quit, quit) : quit());
  const quit = () => {
    inRound = false;
    clearTimeout(timer);
    cleanup();
    stopSpeaking();
    ctx.home();
  };

  const bar = () =>
    h(
      "header",
      { class: "bar" },
      h("button", { class: "bar-close", "aria-label": t.home, onclick: askQuit }, "✕"),
      h("div", { class: "meter", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": total, "aria-valuenow": results.length }, h("span", { style: `width:${(results.length / total) * 100}%` })),
      s.lives > 0 && h("span", { class: "hearts", "aria-label": `${lives} ♥` }, "♥".repeat(Math.max(0, lives)), h("span", { class: "hearts-lost" }, "♥".repeat(Math.max(0, s.lives - lives)))),
      h("span", { class: "points", "aria-label": t.score }, "★ ", score),
    );

  const next = () => {
    clearTimeout(timer);
    cleanup();
    stopSpeaking();
    if (at >= steps.length || (s.lives > 0 && lives <= 0)) return finish();
    const step = steps[at++];
    if (step.k === "read") showRead(passages[step.passage]);
    else showTask(step);
  };

  const showRead = (p: Passage) => {
    mount(root, bar(), h("main", { class: "screen" }, passageBody(p, s.speech, t), h("div", { class: "row-end sticky" }, h("button", { class: "btn btn-primary btn-big", onclick: next }, `${t.readDone} →`))));
  };

  const showTask = (task: Task) => {
    const ask = task.ask ? t.ask[task.ask] : t.kind[task.k];
    const feedback = h("div", { class: "feedback-slot" });
    let answered = false;
    const done: Done = (ok) => {
      if (answered) return;
      answered = true;
      clearTimeout(timer);
      cleanup();
      timeBar?.classList.add("stopped");
      results.push({ task, ok });
      if (ok) {
        streak++;
        bestStreak = Math.max(bestStreak, streak);
        score += 10 + Math.min(streak - 1, 5) * 2;
      } else {
        streak = 0;
        if (s.lives > 0) lives--;
      }
      beep(ok ? "right" : "wrong");
      const header = root.querySelector(".bar");
      if (header) header.replaceWith(bar());
      if (!s.instant) {
        setTimeout(next, 450);
        return;
      }
      const praise = t.great[Math.floor(Math.random() * t.great.length)];
      const nextBtn: HTMLButtonElement = h("button", { class: "btn btn-primary btn-big", onclick: next }, `${t.next} →`);
      feedback.appendChild(
        h(
          "div",
          { class: `feedback ${ok ? "is-ok" : "is-bad"}`, role: "status" },
          h("p", { class: "feedback-title" }, ok ? `✓ ${praise}` : `✗ ${t.notQuite}`, ok && streak >= 3 ? h("span", { class: "streak" }, ` 🔥 ${streak} ${t.streak}`) : null),
          !ok && h("p", null, h("span", { class: "muted" }, `${t.answer}: `), h("strong", null, rightAnswer(task, t))),
          task.explain && h("p", { class: "explain" }, lines(task.explain)),
          nextBtn,
        ),
      );
      setTimeout(() => {
        nextBtn.focus({ preventScroll: true });
        feedback.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 30);
      listen("keydown", (e) => e.key === "Enter" && next());
    };

    let view: View;
    switch (task.k) {
      case "choice": view = choiceView(task, done); break;
      case "tf": view = tfView(task, t, done); break;
      case "type": view = typeView(task, t, done); break;
      case "order": view = orderView(task, t, done); break;
      case "match": view = matchView(task, done); break;
      case "spot": view = spotView(task, t, done); break;
    }

    const prompt =
      task.k === "spot"
        ? null
        : task.listen
          ? h("div", { class: "prompt prompt-listen" }, speakBtn(task.speak || task.prompt, s.speech, t.listen, true))
          : task.prompt
            ? h("div", { class: `prompt${task.big ? " prompt-big" : ""}` }, task.emoji && h("span", { class: "prompt-emoji" }, task.emoji), h("p", null, lines(task.prompt)), canSpeak() && speakBtn(task.speak || task.prompt, s.speech, t.listen))
            : task.emoji
              ? h("div", { class: "prompt" }, h("span", { class: "prompt-emoji" }, task.emoji), task.speak && canSpeak() && speakBtn(task.speak, s.speech, t.listen))
              : null;

    const timeBar = s.timer > 0 ? h("div", { class: "timer" }, h("span", { style: `animation-duration:${s.timer}s` })) : null;
    const p = task.passage !== undefined ? passages[task.passage] : undefined;

    mount(
      root,
      bar(),
      h(
        "main",
        { class: "screen" },
        timeBar,
        h("p", { class: "ask" }, ask, h("span", { class: "count" }, `${results.length + 1} ${t.of} ${total}`)),
        prompt,
        view.el,
        p && h("button", { class: "link-btn", onclick: () => lookBack(p, s.speech, t) }, `📖 ${t.lookBack}`),
        feedback,
      ),
    );
    if (task.listen) setTimeout(() => speak(task.speak || task.prompt, s.speech), 250);
    if (s.timer > 0)
      timer = window.setTimeout(() => {
        view.reveal();
        feedback.before(h("p", { class: "time-up" }, `⏰ ${t.timeUp}`));
        done(false);
      }, s.timer * 1000);
  };

  const finish = () => {
    inRound = false;
    cleanup();
    const right = results.filter((r) => r.ok).length;
    const pct = right / Math.max(1, total);
    const stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0;
    const outOfLives = s.lives > 0 && lives <= 0;
    const wrongKeys = results.filter((r) => !r.ok).map((r) => r.task.key);
    const rightKeys = new Set(results.filter((r) => r.ok).map((r) => r.task.key));
    const before = loadProgress(game.id);
    const newBest = score > before.best;
    const seen = Array.from(new Set([...before.seen, ...steps.map((x) => x.key)]));
    store.set(progressKey(game.id), {
      best: Math.max(before.best, score),
      plays: before.plays + 1,
      stars: Math.max(before.stars, stars),
      // Rotate: once every question has been seen, start the cycle again.
      seen: seen.length > 3000 ? seen.slice(-3000) : seen,
      wrong: Array.from(new Set([...before.wrong.filter((k) => !rightKeys.has(k)), ...wrongKeys])).slice(-200),
    } satisfies Progress);
    beep(stars >= 2 ? "done" : "tap");

    const missed = results.filter((r) => !r.ok);
    mount(
      root,
      h(
        "main",
        { class: "screen center end" },
        stars === 3 && confetti(),
        h("div", { class: "stars", "aria-label": `${stars} / 3` }, [0, 1, 2].map((i) => h("span", { class: i < stars ? "star on" : "star", style: `animation-delay:${0.15 * i}s` }, "★"))),
        h("h1", null, outOfLives ? t.outOfLives : `${right} ${t.of} ${total}`),
        h("p", { class: "end-score" }, h("span", null, `${t.score} `), h("strong", null, score), newBest ? h("span", { class: "badge" }, `🏆 ${t.best}!`) : h("span", { class: "muted" }, ` · ${t.best} ${Math.max(before.best, score)}`)),
        bestStreak >= 3 && h("p", { class: "muted" }, `🔥 ${bestStreak} ${t.streak}`),
        h(
          "div",
          { class: "end-actions" },
          h("button", { class: "btn btn-primary btn-big", onclick: () => startRound(ctx) }, `↻ ${moreThanARound(ctx.game) ? t.newSet : t.again}`),
          missed.length > 0 && h("button", { class: "btn btn-soft btn-big", onclick: () => startRound(ctx, Array.from(new Set(missed.map((r) => r.task.key)))) }, `🎯 ${t.practise}`),
          h("button", { class: "btn btn-ghost", onclick: ctx.home }, t.home),
        ),
        missed.length
          ? h("section", { class: "review" }, h("h2", null, t.mistakes), h("ul", null, missed.map((r) => h("li", null, h("p", { class: "review-q" }, reviewPrompt(r.task, t)), h("p", { class: "review-a" }, "✓ ", rightAnswer(r.task, t)), r.task.explain && h("p", { class: "muted" }, lines(r.task.explain))))))
          : h("p", { class: "lead" }, `🎉 ${t.allRight}`),
      ),
    );
  };

  next();
}

function reviewPrompt(task: Task, t: Strings): string {
  if (task.k === "spot") return task.prompt;
  if (task.listen) return `🔊 ${t.listen}`;
  if (task.k === "order" && !task.prompt) return task.ask ? t.ask[task.ask] : t.kind.order;
  if (task.k === "match") return t.kind.match;
  return task.prompt.replace(/\n/g, " ");
}

function confetti() {
  const colors = ["#a693de", "#80b6dd", "#eba57f", "#70c4a2", "#e3c45d", "#e693a8"];
  return h(
    "div",
    { class: "confetti", "aria-hidden": "true" },
    Array.from({ length: 28 }, (_, i) => h("i", { style: `left:${(i * 37) % 100}%;background:${colors[i % colors.length]};animation-delay:${(i % 7) * 0.12}s;animation-duration:${1.6 + (i % 5) * 0.25}s` })),
  );
}

