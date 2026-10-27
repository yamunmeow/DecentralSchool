import type { CodeProject } from "../../code/types";
import type { Game, Tint } from "../../shared/types";

/** Talks to the Worker's Wall of Fame routes (worker/fame.ts). They all need a signed-in account. */

export type Kind = "quick" | "lab";
export type Status = "waiting" | "featured" | "declined";

/** What the wall shows of a featured game. */
export interface FameCard {
  id: string;
  kind: Kind;
  title: string;
  /** A quick game's template. */
  tag: string;
  emoji: string;
  tint: Tint | "";
  /** A Game Lab game's picture. */
  thumb: string;
  blurb: string;
  credit: string;
  school: string;
  reviewedAt: number | null;
}

export interface Submission extends FameCard {
  note: string;
  size: number;
  status: Status;
  reply: string;
  createdAt: number;
}

export interface ForReview extends Submission {
  account: string;
  email: string;
}

export interface Sending {
  kind: Kind;
  game: Game | CodeProject;
  thumb?: string;
  title: string;
  blurb: string;
  credit: string;
  school: string;
  note: string;
  consent: boolean;
}

export class FameError extends Error {}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new FameError("No internet. The Wall of Fame needs a connection.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new FameError(data?.error || (res.status === 401 ? "Sign in again to use the Wall of Fame." : "The Wall of Fame isn't answering. Try again in a moment."));
  return data as T;
}

export const wall = () => call<{ games: FameCard[] }>("GET", "fame").then((r) => r.games);
export const fameGame = (id: string) => call<{ kind: Kind; game: unknown }>("GET", `fame/${encodeURIComponent(id)}`);
export const mine = () => call<{ mine: Submission[]; reviewer: boolean }>("GET", "submissions");
export const send = (s: Sending) => call<{ id: string }>("POST", "submissions", s);
export const withdraw = (id: string) => call<{ ok: true }>("DELETE", `submissions/${encodeURIComponent(id)}`, {});
export const forReview = () => call<{ submissions: ForReview[] }>("GET", "review").then((r) => r.submissions);
export const decide = (id: string, status: Status, reply: string) => call<{ ok: true }>("POST", `review/${encodeURIComponent(id)}`, { status, reply });

/** What leaves the device: the game, without class work, feedback or app-signing details. */
export function cleanGame(game: Game): Game {
  const { app: _app, ...rest } = game;
  return rest as Game;
}

export function cleanProject(p: CodeProject): CodeProject {
  const { mission: _m, ticked: _t, handedIn: _h, handInIds: _i, feedback: _f, dots: _d, ...rest } = p;
  return rest as CodeProject;
}
