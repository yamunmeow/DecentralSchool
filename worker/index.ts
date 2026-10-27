import { makeAuth, type AuthEnv } from "./auth";

interface Env extends AuthEnv {
  ASSETS: Fetcher;
}

let auth: ReturnType<typeof makeAuth> | undefined;

/**
 * Runs only for /api/* (see run_worker_first in wrangler.jsonc). Every other path is a
 * static file served straight from dist/, games and class work included.
 */
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/auth/")) {
      auth ??= makeAuth(env);
      return auth.handler(request);
    }
    if (pathname.startsWith("/api/")) return new Response("Not found", { status: 404 });
    return env.ASSETS.fetch(request);
  },
  // Daily (see triggers in wrangler.jsonc): sessions that ran out are deleted, not just ignored.
  async scheduled(_, env) {
    const now = new Date().toISOString();
    await env.DB.batch([env.DB.prepare(`delete from "session" where "expiresAt" < ?`).bind(now), env.DB.prepare(`delete from "verification" where "expiresAt" < ?`).bind(now)]);
  },
} satisfies ExportedHandler<Env>;
