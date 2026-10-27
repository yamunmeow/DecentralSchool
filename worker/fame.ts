/**
 * The Wall of Fame: teachers send in a game from the studio, reviewers (the emails in the
 * REVIEWERS secret) play it and feature it or not, and featured games are shown to everyone
 * signed in. Nothing here is public: every route needs a signed-in account.
 */

export interface FameEnv {
  DB: D1Database;
  /** Comma-separated emails of the people who review submissions (wrangler secret put REVIEWERS). */
  REVIEWERS?: string;
}

export interface Who {
  id: string;
  email: string;
}

const LIMITS = { title: 80, blurb: 240, credit: 80, school: 120, note: 1000, reply: 600, thumb: 60_000, tag: 20, emoji: 16 };
/** Request bodies above this are refused before they're read. */
const MAX_BODY = 3 * 1024 * 1024;
/** D1 keeps a value of up to 2 MB; the gzipped game must fit with room to spare. */
const MAX_GAME = 1_800_000;
/** Games one teacher can have waiting at once, and send in a day. */
const MAX_WAITING = 5;
const MAX_PER_DAY = 10;
const DAY = 24 * 60 * 60 * 1000;

const TINTS = new Set(["lilac", "sky", "peach", "mint", "lemon", "sage", "rose", "sand"]);
const TAGS = new Set(["quiz", "math", "grammar", "vocab", "reading", "custom"]);

type Row = {
  id: string;
  kind: "quick" | "lab";
  title: string;
  tag: string;
  emoji: string;
  tint: string;
  thumb: string;
  blurb: string;
  credit: string;
  school: string;
  note: string;
  size: number;
  status: "waiting" | "featured" | "declined";
  reply: string;
  createdAt: number;
  reviewedAt: number | null;
};

/** Everything but the game itself, the note to reviewers and who sent it. */
const CARD = `"id", "kind", "title", "tag", "emoji", "tint", "thumb", "blurb", "credit", "school", "reviewedAt"`;
const OWN = `${CARD}, "note", "size", "status", "reply", "createdAt"`;

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store", ...headers } });
const fail = (status: number, error: string) => json({ error }, status);

export const isReviewer = (env: FameEnv, who: Who) =>
  (env.REVIEWERS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(who.email.toLowerCase());

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** D1 hands a BLOB back as an array of byte values. */
async function gunzip(data: number[] | ArrayBuffer): Promise<string> {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : Uint8Array.from(data);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

/** A trimmed string of at most `max` characters, or "" for anything else. */
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Only a small picture: an SVG or PNG data: URL. */
const thumbOf = (v: unknown) => {
  const t = typeof v === "string" ? v : "";
  return t.length <= LIMITS.thumb && /^data:image\/(svg\+xml|png)[;,]/.test(t) ? t : "";
};

/** The game a teacher sends must look like one of ours: a quick game or a Game Lab project. */
function checkGame(kind: "quick" | "lab", game: unknown): string | null {
  if (!game || typeof game !== "object" || Array.isArray(game)) return "That isn't a game.";
  const g = game as Record<string, unknown>;
  if (kind === "lab") return g.kind === "code" && g.stage && Array.isArray(g.sprites) ? null : "That isn't a Game Lab game.";
  return typeof g.template === "string" && TAGS.has(g.template) ? null : "That isn't a quick game.";
}

/** Requests that change something must come from the studio itself, as JSON. */
const sameSite = (request: Request) => {
  const origin = request.headers.get("Origin");
  return (!origin || origin === new URL(request.url).origin) && (request.headers.get("Content-Type") || "").startsWith("application/json");
};

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  if (Number(request.headers.get("Content-Length") || 0) > MAX_BODY) return null;
  const raw = await request.text();
  if (raw.length > MAX_BODY) return null;
  try {
    const body = JSON.parse(raw);
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

/** Handles /api/fame/* and /api/submissions/* and /api/review/*; anything else is null. */
export async function handleFame(request: Request, env: FameEnv, whoami: () => Promise<Who | null>): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  const parts = pathname.split("/").filter(Boolean).slice(1);
  const [area, id] = parts;
  if (!["fame", "submissions", "review"].includes(area) || parts.length > 2) return null;

  const who = await whoami();
  if (!who) return fail(401, "Sign in first.");
  const reviewer = isReviewer(env, who);
  const method = request.method;
  if (method !== "GET" && !sameSite(request)) return fail(403, "That request didn't come from the studio.");

  // The wall: featured games, newest first.
  if (area === "fame" && !id && method === "GET") {
    const { results } = await env.DB.prepare(`select ${CARD} from "submission" where "status" = 'featured' order by "reviewedAt" desc limit 200`).all<Row>();
    return json({ games: results });
  }

  // One game to play or copy: a featured one, your own, or any for a reviewer.
  if (area === "fame" && id && method === "GET") {
    const row = await env.DB.prepare(`select "kind", "game", "status", "userId" from "submission" where "id" = ?`)
      .bind(id)
      .first<{ kind: string; game: number[]; status: string; userId: string }>();
    if (!row || (row.status !== "featured" && row.userId !== who.id && !reviewer)) return fail(404, "That game isn't on the Wall of Fame.");
    return json({ kind: row.kind, game: JSON.parse(await gunzip(row.game)) });
  }

  if (area === "submissions" && !id && method === "GET") {
    const { results } = await env.DB.prepare(`select ${OWN} from "submission" where "userId" = ? order by "createdAt" desc`).bind(who.id).all<Row>();
    return json({ mine: results, reviewer });
  }

  if (area === "submissions" && !id && method === "POST") {
    const body = await readBody(request);
    if (!body) return fail(413, "That game is too big to send. Games up to about 2 MB fit.");
    const kind = body.kind === "lab" ? "lab" : body.kind === "quick" ? "quick" : null;
    if (!kind) return fail(400, "That isn't a game.");
    const problem = checkGame(kind, body.game);
    if (problem) return fail(400, problem);
    const title = text(body.title, LIMITS.title);
    const blurb = text(body.blurb, LIMITS.blurb);
    const credit = text(body.credit, LIMITS.credit);
    if (!title || !blurb || !credit) return fail(400, "Fill in the title, what makes it special, and your name.");
    if (body.consent !== true) return fail(400, "Tick both boxes to send it.");

    const now = Date.now();
    const counts = await env.DB.prepare(
      `select sum("status" = 'waiting') as "waiting", sum("createdAt" > ?) as "today" from "submission" where "userId" = ?`,
    )
      .bind(now - DAY, who.id)
      .first<{ waiting: number | null; today: number | null }>();
    if ((counts?.waiting || 0) >= MAX_WAITING) return fail(429, `You have ${MAX_WAITING} games waiting for review. Send more once they're reviewed.`);
    if ((counts?.today || 0) >= MAX_PER_DAY) return fail(429, "That's a lot of games for one day. Send the rest tomorrow.");

    const game = await gzip(JSON.stringify(body.game));
    if (game.byteLength > MAX_GAME) return fail(413, "That game is too big to send. Games up to about 2 MB fit.");
    const g = body.game as Record<string, unknown>;
    const row = {
      id: crypto.randomUUID(),
      kind,
      title,
      tag: kind === "quick" ? text(g.template, LIMITS.tag) : "",
      emoji: kind === "quick" ? text(g.emoji, LIMITS.emoji) : "",
      tint: kind === "quick" && typeof g.tint === "string" && TINTS.has(g.tint) ? g.tint : "",
      thumb: kind === "lab" ? thumbOf(body.thumb) : "",
      blurb,
      credit,
      school: text(body.school, LIMITS.school),
      note: text(body.note, LIMITS.note),
    };
    await env.DB.prepare(
      `insert into "submission" ("id", "userId", "kind", "title", "tag", "emoji", "tint", "thumb", "blurb", "credit", "school", "note", "game", "size", "createdAt") values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(row.id, who.id, row.kind, row.title, row.tag, row.emoji, row.tint, row.thumb, row.blurb, row.credit, row.school, row.note, game, game.byteLength, now)
      .run();
    return json({ id: row.id }, 201);
  }

  // A teacher can take a game back at any time, from the wall too.
  if (area === "submissions" && id && method === "DELETE") {
    const { meta } = await env.DB.prepare(`delete from "submission" where "id" = ? and "userId" = ?`).bind(id, who.id).run();
    return meta.changes ? json({ ok: true }) : fail(404, "That submission isn't yours.");
  }

  if (area === "review") {
    if (!reviewer) return fail(403, "Only reviewers can see this.");
    if (!id && method === "GET") {
      const { results } = await env.DB.prepare(
        `select ${OWN}, (select "name" from "user" where "user"."id" = "userId") as "account", (select "email" from "user" where "user"."id" = "userId") as "email"
         from "submission" where "status" = 'waiting' or "reviewedAt" > ? order by "status" = 'waiting' desc, "createdAt" asc limit 300`,
      )
        .bind(Date.now() - 60 * DAY)
        .all<Row & { account: string; email: string }>();
      return json({ submissions: results });
    }
    if (id && method === "POST") {
      const body = await readBody(request);
      const status = body?.status;
      if (status !== "featured" && status !== "declined" && status !== "waiting") return fail(400, "Pick feature, decline or back to waiting.");
      const { meta } = await env.DB.prepare(`update "submission" set "status" = ?, "reply" = ?, "reviewedAt" = ? where "id" = ?`)
        .bind(status, text(body?.reply, LIMITS.reply), status === "waiting" ? null : Date.now(), id)
        .run();
      return meta.changes ? json({ ok: true }) : fail(404, "That submission is gone.");
    }
  }

  return fail(405, "Not allowed.");
}
