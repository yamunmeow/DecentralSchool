import * as Leopard from "leopard";
import * as C from "./cast";
import type { RotationStyle, Target } from "./types";

// Leopard's typings mark the methods this runtime replaces as private, so its classes
// are used as open base classes; everything defined here is typed.
type Open = new (...args: any[]) => any;
const Sprite = Leopard.Sprite as unknown as Open & { RotationStyle: typeof Leopard.Sprite.RotationStyle };
const Stage = Leopard.Stage as unknown as Open;
const Project = Leopard.Project as unknown as Open;
const Costume = Leopard.Costume as unknown as Open;
const TriggerBase = Leopard.Trigger as unknown as Open;
const Trigger = Leopard.Trigger;
const { Color, Sound } = Leopard;
type Costume = Leopard.Costume;
type Sound = Leopard.Sound;
type Watcher = Leopard.Watcher;
type Sprite = Leopard.Sprite;

/**
 * A Scratch-faithful runtime on top of Leopard. Leopard draws, detects collisions,
 * plays sounds and handles the pen; the scheduling follows scratch-vm:
 *
 * - every frame (30 per second) threads are stepped in passes until something
 *   visible changes or 75% of the frame is used, so non-visual loops run fast;
 * - a thread that is only waiting (wait, glide, say for…) does not keep the
 *   frame busy;
 * - hats start threads topmost sprite first, stage last, and restart running
 *   ones only where Scratch does (flag, broadcast, click);
 * - "run without screen refresh" runs to the end or for at most 500 ms;
 * - sprites are fenced on the stage, directions stay in (-180, 180], there are
 *   at most 300 clones and clones get their own lists.
 */

/** Yielded by blocks that are waiting: the thread is paused, not busy. */
export const WAIT = Symbol("wait");
/** Thrown to end the current thread (stop all, delete this clone). */
const STOP = Symbol("stop");

const FRAME_MS = 1000 / 30;
const WARP_MS = 500;
const MAX_CLONES = 300;
const FENCE = 15;

type Gen = Generator<unknown, any, any>;
type Script = (this: RTarget) => Gen;
type AnyTarget = RSprite | RStage;
type RTarget = AnyTarget;

export type TargetState = Partial<Target> & { varValues: Record<string, unknown> };

export interface Thread {
  target: AnyTarget;
  trigger: RTrigger;
  gen: Gen;
  done: boolean;
  yielded: unknown;
  procs: string[];
  warp: number;
  warpStart: number;
  waiters: (() => void)[];
}

/** Which hats restart a thread that is already running (scratch-vm's hat metadata). */
const RESTARTS = new Set<symbol>([Trigger.GREEN_FLAG, Trigger.BROADCAST, Trigger.CLICKED]);
export const SCRIPT = Symbol("SCRIPT");

export class RTrigger extends TriggerBase {
  declare trigger: symbol;
  /** The top block's id, so the editor can light up running scripts. */
  scriptId = "";
  get script(): Script {
    return (this as unknown as { _script: Script })._script;
  }
  get opts(): Record<string, unknown> {
    return (this as unknown as { options: Record<string, unknown> }).options;
  }
  clone(): RTrigger {
    const t = new RTrigger(this.trigger, this.opts as never, this.script as never);
    t.scriptId = this.scriptId;
    return t;
  }
}

/** Costumes made from SVG markup (Leopard would treat a data: URL as a half-size bitmap). */
export class RCostume extends Costume {
  constructor(name: string, url: string, center: { x: number; y: number }, bitmap = false) {
    super(name, url, center);
    this.isBitmap = bitmap;
    this.resolution = bitmap ? 2 : 1;
  }
}

let currentThread: Thread | null = null;
const now = () => performance.now();
const proj = (t: AnyTarget) => (t as unknown as { _project: RProject })._project;

/* ---------- shared behaviour for sprites and the stage ---------- */

function makeShared<T extends Open>(Base: T) {
  return class extends Base {
    /** Variables and lists by id. */
    declare _vars: Record<string, unknown>;
    targetId = "";
    targetName = "";
    scripts: Record<string, Script> = {};

    get rt(): RProject {
      return proj(this as never);
    }

    *wait(secs: unknown): Gen {
      const end = now() + C.toNumber(secs) * 1000;
      yield WAIT;
      while (now() < end) yield WAIT;
    }

    *waitUntil(cond: () => boolean): Gen {
      while (!cond()) yield;
    }

    broadcast(name: unknown): Thread[] {
      return this.rt.startHats(Trigger.BROADCAST, (t) => upper(t.opts.name) === upper(name));
    }

    *broadcastAndWait(name: unknown): Gen {
      const started = this.broadcast(name);
      if (!started.length) return;
      do yield WAIT;
      while (started.some((t) => !t.done));
    }

    /** Variables of another target by name (sensing "of"). */
    varByName(name: string): unknown {
      const map = this.rt.varNames.get(this as never);
      const id = map?.get(name);
      return id === undefined ? 0 : this._vars[id];
    }

    soundFor(v: unknown): Sound | undefined {
      const sounds = (this as unknown as { sounds: Sound[] }).sounds;
      if (!sounds.length) return undefined;
      if (typeof v === "number") return sounds[C.listIndexWrap(Math.round(v), sounds.length)];
      const s = String(v);
      const byName = sounds.find((x) => x.name === s);
      if (byName) return byName;
      if (s.trim() && !Number.isNaN(Number(s))) return sounds[C.listIndexWrap(Math.round(Number(s)), sounds.length)];
      return undefined;
    }

    *playSound(v: unknown, untilDone: boolean): Gen {
      const sound = this.soundFor(v);
      if (!sound) return;
      const self = this as unknown as Sprite;
      if (untilDone) yield* self.playSoundUntilDone(sound.name);
      else yield* self.startSound(sound.name);
    }

    setVolume(v: unknown) {
      (this as unknown as Sprite).audioEffects.volume = Math.max(0, Math.min(100, C.toNumber(v)));
    }

    setSoundEffect(name: string, v: unknown, change: boolean) {
      const fx = (this as unknown as Sprite).audioEffects as unknown as Record<string, number>;
      const key = name.toLowerCase() === "pan" ? "pan" : "pitch";
      fx[key] = (change ? fx[key] : 0) + C.toNumber(v);
      if (key === "pan") fx[key] = Math.max(-100, Math.min(100, fx[key]));
      else fx[key] = Math.max(-360, Math.min(360, fx[key]));
    }

    setEffect(name: string, v: unknown, change: boolean) {
      const fx = (this as unknown as Sprite).effects as unknown as Record<string, number>;
      const key = name.toLowerCase();
      if (!(key in fx)) return;
      let value = (change ? fx[key] : 0) + C.toNumber(v);
      if (key === "ghost") value = Math.max(0, Math.min(100, value));
      if (key === "brightness") value = Math.max(-100, Math.min(100, value));
      fx[key] = value;
    }

    /** Scratch's costume switch: by name, by number, or "next/previous/random". */
    switchCostume(v: unknown, kind: "costume" | "backdrop") {
      const self = this as unknown as { costumes: Costume[]; costumeNumber: number };
      const n = self.costumes.length;
      if (!n) return;
      const set = (i: number) => (self.costumeNumber = C.listIndexWrap(Math.round(i), n) + 1);
      if (typeof v === "number") return set(v);
      const s = String(v);
      const i = self.costumes.findIndex((c) => c.name === s);
      if (i >= 0) return set(i + 1);
      if (s === `next ${kind}`) return set(self.costumeNumber + 1);
      if (s === `previous ${kind}`) return set(self.costumeNumber - 1);
      if (s === `random ${kind}` && n > 1) {
        let r = 1 + Math.floor(Math.random() * (n - 1));
        if (r >= self.costumeNumber) r++;
        return set(r);
      }
      if (!Number.isNaN(Number(s)) && s.trim()) set(Number(s));
    }

    createCloneOf(name: unknown) {
      const n = String(name);
      const original = n === "_myself_" ? this : this.rt.spriteByName(n);
      if (original instanceof RSprite) original.cloneMe();
    }

    showWatcher(id: string, visible: boolean) {
      const w = this.rt.watcherFor(id);
      if (w) w.visible = visible;
    }
  };
}

const upper = (v: unknown) => String(v).toUpperCase();

/* ---------- sprites ---------- */

export class RSprite extends makeShared(Sprite) {
  draggable = false;
  /** Set while the user drags it: no fencing then. */
  dragging = false;
  // Not initialised here: Leopard's constructor sets the size before subclass fields would run.
  declare private _sizeValue: number;

  get size(): number {
    return this._sizeValue;
  }
  set size(v: number) {
    const costume = (this as unknown as { costume?: Costume }).costume;
    const w = costume?.width || 0;
    const h = costume?.height || 0;
    let value = C.toNumber(v);
    if (w && h) {
      const scale = costume && !costume.isBitmap ? 1 : 0.5;
      const min = Math.min(1, Math.max(5 / (w * scale), 5 / (h * scale)));
      const max = Math.min((1.5 * 480) / (w * scale), (1.5 * 360) / (h * scale));
      value = Math.min(max, Math.max(min, value / 100)) * 100;
    }
    this._sizeValue = value;
  }

  get direction(): number {
    return super.direction;
  }
  set direction(d: number) {
    if (!Number.isFinite(d)) return;
    (this as unknown as { _direction: number })._direction = wrapClamp(d, -179, 180);
  }

  setRotation(style: RotationStyle) {
    this.rotationStyle = style === "left-right" ? Sprite.RotationStyle.LEFT_RIGHT : style === "don't rotate" ? Sprite.RotationStyle.DONT_ROTATE : Sprite.RotationStyle.ALL_AROUND;
  }

  goto(x: number, y: number) {
    let nx = C.toNumber(x);
    let ny = C.toNumber(y);
    if (!this.dragging) [nx, ny] = this.fenced(nx, ny);
    super.goto(nx, ny);
  }

  /** scratch-render's getFencedPositionOfDrawable: keep at least 15px (or half the sprite) on stage. */
  private fenced(x: number, y: number): [number, number] {
    let box;
    try {
      box = this.rt.renderer.getTightBoundingBox(this as never);
    } catch {
      return [x, y];
    }
    if (!box || !Number.isFinite(box.left)) return [x, y];
    const dx = x - this.x;
    const dy = y - this.y;
    const inset = Math.floor(Math.min(box.right - box.left, box.top - box.bottom) / 2);
    const sx = 240 - Math.min(FENCE, inset);
    const sy = 180 - Math.min(FENCE, inset);
    if (box.right + dx < -sx) x = Math.ceil(this.x - (sx + box.right));
    else if (box.left + dx > sx) x = Math.floor(this.x + (sx - box.left));
    if (box.top + dy < -sy) y = Math.ceil(this.y - (sy + box.top));
    else if (box.bottom + dy > sy) y = Math.floor(this.y + (sy - box.bottom));
    return [x, y];
  }

  moveSteps(steps: unknown) {
    const r = ((90 - this.direction) * Math.PI) / 180;
    const n = C.toNumber(steps);
    this.goto(this.x + n * Math.cos(r), this.y + n * Math.sin(r));
  }

  pointTowards(x: number, y: number) {
    const dx = x - this.x;
    const dy = y - this.y;
    this.direction = 90 - (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  *glide(secs: unknown, x: unknown, y: unknown): Gen {
    const dur = C.toNumber(secs) * 1000;
    const tx = C.toNumber(x);
    const ty = C.toNumber(y);
    const sx = this.x;
    const sy = this.y;
    const start = now();
    if (dur <= 0) {
      this.goto(tx, ty);
      yield WAIT;
      return;
    }
    for (;;) {
      yield WAIT;
      const t = (now() - start) / dur;
      if (t >= 1) {
        this.goto(tx, ty);
        return;
      }
      this.goto(sx + (tx - sx) * t, sy + (ty - sy) * t);
    }
  }

  /** Where a "go to / glide to" menu points: random position, mouse pointer or a sprite. */
  targetXY(name: string): [number, number] | null {
    if (name === "_random_") return [Math.round(480 * (Math.random() - 0.5)), Math.round(360 * (Math.random() - 0.5))];
    if (name === "_mouse_") return [this.mouse.x, this.mouse.y];
    const other = this.rt.spriteByName(name);
    return other ? [other.x, other.y] : null;
  }

  pointTowardsName(name: string) {
    if (name === "_random_") {
      this.direction = Math.round(Math.random() * 360) - 180;
      return;
    }
    const p = this.targetXY(name);
    if (p) this.pointTowards(p[0], p[1]);
  }

  bounce() {
    this.ifOnEdgeBounce();
  }

  private bubbleText(v: unknown): string {
    if (typeof v === "number") return String(parseFloat(v.toFixed(2)));
    return C.toStr(v).slice(0, 330);
  }

  sayText(v: unknown, think = false) {
    const text = this.bubbleText(v);
    if (think) this.think(text);
    else this.say(text);
  }

  *sayFor(v: unknown, secs: unknown, think = false): Gen {
    this.sayText(v, think);
    const bubble = this._speechBubble;
    yield* this.wait(secs);
    if (this._speechBubble === bubble) this.say("");
  }

  *ask(question: unknown): Gen {
    if (this.visible) this.sayText(question);
    let done = false;
    this.rt.ask(this.visible ? "" : C.toStr(question)).then(() => (done = true));
    while (!done) yield WAIT;
    if (this.visible) this.say("");
  }

  setLayer(front: boolean) {
    if (front) this.moveAhead();
    else this.moveBehind();
  }

  changeLayer(n: unknown, forward: boolean) {
    const k = Math.round(C.toNumber(n));
    if (forward) this.moveAhead(k);
    else this.moveBehind(k);
  }

  stamp() {
    super.stamp();
    this.rt.penChanges++;
  }

  clearAllPen() {
    this.clearPen();
    this.rt.penChanges++;
  }

  setPenParam(param: string, v: unknown, change: boolean) {
    const color = this.penColor;
    const n = C.toNumber(v);
    const c = Color.hsv(color.h, color.s, color.v, color.a);
    switch (param) {
      case "color": c.h = (change ? c.h : 0) + n; break;
      case "saturation": c.s = (change ? c.s : 0) + n; break;
      case "brightness": c.v = (change ? c.v : 0) + n; break;
      case "transparency": {
        const t = Math.max(0, Math.min(100, (change ? (1 - c.a) * 100 : 0) + n));
        c.a = 1 - t / 100;
        break;
      }
    }
    this.penColor = c;
  }

  setPenColor(hex: unknown) {
    const s = String(hex);
    if (/^#?[0-9a-f]{6}$/i.test(s)) {
      const h = s.replace("#", "");
      this.penColor = Color.rgb(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
    } else this.penColor = Color.num(C.toNumber(hex));
  }

  setPenSize(v: unknown, change: boolean) {
    this.penSize = Math.max(1, Math.min(1200, (change ? this.penSize : 0) + C.toNumber(v)));
  }

  touchingName(name: string): boolean {
    if (name === "_mouse_") return this.visible && this.touching("mouse");
    if (name === "_edge_") return this.touching("edge");
    const other = this.rt.spriteByName(name);
    if (!other) return false;
    const all = other.andClones().filter((s: RSprite) => s !== (this as unknown as RSprite) && s.visible);
    return all.length > 0 && this.visible && this.touching(all as never);
  }

  touchingColor(hex: string): boolean {
    return this.visible && this.touching(colorOf(hex));
  }

  colorTouchingColor(a: string, b: string): boolean {
    return this.visible && this.colorTouching(colorOf(a), colorOf(b));
  }

  distanceTo(name: string): number {
    if (name === "_mouse_") return Math.hypot(this.mouse.x - this.x, this.mouse.y - this.y);
    const other = this.rt.spriteByName(name);
    return other ? Math.hypot(other.x - this.x, other.y - this.y) : 10000;
  }

  /** Scratch's createClone: behind the original, own copies of variables and lists, at most 300. */
  cloneMe() {
    const rt = this.rt;
    if (rt.cloneCount >= MAX_CLONES) return;
    const clone: RSprite = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    const self = this as unknown as Record<string, unknown>;
    const c = clone as unknown as Record<string, unknown>;
    c._project = rt;
    clone.triggers = (this.triggers as RTrigger[]).map((t) => t.clone());
    c._vars = Object.fromEntries(Object.entries(this._vars).map(([k, v]) => [k, Array.isArray(v) ? v.slice() : v]));
    c._speechBubble = { text: "", style: "say", timeout: null };
    c.effects = (self.effects as { _clone: () => unknown })._clone();
    let root: RSprite = this;
    while ((root as unknown as { parent: RSprite | null }).parent) root = (root as unknown as { parent: RSprite }).parent;
    const chain = (root as unknown as { effectChain: { clone: (o: unknown) => unknown } }).effectChain;
    c.effectChain = chain.clone({ getNonPatchSoundList: () => [] });
    const AudioEffectMap = (self.audioEffects as object).constructor as new (chain: unknown) => unknown;
    c.audioEffects = new AudioEffectMap(c.effectChain);
    c.clones = [];
    c.parent = root;
    c.isClone = true;
    (root as unknown as { clones: RSprite[] }).clones.push(clone);
    rt.cloneCount++;
    rt.placeBehind(clone, this);
    rt.startHats(Trigger.CLONE_START, () => true, [clone]);
  }

  isClone = false;

  deleteClone() {
    if (!this.isClone) return;
    const parent = (this as unknown as { parent: RSprite }).parent;
    (parent as unknown as { clones: RSprite[] }).clones = (parent as unknown as { clones: RSprite[] }).clones.filter((s) => s !== this);
    this.rt.cloneCount--;
    this.stopAllOfMySounds();
    this.rt.stopTarget(this);
    if (currentThread?.target === this) throw STOP;
  }
}

/* ---------- stage ---------- */

export class RStage extends makeShared(Stage) {
  /** Leopard fires backdrop hats from this setter; we start them ourselves (Scratch fires them on every switch). */
  get costumeNumber(): number {
    return (this as unknown as { _costumeNumber: number })._costumeNumber;
  }
  set costumeNumber(n: number) {
    const self = this as unknown as { _costumeNumber: number; costumes: Costume[] };
    self._costumeNumber = Number.isFinite(n) ? wrapClamp(n, 1, Math.max(1, self.costumes.length)) : 0;
  }

  switchBackdrop(v: unknown): Thread[] {
    this.switchCostume(v, "backdrop");
    const name = (this as unknown as { costume?: Costume }).costume?.name ?? "";
    return this.rt.startHats(Trigger.BACKDROP_CHANGED, (t: RTrigger) => upper(t.opts.backdrop) === upper(name));
  }

  *switchBackdropAndWait(v: unknown): Gen {
    const started = this.switchBackdrop(v);
    if (!started.length) return;
    do yield WAIT;
    while (started.some((t) => !t.done));
  }

  *ask(question: unknown): Gen {
    let done = false;
    this.rt.ask(C.toStr(question)).then(() => (done = true));
    while (!done) yield WAIT;
  }
}

function wrapClamp(n: number, min: number, max: number) {
  const range = max - min + 1;
  return n - Math.floor((n - min) / range) * range;
}

function colorOf(hex: string) {
  const h = String(hex).replace("#", "");
  return Color.rgb(parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0);
}

/* ---------- the project and scheduler ---------- */

export interface RuntimeEvents {
  onError?: (target: string, message: string) => void;
  onDrag?: (target: AnyTarget) => void;
  onReport?: (blockId: string, value: unknown) => void;
}

export class RProject extends Project {
  threads: Thread[] = [];
  cloneCount = 0;
  penChanges = 0;
  turbo = false;
  disposed = false;
  editorMode = false;
  events: RuntimeEvents = {};
  /** The editor's debugger: slow motion (a pause before every block) or one block per step. */
  debug: { mode: "off" | "slow" | "step"; delay: number; tokens: number; onStep?: (blockId: string) => void } = { mode: "off", delay: 500, tokens: 0 };
  varNames = new WeakMap<AnyTarget, Map<string, string>>();
  watcherIndex = new Map<string, Watcher>();
  private intervalId = 0;
  private askForm: HTMLFormElement | null = null;

  constructor(stage: RStage, sprites: Record<string, RSprite>) {
    // Leopard starts its own 30 fps timer in the constructor; keep its id so dispose() can stop it.
    const original = window.setInterval;
    let id = 0;
    (window as unknown as { setInterval: typeof setInterval }).setInterval = ((fn: () => void, ms: number) => (id = original(fn, ms))) as typeof setInterval;
    try {
      super(stage, sprites, { frameRate: 30 });
    } finally {
      window.setInterval = original;
    }
    this.intervalId = id;
  }

  /* ----- threads ----- */

  /** Hat targets in scratch-vm order: topmost sprite first, the stage last. */
  private executionOrder(): AnyTarget[] {
    return [...(this.spritesAndClones as unknown as RSprite[])].reverse().concat(this.stage as unknown as RSprite) as AnyTarget[];
  }

  startHats(kind: symbol, match: (t: RTrigger, target: AnyTarget) => boolean, only?: AnyTarget[]): Thread[] {
    const started: Thread[] = [];
    for (const target of only || this.executionOrder())
      for (const trigger of target.triggers as RTrigger[])
        if (trigger.trigger === kind && match(trigger, target)) {
          const t = this.startThread(target, trigger, RESTARTS.has(kind));
          if (t) started.push(t);
        }
    return started;
  }

  startThread(target: AnyTarget, trigger: RTrigger, restart: boolean): Thread | null {
    const running = this.threads.find((t) => t.trigger === trigger && t.target === target && !t.done);
    if (running) {
      if (!restart) return null;
      running.gen = trigger.script.call(target as never);
      running.procs = [];
      running.warp = 0;
      return running;
    }
    const thread: Thread = { target, trigger, gen: trigger.script.call(target as never), done: false, yielded: undefined, procs: [], warp: 0, warpStart: 0, waiters: [] };
    this.threads.push(thread);
    return thread;
  }

  private finish(t: Thread) {
    if (t.done) return;
    t.done = true;
    t.waiters.forEach((w) => w());
  }

  stopTarget(target: AnyTarget, except?: Thread | null) {
    for (const t of this.threads) if (t.target === target && t !== except) this.finish(t);
  }

  private stepThread(t: Thread) {
    currentThread = t;
    try {
      const r = t.gen.next();
      if (r.done) this.finish(t);
      else t.yielded = r.value;
    } catch (e) {
      if (e !== STOP) this.events.onError?.((t.target as AnyTarget).targetName, e instanceof Error ? e.message : String(e));
      this.finish(t);
    } finally {
      currentThread = null;
    }
  }

  private signature(): number[] {
    const out: number[] = [this.penChanges, (this.stage as unknown as RStage).costumeNumber];
    for (const s of this.spritesAndClones as unknown as RSprite[]) {
      const fx = (s.effects as unknown as { _effectValues: Record<string, number> })._effectValues;
      let effects = 0;
      for (const k in fx) effects += fx[k] * (k.length + 1);
      out.push(s.x, s.y, s.direction, s.size, s.costumeNumber, s.visible ? 1 : 0, (s as unknown as { _layerOrder: number })._layerOrder, s._speechBubble?.text.length ?? 0, effects);
    }
    return out;
  }

  /** Called by Leopard's 30 fps timer. */
  step() {
    if (this.disposed) return;
    (this as unknown as { _cachedLoudness: null })._cachedLoudness = null;
    this.stepEdgeHats();
    const start = now();
    let before = this.turbo ? [] : this.signature();
    let active = 1;
    while (this.threads.length && active > 0 && now() - start < FRAME_MS * 0.75) {
      active = 0;
      for (let i = 0; i < this.threads.length; i++) {
        const t = this.threads[i];
        if (t.done) continue;
        this.stepThread(t);
        if (!t.done && t.yielded !== WAIT) active++;
      }
      this.threads = this.threads.filter((t) => !t.done);
      if (!this.turbo) {
        const after = this.signature();
        if (after.length !== before.length || after.some((v, i) => v !== before[i])) break;
        before = after;
      }
    }
  }

  private edgeState = new WeakMap<RTrigger, boolean>();
  private stepEdgeHats() {
    for (const target of this.executionOrder())
      for (const trigger of target.triggers as RTrigger[]) {
        if (trigger.trigger !== Trigger.TIMER_GREATER_THAN && trigger.trigger !== Trigger.LOUDNESS_GREATER_THAN) continue;
        const limit = C.toNumber((trigger.opts.VALUE as (t: AnyTarget) => unknown)(target));
        const value = trigger.trigger === Trigger.TIMER_GREATER_THAN ? this.timer : this.loudness;
        const on = value > limit;
        const was = this.edgeState.get(trigger) ?? false;
        this.edgeState.set(trigger, on);
        if (on && !was) this.startThread(target, trigger, false);
      }
  }

  /* ----- procedures (called from generated code) ----- */

  *call(id: string, warp: boolean, gen: Gen): Gen {
    const t = currentThread;
    if (!t) return (yield* gen) ?? "";
    if (warp || t.warp > 0) {
      if (t.warp === 0) t.warpStart = now();
      t.warp++;
      try {
        let r = gen.next();
        while (!r.done) {
          if (now() - t.warpStart > WARP_MS) {
            yield r.value;
            t.warpStart = now();
          }
          r = gen.next();
        }
        return r.value ?? "";
      } finally {
        t.warp--;
      }
    }
    const recursive = t.procs.slice(-5).includes(id);
    t.procs.push(id);
    try {
      if (recursive) yield WAIT;
      return (yield* gen) ?? "";
    } finally {
      t.procs.pop();
    }
  }

  /* ----- the debugger (editor builds only call this) ----- */

  *dbg(blockId: string): Gen {
    const d = this.debug;
    if (d.mode === "off" || (currentThread && currentThread.warp > 0)) return;
    d.onStep?.(blockId);
    if (d.mode === "slow") {
      const end = now() + d.delay;
      yield WAIT;
      while (this.debug.mode === "slow" && now() < end) yield WAIT;
      return;
    }
    while (this.debug.mode === "step" && this.debug.tokens <= 0) yield WAIT;
    if (this.debug.mode === "step") this.debug.tokens--;
  }

  /** Run a generator once on a target (a block clicked in the palette). */
  runOnce(target: AnyTarget, script: () => Gen, id: string) {
    const trigger = new RTrigger(SCRIPT as never, script as never);
    trigger.scriptId = id;
    this.startThread(target, trigger, true);
  }

  /* ----- stopping ----- */

  stopAll() {
    for (const t of this.threads) this.finish(t);
    this.threads = [];
    for (const s of Object.values(this.sprites) as RSprite[]) {
      (s as unknown as { clones: RSprite[] }).clones = [];
    }
    this.cloneCount = 0;
    this.stopAllSounds();
    for (const t of this.spritesAndStage as unknown as AnyTarget[]) {
      (t as unknown as Sprite).effects.clear();
      (t as unknown as Sprite).audioEffects.clear();
      if (t instanceof RSprite) t.say("");
    }
    this.closeAsk();
  }

  /** "stop all" block: stop everything, including the script that asked. */
  stopAllFromScript(): never {
    this.stopAll();
    throw STOP;
  }

  stopOthers(target: AnyTarget) {
    this.stopTarget(target, currentThread);
  }

  greenFlag() {
    try {
      (Sound as unknown as { audioContext: AudioContext }).audioContext.resume();
    } catch {
      /* no audio */
    }
    this.stopAll();
    this.restartTimer();
    this.startHats(Trigger.GREEN_FLAG, () => true);
  }

  /** Key hats: not restarted while running; "any" matches every key. */
  keyDown(key: string) {
    const input = this.input as unknown as { keys: string[] };
    if (!input.keys.includes(key)) input.keys.push(key);
    this.startHats(Trigger.KEY_PRESSED, (t) => t.opts.key === "any" || String(t.opts.key).toLowerCase() === key.toLowerCase());
  }

  keyUp(key: string) {
    const input = this.input as unknown as { keys: string[] };
    input.keys = input.keys.filter((k) => k !== key);
  }

  clickTarget(target: AnyTarget) {
    this.startHats(Trigger.CLICKED, () => true, [target]);
  }

  /** Click a script in the editor: run it, or stop it if it is running. */
  toggleScript(target: AnyTarget, scriptId: string) {
    const running = this.threads.find((t) => t.target === target && t.trigger.scriptId === scriptId && !t.done);
    if (running) return this.finish(running);
    const existing = (target.triggers as RTrigger[]).find((t) => t.scriptId === scriptId);
    const script = existing?.script || target.scripts[scriptId];
    if (!script) return;
    const trigger = new RTrigger(SCRIPT as never, script as never);
    trigger.scriptId = scriptId;
    this.startThread(target, trigger, false);
  }

  runningScripts(target: AnyTarget): Set<string> {
    const ids = new Set<string>();
    for (const t of this.threads) if (!t.done && t.target === target && t.trigger.scriptId) ids.add(t.trigger.scriptId);
    return ids;
  }

  /* ----- helpers for generated code ----- */

  isKeyDown(key: string): boolean {
    const keys = (this.input as unknown as { keys: string[] }).keys;
    const k = String(key).toLowerCase();
    return k === "any" ? keys.length > 0 : keys.includes(k);
  }

  /** A lone reporter was clicked: show its value next to it. */
  report(blockId: string, value: unknown) {
    this.events.onReport?.(blockId, typeof value === "number" ? C.limit(value) : value);
  }

  spriteByName(name: string): RSprite | undefined {
    return Object.values(this.sprites as Record<string, RSprite>).find((s) => s.targetName === name);
  }

  targetByName(name: string): AnyTarget | undefined {
    return name === "_stage_" ? (this.stage as unknown as RStage) : this.spriteByName(name);
  }

  /** Sensing "(property) of (sprite)". */
  of(object: string, property: string): unknown {
    const t = this.targetByName(object);
    if (!t) return 0;
    if (t instanceof RStage) {
      switch (property) {
        case "backdrop #": return t.costumeNumber;
        case "backdrop name": return (t as unknown as { costume?: Costume }).costume?.name ?? "";
        case "volume": return (t as unknown as Sprite).audioEffects.volume;
      }
      return t.varByName(property);
    }
    switch (property) {
      case "x position": return t.x;
      case "y position": return t.y;
      case "direction": return t.direction;
      case "costume #": return t.costumeNumber;
      case "costume name": return t.costume?.name ?? "";
      case "size": return Math.round(t.size);
      case "volume": return t.audioEffects.volume;
    }
    return t.varByName(property);
  }

  placeBehind(sprite: RSprite, other: RSprite) {
    const list = (this.spritesAndClones as unknown as RSprite[]).filter((s) => s !== sprite);
    list.splice(list.indexOf(other), 0, sprite);
    list.forEach((s, i) => ((s as unknown as { _layerOrder: number })._layerOrder = i + 1));
  }

  watcherFor(id: string): Watcher | undefined {
    return this.watcherIndex.get(id);
  }

  ask(question: string): Promise<string> {
    this.closeAsk();
    return new Promise((resolve) => {
      const target = this.renderer.renderTarget;
      if (!target) return resolve("");
      const form = document.createElement("form");
      form.className = "leopard__askBox";
      const text = document.createElement("span");
      text.className = "leopard__askText";
      text.textContent = question;
      const input = document.createElement("input");
      input.type = "text";
      input.className = "leopard__askInput";
      input.setAttribute("aria-label", question || "Answer");
      const button = document.createElement("button");
      button.className = "leopard__askButton";
      button.textContent = "✓";
      button.setAttribute("aria-label", "Answer");
      if (question) form.append(text);
      form.append(input, button);
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.answer = input.value;
        form.remove();
        this.askForm = null;
        resolve(input.value);
      });
      target.append(form);
      this.askForm = form;
      input.focus();
    });
  }

  private closeAsk() {
    this.askForm?.remove();
    this.askForm = null;
  }

  /* ----- lifecycle ----- */

  _renderLoop() {
    if (this.disposed) return;
    super._renderLoop();
  }

  dispose() {
    this.disposed = true;
    this.stopAll();
    window.clearInterval(this.intervalId);
    const gl = this.renderer.gl as WebGLRenderingContext;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    this.renderer.stage.remove();
    this.renderer.renderTarget?.querySelectorAll(".leopard__watcher").forEach((w: Element) => w.remove());
  }

  /** Current position, costume, etc. of every original sprite and the stage. */
  snapshot(): Record<string, TargetState> {
    const out: Record<string, TargetState> = {};
    const stage = this.stage as unknown as RStage;
    out[stage.targetId] = { costume: stage.costumeNumber - 1, volume: (stage as unknown as Sprite).audioEffects.volume, ...varValues(stage) };
    for (const s of Object.values(this.sprites) as RSprite[]) {
      out[s.targetId] = {
        x: round(s.x),
        y: round(s.y),
        direction: round(s.direction),
        size: round(s.size),
        visible: s.visible,
        costume: s.costumeNumber - 1,
        rotationStyle: s.rotationStyle === Sprite.RotationStyle.LEFT_RIGHT ? "left-right" : s.rotationStyle === Sprite.RotationStyle.DONT_ROTATE ? "don't rotate" : "all around",
        draggable: s.draggable,
        volume: s.audioEffects.volume,
        ...varValues(s),
      };
    }
    return out;
  }

  /** Layer order of the original sprites, bottom first. */
  layerOrder(): string[] {
    return (this.spritesAndClones as unknown as RSprite[]).filter((s) => !s.isClone).map((s) => s.targetId);
  }
}

const round = (n: number) => Math.round(n * 100) / 100;

function varValues(t: AnyTarget): { varValues: Record<string, unknown> } {
  return { varValues: Object.fromEntries(Object.entries(t._vars).map(([k, v]) => [k, Array.isArray(v) ? v.slice() : v])) };
}

/* ---------- list blocks (scratch-vm's data blocks) ---------- */

const LIST_LIMIT = 200000;

export const Ops = {
  add(list: unknown[], item: unknown) {
    if (list.length < LIST_LIMIT) list.push(item);
  },
  deleteOf(list: unknown[], index: unknown) {
    const i = C.listIndex(index, list.length, true);
    if (i === C.LIST_INVALID) return;
    if (i === C.LIST_ALL) list.length = 0;
    else list.splice(i - 1, 1);
  },
  insertAt(list: unknown[], item: unknown, index: unknown) {
    const i = C.listIndex(index, list.length + 1, false);
    if (i === C.LIST_INVALID || list.length >= LIST_LIMIT) return;
    list.splice(i - 1, 0, item);
  },
  replaceAt(list: unknown[], index: unknown, item: unknown) {
    const i = C.listIndex(index, list.length, false);
    if (i !== C.LIST_INVALID) list[i - 1] = item;
  },
  itemOf(list: unknown[], index: unknown): unknown {
    const i = C.listIndex(index, list.length, false);
    return i === C.LIST_INVALID ? "" : list[i - 1];
  },
  itemNum(list: unknown[], item: unknown): number {
    for (let i = 0; i < list.length; i++) if (C.compare(list[i], item) === 0) return i + 1;
    return 0;
  },
  contains(list: unknown[], item: unknown): boolean {
    return list.includes(item) || list.some((x) => C.compare(x, item) === 0);
  },
};

function trigger(kind: symbol, options: Record<string, unknown>, script: Script, scriptId: string): RTrigger {
  const t = new RTrigger(kind as never, options as never, script as never);
  t.scriptId = scriptId;
  return t;
}

/** What generated code receives as `L`. */
export const LIB = { RSprite, RStage, Trigger, C, Ops, WAIT, trigger };
