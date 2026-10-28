import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";
import type { Check, CheckKind, CodeProject, Feedback, Mission } from "../../code/types";

export type { Check, CheckKind, Feedback, Mission, MissionStep } from "../../code/types";
import { uid } from "../../shared/random";
import { t } from "../i18n";

/**
 * Teachers supervise without a server. A challenge travels to students as a link
 * (or file); a student's work comes back as a hand-in file the student sends however
 * the class already shares things; feedback goes back as a link; approved games go
 * out to the class as one gallery page. Nothing passes through a server.
 */

export interface Challenge extends Mission {
  kind: "challenge";
  v: 1;
  id: string;
  starter: CodeProject;
  created: number;
  updated: number;
}

export interface HandIn {
  kind: "hand-in";
  v: 1;
  id: string;
  challengeId: string | null;
  challengeTitle: string;
  student: string;
  note: string;
  project: CodeProject;
  /** Steps the student ticked or the checks found done. */
  done: string[];
  at: number;
  /** Teacher side only: the latest feedback given. */
  feedback?: Feedback;
}

/* ---------- checks ---------- */

const ANY: Record<Exclude<CheckKind, "characters" | "backgrounds" | "outfits">, string[]> = {
  loop: ["control_repeat", "control_forever", "control_repeat_until"],
  if: ["control_if", "control_if_else"],
  say: ["looks_say", "looks_sayforsecs", "looks_think", "looks_thinkforsecs"],
  move: ["motion_movesteps", "motion_gotoxy", "motion_goto", "motion_glideto", "motion_glidesecstoxy", "motion_changexby", "motion_changeyby", "motion_setx", "motion_sety"],
  sound: ["sound_play", "sound_playuntildone"],
  key: ["event_whenkeypressed", "sensing_keypressed"],
  tap: ["event_whenthisspriteclicked", "event_whenstageclicked"],
  touching: ["sensing_touchingobject", "sensing_touchingcolor"],
  variable: ["data_setvariableto", "data_changevariableby"],
  list: ["data_addtolist", "data_insertatlist", "data_replaceitemoflist"],
  ask: ["sensing_askandwait"],
  random: ["operator_random"],
  signal: ["event_broadcast", "event_broadcastandwait"],
  copies: ["control_create_clone_of"],
  trick: ["procedures_definition"],
  draw: ["pen_penDown", "pen_stamp"],
};

// Labels are English; checkLabel() translates them.
export const CHECKS: { kind: CheckKind; label: string; counted?: boolean }[] = [
  { kind: "move", label: "Something moves" },
  { kind: "say", label: "A character says or thinks something" },
  { kind: "loop", label: "Uses a loop" },
  { kind: "if", label: "Uses an if" },
  { kind: "key", label: "Reacts to a key" },
  { kind: "tap", label: "Reacts to a tap" },
  { kind: "touching", label: "Checks if things touch" },
  { kind: "variable", label: "Uses a memory box (variable)" },
  { kind: "list", label: "Uses a list" },
  { kind: "ask", label: "Asks the player a question" },
  { kind: "random", label: "Uses a random number" },
  { kind: "sound", label: "Plays a sound" },
  { kind: "signal", label: "Sends a signal" },
  { kind: "copies", label: "Makes copies" },
  { kind: "trick", label: "Makes a trick of their own" },
  { kind: "draw", label: "Draws with the pen" },
  { kind: "characters", label: "Has at least N characters", counted: true },
  { kind: "backgrounds", label: "Has at least N backgrounds", counted: true },
  { kind: "outfits", label: "A character has at least N outfits", counted: true },
];

export const checkLabel = (c: Check) => t(CHECKS.find((x) => x.kind === c.kind)?.label || c.kind).replace("N", String(c.n ?? 2));

/** Every block type used anywhere in the project. */
export function blockTypes(p: CodeProject): Set<string> {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) return v.forEach(walk);
    const o = v as Record<string, unknown>;
    if (typeof o.type === "string" && ("id" in o || "fields" in o || "inputs" in o || "next" in o)) out.add(o.type);
    for (const k of Object.keys(o)) walk(o[k]);
  };
  for (const t of [p.stage, ...p.sprites]) walk(t.blocks);
  return out;
}

export function passes(check: Check, p: CodeProject, types = blockTypes(p)): boolean {
  const n = check.n ?? 2;
  if (check.kind === "characters") return p.sprites.length >= n;
  if (check.kind === "backgrounds") return p.stage.costumes.length >= n;
  if (check.kind === "outfits") return p.sprites.some((s) => s.costumes.length >= n);
  return ANY[check.kind].some((t) => types.has(t));
}

/** Steps done: checked steps that pass, plus steps the student ticked themselves. */
export function stepsDone(p: CodeProject): string[] {
  const m = p.mission;
  if (!m) return [];
  const types = blockTypes(p);
  return m.steps.filter((s) => (s.check ? passes(s.check, p, types) : (p.ticked || []).includes(s.id))).map((s) => s.id);
}

/* ---------- making things ---------- */

export function newChallenge(starter: CodeProject, teacher: string): Challenge {
  const now = Date.now();
  const id = uid();
  return {
    kind: "challenge",
    v: 1,
    id,
    challengeId: id,
    title: t("New challenge"),
    intro: "",
    steps: [
      { id: uid(), text: t("Make your character move"), check: { kind: "move" } },
      { id: uid(), text: t("Make it say something"), check: { kind: "say" } },
    ],
    categories: null,
    teacher,
    starter,
    created: now,
    updated: now,
  };
}

export const missionOf = (c: Challenge): Mission => ({ challengeId: c.id, title: c.title, intro: c.intro, steps: c.steps, categories: c.categories, teacher: c.teacher });

/** A student's own copy of the challenge's starter game. */
export function projectFor(c: Challenge, student: string): CodeProject {
  const now = Date.now();
  return { ...structuredClone(c.starter), id: uid(), title: student ? `${c.title} (${student})` : c.title, mission: missionOf(c), ticked: [], feedback: [], handedIn: undefined, created: now, updated: now };
}

export function handInOf(p: CodeProject, student: string, note: string): HandIn {
  const { feedback: _f, ...project } = p;
  return { kind: "hand-in", v: 1, id: uid(), challengeId: p.mission?.challengeId ?? null, challengeTitle: p.mission?.title ?? p.title, student, note, project: project as CodeProject, done: stepsDone(p), at: Date.now() };
}

/* ---------- links and files ---------- */

const toB64 = (bytes: Uint8Array) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64 = (s: string) => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

export const pack = (value: unknown) => toB64(deflateSync(strToU8(JSON.stringify(value)), { level: 9 }));
export const unpack = <T>(text: string): T => JSON.parse(strFromU8(inflateSync(fromB64(text))));

const studio = () => new URL("/", window.location.origin).href;
export const joinLink = (c: Challenge) => `${studio()}#/join/${pack(c)}`;
export const feedbackLink = (f: Feedback) => `${studio()}#/feedback/${pack(f)}`;

/** Links much longer than this don't survive some chat apps; offer the file instead. */
export const LINK_LIMIT = 30000;

/** Read a challenge or hand-in out of a file (JSON, or embedded in an .html page). */
export async function classFileContents(file: File): Promise<Challenge | HandIn> {
  const text = await file.text();
  const embedded = text.match(/<script type="application\/json" id="(?:hand-in|challenge)">([\s\S]*?)<\/script>/);
  const data = JSON.parse(embedded ? embedded[1] : text);
  if (data?.kind === "challenge" && data.starter) return data as Challenge;
  if (data?.kind === "hand-in" && data.project) return data as HandIn;
  throw new Error(t("That isn't a challenge or a hand-in."));
}

/** Hand a file to the phone's share sheet (WhatsApp, email, Classroom…) or download it. */
export async function shareFile(name: string, text: string, type: string, title: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([text], name, { type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return "downloaded";
}
