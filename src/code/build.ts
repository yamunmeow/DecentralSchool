import * as Leopard from "leopard";
import { costumeSvg, svgUrl } from "./art";
import { compileProject } from "./compiler";
import { LIB, RCostume, RProject, RSprite, RStage, type RuntimeEvents } from "./runtime";
import { soundUrl } from "./sounds";
import type { CodeProject, Target } from "./types";

/**
 * Builds a running stage from a project. `code` is the compiled scripts as a function
 * of the runtime library; the studio makes it with `new Function`, an exported page
 * carries it as an inline script.
 */

export type ClassFactory = (L: typeof LIB) => Record<string, new (...a: unknown[]) => RSprite | RStage>;

export function factoryFor(project: CodeProject, debug = false): ClassFactory {
  return new Function("L", compileProject(project, debug)) as ClassFactory;
}

const costumeUrl = (t: Target, i: number) => svgUrl(costumeSvg(t.costumes[i]));
const watcherColor = Leopard.Color.rgb(255, 140, 26);
const listColor = Leopard.Color.rgb(255, 102, 26);

function varsOf(t: Target): Record<string, unknown> {
  const vars: Record<string, unknown> = {};
  for (const v of t.variables) vars[v.id] = v.value;
  for (const l of t.lists) vars[l.id] = l.value.slice();
  return vars;
}

function dress(target: RSprite | RStage, t: Target) {
  const self = target as unknown as { costumes: Leopard.Costume[]; sounds: Leopard.Sound[]; targetId: string; targetName: string };
  self.costumes = t.costumes.map((c, i) => new RCostume(c.name, costumeUrl(t, i), { x: c.cx, y: c.cy }) as unknown as Leopard.Costume);
  self.sounds = t.sounds.map((s) => new Leopard.Sound(s.name, s.data || soundUrl(s.synth || "pop")));
  self.targetId = t.id;
  self.targetName = t.isStage ? "_stage_" : t.name;
}

export function buildRuntime(project: CodeProject, factory: ClassFactory, events: RuntimeEvents = {}): RProject {
  const classes = factory(LIB);
  const st = project.stage;
  const StageClass = (classes[st.id] || RStage) as unknown as typeof RStage;
  const stage = new StageClass({ costumeNumber: st.costume + 1, width: 480, height: 360 }, varsOf(st));
  dress(stage, st);

  const sprites: Record<string, RSprite> = {};
  project.sprites.forEach((t, i) => {
    const SpriteClass = (classes[t.id] || RSprite) as unknown as typeof RSprite;
    const s = new SpriteClass(
      { x: t.x, y: t.y, direction: t.direction, costumeNumber: t.costume + 1, size: t.size, visible: t.visible, layerOrder: i + 1 },
      varsOf(t),
    );
    dress(s, t);
    s.setRotation(t.rotationStyle);
    s.draggable = t.draggable;
    sprites[t.id] = s;
  });

  const rp = new RProject(stage, sprites);
  rp.events = events;
  rp.turbo = project.turbo;
  for (const [target, t] of [[stage, st], ...project.sprites.map((t) => [sprites[t.id], t] as const)] as [RSprite | RStage, Target][]) {
    (target as unknown as { audioEffects: { volume: number } }).audioEffects.volume = t.volume ?? 100;
    rp.varNames.set(target, new Map(t.variables.map((v) => [v.name, v.id])));
    const watchers = (target as unknown as { watchers: Record<string, Leopard.Watcher> }).watchers;
    const label = (name: string) => (t.isStage ? name : `${t.name}: ${name}`);
    for (const v of t.variables) {
      const w = t.watchers[v.id];
      const watcher = new Leopard.Watcher({
        label: label(v.name),
        value: () => (target as unknown as { vars: Record<string, string | number | boolean> }).vars[v.id],
        setValue: (n: number) => ((target as unknown as { vars: Record<string, unknown> }).vars[v.id] = n),
        style: w?.mode || "normal",
        visible: !!w?.visible,
        color: watcherColor,
        // Leopard places a watcher at left = x - 240 (from the stage's right edge); shift to Scratch's x.
        x: (w?.x ?? -235) + 480,
        y: w?.y ?? 175,
      });
      watchers[v.id] = watcher;
      rp.watcherIndex.set(v.id, watcher);
    }
    for (const l of t.lists) {
      const w = t.watchers[l.id];
      const watcher = new Leopard.Watcher({
        label: label(l.name),
        value: () => (target as unknown as { vars: Record<string, (string | number | boolean)[]> }).vars[l.id],
        visible: !!w?.visible,
        color: listColor,
        x: (w?.x ?? -235) + 480,
        y: w?.y ?? 140,
        width: 120,
        height: 160,
      });
      watchers[l.id] = watcher;
      rp.watcherIndex.set(l.id, watcher);
    }
  }
  return rp;
}

/** Writes a running stage's state (positions, costumes, variable values, layers) back into the project. */
export function absorb(project: CodeProject, rp: RProject): CodeProject {
  const snap = rp.snapshot();
  const update = (t: Target): Target => {
    const s = snap[t.id];
    if (!s) return t;
    const { varValues, ...rest } = s;
    return {
      ...t,
      ...rest,
      variables: t.variables.map((v) => (v.id in varValues ? { ...v, value: varValues[v.id] as string | number | boolean } : v)),
      lists: t.lists.map((l) => (l.id in varValues ? { ...l, value: varValues[l.id] as (string | number | boolean)[] } : l)),
      watchers: Object.fromEntries(Object.entries(t.watchers).map(([id, w]) => [id, { ...w, visible: rp.watcherFor(id)?.visible ?? w.visible }])),
    };
  };
  const order = rp.layerOrder();
  const sprites = project.sprites.map(update).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return { ...project, stage: update(project.stage), sprites };
}
