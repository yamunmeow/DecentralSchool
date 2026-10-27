import type { PaintDoc } from "./paint";

/**
 * A Game Lab project. Targets keep Scratch's model (a stage plus sprites, each with
 * costumes, sounds, variables and scripts); scripts are stored as Blockly's own
 * serialisation, using Scratch's block opcodes so the two stay easy to map.
 */

export type RotationStyle = "all around" | "left-right" | "don't rotate";

/** A drawing from the built-in library, made on demand from code. */
export interface ArtRef {
  lib: "zo" | "thing" | "backdrop";
  id: string;
  /** Zo poses: stand, walk1, walk2, jump, wave, cheer. */
  pose?: string;
}

export interface CostumeAsset {
  id: string;
  name: string;
  ref?: ArtRef;
  /** A drawing of the student's own (SVG markup), when there is no ref. */
  svg?: string;
  /** The paint editor's shapes, so a drawing made there can be changed again. */
  paint?: PaintDoc;
  /** Rotation centre in the drawing's own units. */
  cx: number;
  cy: number;
}

export interface SoundAsset {
  id: string;
  name: string;
  /** A built-in synthesised sound. */
  synth?: string;
  /** A recording or upload (data: URL). */
  data?: string;
}

export interface VariableDef {
  id: string;
  name: string;
  value: string | number | boolean;
}

export interface ListDef {
  id: string;
  name: string;
  value: (string | number | boolean)[];
}

export interface Watcher {
  visible: boolean;
  x?: number;
  y?: number;
  mode?: "normal" | "large" | "slider";
}

export interface Target {
  id: string;
  name: string;
  isStage: boolean;
  costumes: CostumeAsset[];
  /** 0-based index of the current costume. */
  costume: number;
  sounds: SoundAsset[];
  /** Blockly workspace serialisation (blocks and comments only; variables live below). */
  blocks: Record<string, unknown>;
  variables: VariableDef[];
  lists: ListDef[];
  watchers: Record<string, Watcher>;
  volume: number;
  /* Sprites only. */
  x: number;
  y: number;
  direction: number;
  size: number;
  visible: boolean;
  rotationStyle: RotationStyle;
  draggable: boolean;
}

export interface Broadcast {
  id: string;
  name: string;
}

export interface CodeProject {
  kind: "code";
  v: 1;
  id: string;
  title: string;
  stage: Target;
  /** Bottom layer first. */
  sprites: Target[];
  broadcasts: Broadcast[];
  /** Run as fast as possible (Scratch's turbo mode). */
  turbo: boolean;
  /** Show on-screen arrow keys and space bar when played on a touch screen. */
  touchPad: boolean;
  /** The web version (Web tab), once the student has changed it; otherwise it's made from the blocks. */
  web?: WebState;
  /** "Connect the dots" challenges done. */
  dots?: string[];
  /** The teacher's challenge this game answers (a copy, so it works offline). */
  mission?: Mission;
  /** Mission steps without an automatic check that the student ticked. */
  ticked?: string[];
  /** When the student last handed it in, and the ids of the hand-ins sent (feedback names one). */
  handedIn?: number;
  handInIds?: string[];
  /** What the teacher said about it. */
  feedback?: Feedback[];
  created: number;
  updated: number;
}

export interface WebState {
  html: string;
  css: string;
  js: string;
  /** What the files were when the student started changing them (for the challenges). */
  base: { html: string; css: string; js: string };
}

/* ---------- class work: a teacher's challenge and feedback, carried in the project ---------- */

export type CheckKind = "loop" | "if" | "say" | "move" | "sound" | "key" | "tap" | "touching" | "variable" | "list" | "ask" | "random" | "signal" | "copies" | "trick" | "draw" | "characters" | "backgrounds" | "outfits";

export interface Check {
  kind: CheckKind;
  /** characters / backgrounds / outfits: at least this many. */
  n?: number;
}

export interface MissionStep {
  id: string;
  text: string;
  hint?: string;
  check?: Check;
}

export interface Mission {
  challengeId: string;
  title: string;
  intro: string;
  steps: MissionStep[];
  /** Block categories shown in the palette; null shows them all. */
  categories: string[] | null;
  teacher: string;
}

export interface Feedback {
  kind: "feedback";
  v: 1;
  handInId: string;
  challengeId: string;
  /** 0–3 */
  stars: number;
  status: "approved" | "try-again";
  comment: string;
  teacher: string;
  at: number;
}
