import { uid } from "../shared/random";
import { BACKDROP_LIBRARY, SPRITE_LIBRARY } from "./art";
import type { CodeProject, CostumeAsset, Target } from "./types";

export function newTarget(name: string, isStage: boolean, costumes: CostumeAsset[], extra: Partial<Target> = {}): Target {
  return {
    id: uid(),
    name,
    isStage,
    costumes,
    costume: 0,
    sounds: isStage ? [] : [{ id: uid(), name: "pop", synth: "pop" }],
    blocks: {},
    variables: [],
    lists: [],
    watchers: {},
    volume: 100,
    x: 0,
    y: 0,
    direction: 90,
    size: 100,
    visible: true,
    rotationStyle: "all around",
    draggable: false,
    ...extra,
  };
}

export function spriteFromLibrary(itemId: string, existing: string[], extra: Partial<Target> = {}): Target {
  const item = SPRITE_LIBRARY.find((i) => i.id === itemId) || SPRITE_LIBRARY[0];
  return newTarget(uniqueName(item.name, existing), false, item.costumes(), { size: item.kind === "zo" ? 70 : 100, ...extra });
}

export function uniqueName(name: string, taken: string[]): string {
  if (!taken.includes(name)) return name;
  for (let i = 2; ; i++) if (!taken.includes(`${name}${i}`)) return `${name}${i}`;
}

export function newProject(title = "Untitled"): CodeProject {
  const now = Date.now();
  const stage = newTarget("Stage", true, [BACKDROP_LIBRARY.find((b) => b.id === "white")!.costume()]);
  const zo = spriteFromLibrary("zo", []);
  zo.variables = [];
  return {
    kind: "code",
    v: 1,
    id: uid(),
    title,
    stage: { ...stage, variables: [{ id: uid(), name: "my variable", value: 0 }] },
    sprites: [zo],
    broadcasts: [{ id: uid(), name: "message1" }],
    turbo: false,
    touchPad: true,
    created: now,
    updated: now,
  };
}

export const allTargets = (p: CodeProject) => [p.stage, ...p.sprites];
