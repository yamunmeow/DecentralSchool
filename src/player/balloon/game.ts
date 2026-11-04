import { buildRound, type Task } from "../../shared/tasks";
import type { BalloonGame } from "../../shared/types";
import { beep, canSpeak, speak, stopSpeaking } from "../device";
import { h, lines, mount } from "../dom";
import { cleanup, confirmSheet, endScreen, loadProgress, promptView, rightAnswer, taskView, type Ctx, type Done, type Result } from "../play";
import { COLORS, SPRITES, type SpriteName } from "./sprites";

/**
 * Balloon Blast: balloons drift down one after another, the lowest always first in
 * line. Every right answer loads a cannonball onto the rack; Fire shoots the leading
 * balloon. A balloon that reaches the grass costs a heart.
 */

type Color = (typeof COLORS)[number];
type Images = Record<SpriteName, HTMLImageElement>;

/** Seconds a balloon takes to come down, and between two balloons, for each speed. */
const PACE = { 1: { fall: 34, gap: 8.5 }, 2: { fall: 25, gap: 6 }, 3: { fall: 17, gap: 4.2 } };

/** The stage is always as wide as the art; its height follows the screen. */
const W = 1080;
const ART_H = 1920;
const MUZZLE = { x: 304, y: 1786 };
/** The barrel points up and a little to the right. */
const AXIS = { x: 0.136, y: -0.99 };
/** Which way the ball is flying in the art; the trail streaks sit behind it. */
const TRAIL_ANGLE = Math.atan2(-56, 31);
const BALL = SPRITES.ball;
const BALL_C = { x: BALL.x + BALL.w / 2, y: BALL.y + BALL.h / 2 };
/** Balloon bottoms land this far above the bottom edge. */
const GRASS = 46;

interface Balloon {
  x: number;
  /** 0 just above the sky, 1 on the grass. */
  p: number;
  color: Color;
  phase: number;
  age: number;
  state: "fly" | "pop" | "land";
  /** Clock time it popped or landed. */
  at: number;
  /** A cannonball is already on its way. */
  aimed: boolean;
}

interface Shot {
  target: Balloon;
  t: number;
  dur: number;
}

interface Float {
  x: number;
  y: number;
  text: string;
  at: number;
}

let loading: Promise<Images> | null = null;

/** Downloads and apps carry the pictures inline (#sprites); the hosted player loads them from balloon/. */
function loadImages(): Promise<Images> {
  if (loading) return loading;
  let inline: Record<string, string> = {};
  try {
    inline = JSON.parse(document.getElementById("sprites")?.textContent || "{}");
  } catch {
    /* use the files */
  }
  const names = Object.keys(SPRITES) as SpriteName[];
  loading = Promise.all(
    names.map(
      (name) =>
        new Promise<[SpriteName, HTMLImageElement]>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve([name, img]);
          img.onerror = reject;
          img.src = inline[name] || `balloon/${name}.webp`;
        }),
    ),
  ).then((list) => Object.fromEntries(list) as Images);
  loading.catch(() => (loading = null));
  return loading;
}

/** Where the rack holds each loaded ball: the art's row of four, then a pyramid on top. */
const SLOTS = (() => {
  const row = ([1, 2, 3, 4] as const).map((i) => {
    const r = SPRITES[`ammo${i}`];
    return { x: r.x + r.w / 2, y: r.y + r.h / 2, sprite: `ammo${i}` as SpriteName };
  });
  const slots = [...row];
  for (let below = row; below.length > 1; ) {
    const up = below.slice(1).map((b, j) => ({ x: (below[j].x + b.x) / 2, y: Math.min(below[j].y, b.y) - 50, sprite: below[(j + 1) % below.length].sprite }));
    slots.push(...up);
    below = up;
  }
  return slots;
})();

export function startBalloons(ctx: Ctx, only?: string[]) {
  const { t, root } = ctx;
  const game = ctx.game as BalloonGame;
  const s = game.settings;
  const pace = PACE[game.speed] || PACE[1];
  const total = Math.max(1, s.round);
  const progress = loadProgress(game.id);
  const make = (seen?: Set<string>) => buildRound(game, { seen, only, canSpeak: canSpeak() }).filter((x): x is Task => x.k !== "read");
  let queue = make(new Set(progress.seen));
  if (!queue.length) {
    mount(root, h("main", { class: "screen center" }, h("p", { class: "lead" }, t.empty), h("button", { class: "btn btn-primary", onclick: ctx.home }, t.home)));
    return;
  }

  let qi = 0;
  let balloons: Balloon[] = [];
  let shots: Shot[] = [];
  let floats: Float[] = [];
  const loadedAt: number[] = [];
  const results: Result[] = [];
  const keys = new Set<string>();
  let spawned = 0;
  let popped = 0;
  let landed = 0;
  let balls = 0;
  let lives = s.lives || 0;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let clock = 0;
  let sinceSpawn = 0;
  let lastX = W / 2;
  let lastColor: Color | null = null;
  let recoilAt = -1;
  let ending = false;
  let over = false;
  let raf = 0;
  let last = 0;
  let taskId = 0;
  let hintTimer = 0;
  let images: Images | null = null;

  const canvas = h("canvas", { class: "bln-canvas", "aria-hidden": "true" });
  const g = canvas.getContext("2d")!;
  const hint = h("p", { class: "bln-hint", role: "status" }, t.howTo);
  const count = h("span", { class: "bln-count" }, "0");
  const fireBtn: HTMLButtonElement = h("button", { class: "bln-fire", type: "button", onclick: () => fire() }, h("span", { class: "bln-fire-label" }, t.fire), count);
  const stage = h("div", { class: "bln-stage" }, canvas, hint, fireBtn);
  const panel = h("section", { class: "bln-panel", "aria-live": "polite" });
  let header = bar();
  const body = h("div", { class: "bln-body" }, stage, panel);

  function bar() {
    return h(
      "header",
      { class: "bar" },
      h("button", { class: "bar-close", "aria-label": t.home, onclick: askQuit }, "✕"),
      h("div", { class: "meter", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": total, "aria-valuenow": popped + landed }, h("span", { style: `width:${((popped + landed) / total) * 100}%` })),
      s.lives > 0 && h("span", { class: "hearts", "aria-label": `${lives} ♥` }, "♥".repeat(Math.max(0, lives)), h("span", { class: "hearts-lost" }, "♥".repeat(Math.max(0, s.lives - lives)))),
      h("span", { class: "points", "aria-label": t.score }, "★ ", score),
    );
  }
  const refreshBar = () => {
    const next = bar();
    header.replaceWith(next);
    header = next;
  };

  /* ---------- geometry (world units: the stage is W wide and H tall) ---------- */

  let H = ART_H;
  const size = () => Math.max(0.55, Math.min(0.82, H / 1500));
  const lift = () => H - ART_H;
  const pathH = () => 300 * size();
  const balloonPos = (b: Balloon) => ({
    x: b.x + Math.sin(b.age * 0.9 + b.phase) * 26,
    y: -pathH() / 2 - 20 + b.p * (H - GRASS + 20),
  });
  const muzzle = () => ({ x: MUZZLE.x, y: MUZZLE.y + lift() });
  const lead = () => balloons.filter((b) => b.state === "fly" && !b.aimed && balloonPos(b).y > -pathH() / 4).sort((a, b) => b.p - a.p)[0];

  const resize = () => {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    H = (r.height / r.width) * W;
  };

  /* ---------- the game ---------- */

  const showHint = (text: string, ms = 1800) => {
    clearTimeout(hintTimer);
    hint.textContent = text;
    hint.hidden = false;
    hintTimer = window.setTimeout(() => (hint.hidden = true), ms);
  };

  let fireState = "";
  const updateFire = () => {
    const state = `${balls}:${!balls || !lead()}`;
    if (state === fireState) return;
    fireState = state;
    count.textContent = String(balls);
    fireBtn.classList.toggle("is-empty", !balls);
    fireBtn.setAttribute("aria-disabled", String(!balls || !lead()));
    fireBtn.setAttribute("aria-label", `${t.fire} · ${balls} ${t.balls}`);
  };

  const spawn = () => {
    let x = 150 + Math.random() * (W - 300);
    for (let i = 0; i < 12 && Math.abs(x - lastX) < 240; i++) x = 150 + Math.random() * (W - 300);
    const color = COLORS.filter((c) => c !== lastColor)[Math.floor(Math.random() * (COLORS.length - 1))];
    balloons.push({ x, p: 0, color, phase: Math.random() * 6.28, age: 0, state: "fly", at: 0, aimed: false });
    lastX = x;
    lastColor = color;
    spawned++;
    sinceSpawn = 0;
  };

  function fire() {
    if (over) return;
    if (!balls) return showHint(t.noBalls);
    const target = lead();
    if (!target) return;
    balls--;
    target.aimed = true;
    const m = muzzle();
    const p = balloonPos(target);
    shots.push({ target, t: 0, dur: 0.18 + Math.hypot(p.x - m.x, p.y - m.y) / 3200 });
    recoilAt = clock;
    beep("fire");
    updateFire();
  }

  const pop = (b: Balloon) => {
    b.state = "pop";
    b.at = clock;
    popped++;
    score += 10;
    const p = balloonPos(b);
    floats.push({ x: p.x, y: p.y - 40, text: "+10", at: clock });
    beep("pop");
    refreshBar();
  };

  const land = (b: Balloon) => {
    b.state = "land";
    b.at = clock;
    landed++;
    if (s.lives > 0) lives--;
    beep("wrong");
    refreshBar();
  };

  const update = (dt: number) => {
    clock += dt;
    if (spawned < total && !ending) {
      sinceSpawn += dt;
      const flying = balloons.some((b) => b.state === "fly");
      if ((!spawned && sinceSpawn > 0.6) || sinceSpawn >= pace.gap || (spawned && !flying && sinceSpawn > 1.2)) spawn();
    }
    for (const b of balloons)
      if (b.state === "fly") {
        b.age += dt;
        b.p += dt / pace.fall;
        if (b.p >= 1) land(b);
      }
    for (const shot of shots) {
      if (shot.target.state === "land") {
        const next = lead();
        if (next) (next.aimed = true), (shot.target = next);
        else (shot.t = -1), balls++;
      }
      if (shot.t < 0) continue;
      shot.t += dt;
      if (shot.t >= shot.dur && shot.target.state === "fly") {
        pop(shot.target);
        shot.t = -1;
      }
    }
    shots = shots.filter((x) => x.t >= 0);
    balloons = balloons.filter((b) => b.state === "fly" || clock - b.at < (b.state === "pop" ? 0.5 : 0.7));
    floats = floats.filter((f) => clock - f.at < 0.9);
    updateFire();
    if (!ending && ((spawned >= total && !balloons.length && !shots.length) || (s.lives > 0 && lives <= 0))) {
      ending = true;
      window.setTimeout(finish, 900);
    }
  };

  /* ---------- drawing ---------- */

  const sprite = (name: SpriteName, cx: number, cy: number, scale: number, opts: { rot?: number; alpha?: number; sx?: number; sy?: number } = {}) => {
    const img = images![name];
    const r = SPRITES[name];
    const w = r.w * scale * (opts.sx ?? 1);
    const hh = r.h * scale * (opts.sy ?? 1);
    g.save();
    g.globalAlpha = opts.alpha ?? 1;
    g.translate(cx, cy);
    if (opts.rot) g.rotate(opts.rot);
    g.drawImage(img, -w / 2, -hh / 2, w, hh);
    g.restore();
  };

  /** A sprite where the art put it, raised to the stage's bottom edge. */
  const placed = (name: SpriteName, dx = 0, dy = 0) => {
    const r = SPRITES[name];
    g.drawImage(images![name], r.x + dx, r.y + lift() + dy, r.w, r.h);
  };

  const shotPos = (shot: Shot) => {
    const a = muzzle();
    const c = balloonPos(shot.target);
    const d = Math.hypot(c.x - a.x, c.y - a.y);
    const b = { x: a.x + AXIS.x * d * 0.5, y: a.y + AXIS.y * d * 0.5 };
    const u = Math.min(1, shot.t / shot.dur);
    const v = 1 - u;
    return {
      x: v * v * a.x + 2 * v * u * b.x + u * u * c.x,
      y: v * v * a.y + 2 * v * u * b.y + u * u * c.y,
      angle: Math.atan2(2 * v * (b.y - a.y) + 2 * u * (c.y - b.y), 2 * v * (b.x - a.x) + 2 * u * (c.x - b.x)),
    };
  };

  const ease = (x: number) => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2);

  const draw = () => {
    if (!images || !canvas.width) return;
    const k = canvas.width / W;
    g.setTransform(k, 0, 0, k, 0, 0);
    g.imageSmoothingQuality = "high";
    if (H <= ART_H) g.drawImage(images.bg, 0, lift(), W, ART_H);
    else g.drawImage(images.bg, (W - (W * H) / ART_H) / 2, 0, (W * H) / ART_H, H);

    const sz = size();
    const target = lead();
    for (const b of balloons) {
      const p = balloonPos(b);
      const age = clock - b.at;
      if (b.state === "fly") {
        sprite(`balloon-${b.color}`, p.x, p.y, sz, { rot: Math.sin(b.age * 0.9 + b.phase + 1.2) * 0.07 });
        if (b === target) {
          g.save();
          g.strokeStyle = "rgb(255 255 255 / 0.9)";
          g.lineWidth = 6;
          g.setLineDash([22, 16]);
          g.lineDashOffset = -clock * 40;
          g.beginPath();
          g.arc(p.x, p.y - 12 * sz, 175 * sz, 0, Math.PI * 2);
          g.stroke();
          g.restore();
        }
      } else if (b.state === "pop") {
        const frame = age < 0.07 ? 1 : age < 0.15 ? 2 : 3;
        sprite(`pop-${b.color}-${frame}` as SpriteName, p.x, p.y, sz * 1.15, { alpha: frame < 3 ? 1 : Math.max(0, 1 - (age - 0.15) / 0.35) });
      } else {
        const q = Math.min(1, age / 0.7);
        const r = SPRITES[`balloon-${b.color}`];
        const sy = 1 - 0.5 * q;
        sprite(`balloon-${b.color}`, p.x, H - GRASS - (r.h * sz * sy) / 2, sz, { sx: 1 + 0.25 * q, sy, alpha: 1 - q });
      }
    }

    for (const shot of shots) {
      const p = shotPos(shot);
      const frame = (Math.floor(shot.t / 0.05) % 3) + 1;
      const r = SPRITES[`trail${frame}` as SpriteName];
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.angle - TRAIL_ANGLE);
      g.scale(0.85, 0.85);
      g.drawImage(images[`trail${frame}` as SpriteName], r.x - BALL_C.x, r.y - BALL_C.y, r.w, r.h);
      g.drawImage(images.ball, BALL.x - BALL_C.x, BALL.y - BALL_C.y, BALL.w, BALL.h);
      g.restore();
    }

    const since = recoilAt < 0 ? 1 : clock - recoilAt;
    const back = 22 * (since < 0.06 ? since / 0.06 : Math.max(0, 1 - (since - 0.06) / 0.25));
    placed("cannon", -AXIS.x * back, -AXIS.y * back);

    SLOTS.slice(0, Math.min(balls, SLOTS.length)).forEach((slot, i) => {
      const grow = loadedAt[i] === undefined ? 1 : ease(Math.min(1, (clock - loadedAt[i]) / 0.3));
      sprite(slot.sprite, slot.x, slot.y + lift(), Math.max(0.01, grow));
    });

    for (const f of floats) {
      const q = (clock - f.at) / 0.9;
      g.save();
      g.globalAlpha = 1 - q;
      g.font = `800 64px ${getComputedStyle(document.body).fontFamily}`;
      g.textAlign = "center";
      g.lineWidth = 10;
      g.strokeStyle = "rgb(29 26 20 / 0.6)";
      g.fillStyle = "#fff";
      g.strokeText(f.text, f.x, f.y - q * 90);
      g.fillText(f.text, f.x, f.y - q * 90);
      g.restore();
    }
  };

  const tick = (now: number) => {
    if (over) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    if (!document.hidden && !document.querySelector(".sheet")) update(dt);
    draw();
    raf = requestAnimationFrame(tick);
  };

  /* ---------- questions ---------- */

  const nextTask = (): Task => {
    if (qi >= queue.length) {
      queue = make();
      qi = 0;
    }
    return queue[qi++];
  };

  const showTask = (task: Task) => {
    cleanup();
    stopSpeaking();
    const id = ++taskId;
    const advance = () => id === taskId && !over && showTask(nextTask());
    const feedback = h("div", { class: "bln-feedback" });
    let answered = false;
    const done: Done = (ok) => {
      if (answered || over) return;
      answered = true;
      cleanup();
      results.push({ task, ok });
      if (ok) {
        streak++;
        bestStreak = Math.max(bestStreak, streak);
        score += Math.min(streak - 1, 5) * 2;
        balls++;
        if (balls <= SLOTS.length) loadedAt[balls - 1] = clock;
        if (!hint.hidden && hint.textContent === t.howTo) hint.hidden = true;
        beep("right");
        feedback.append(h("p", { class: "bln-ok" }, `✓ ${t.loaded}`, streak >= 3 ? h("span", { class: "streak" }, ` 🔥 ${streak} ${t.streak}`) : null));
        window.setTimeout(advance, 650);
      } else {
        streak = 0;
        beep("wrong");
        if (s.instant) {
          feedback.append(h("p", { class: "bln-bad" }, `✗ ${t.notQuite} · `, h("span", { class: "muted" }, `${t.answer}: `), h("strong", null, rightAnswer(task, t))));
          if (task.explain) feedback.append(h("p", { class: "explain" }, lines(task.explain)));
          feedback.append(h("button", { class: "btn btn-soft btn-sm", onclick: advance }, `${t.next} →`));
        } else feedback.append(h("p", { class: "bln-bad" }, `✗ ${t.notQuite}`));
        window.setTimeout(advance, s.instant ? 2600 : 600);
      }
      refreshBar();
      updateFire();
    };

    keys.add(task.key);
    const view = taskView(task, t, done);
    const pad = task.k === "type" && task.pad !== "text";
    panel.className = `bln-panel${pad ? " has-pad" : ""}`;
    panel.replaceChildren(
      ...[task.k !== "type" && task.k !== "choice" ? h("p", { class: "ask" }, task.ask ? t.ask[task.ask] : t.kind[task.k]) : null, promptView(task, t, s.speech), view.el, feedback].filter((x): x is HTMLElement => !!x),
    );
    if (task.listen) setTimeout(() => speak(task.speak || task.prompt, s.speech), 250);
  };

  /* ---------- start and stop ---------- */

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== " " || (e.target as HTMLElement).closest?.("input, textarea, button")) return;
    e.preventDefault();
    fire();
  };
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;

  const stop = () => {
    over = true;
    cancelAnimationFrame(raf);
    clearTimeout(hintTimer);
    cleanup();
    stopSpeaking();
    observer?.disconnect();
    window.removeEventListener("resize", resize);
    window.removeEventListener("keydown", onKey);
    document.body.classList.remove("is-balloon");
  };

  function askQuit() {
    if (results.length || popped || landed) confirmSheet(t, t.quit, quit);
    else quit();
  }
  function quit() {
    stop();
    ctx.home();
  }

  function finish() {
    if (over) return;
    stop();
    const right = results.filter((r) => r.ok).length;
    const pct = popped / total;
    endScreen(ctx, {
      keys: Array.from(keys),
      results,
      score,
      stars: pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0,
      bestStreak,
      heading: s.lives > 0 && lives <= 0 ? t.outOfLives : `🎈 ${popped} ${t.of} ${total}`,
      note: results.length ? `${t.rightAnswers}: ${right} ${t.of} ${results.length}` : undefined,
      again: (keys) => startBalloons(ctx, keys),
    });
  }

  window.onShellBack = () => {
    if (over) return false;
    if (document.querySelector(".sheet")) document.querySelector(".sheet")!.remove();
    else askQuit();
    return true;
  };

  document.body.classList.add("is-balloon");
  mount(root, h("div", { class: "bln" }, header, body));
  observer?.observe(stage);
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onKey);
  resize();
  updateFire();
  showTask(nextTask());
  loadImages().then(
    (imgs) => {
      if (over) return;
      images = imgs;
      raf = requestAnimationFrame(tick);
    },
    () => {
      stop();
      mount(root, h("main", { class: "screen center" }, h("p", { class: "lead" }, t.broken), h("button", { class: "btn btn-primary", onclick: ctx.home }, t.home)));
    },
  );
}
