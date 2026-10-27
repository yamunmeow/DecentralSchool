import { makeAuth, type AuthEnv } from "./auth";
import { handleFame, type FameEnv } from "./fame";

interface Env extends AuthEnv, FameEnv {
  ASSETS: Fetcher;
}

let auth: ReturnType<typeof makeAuth> | undefined;

/**
 * Runs only for /api/* (see run_worker_first in wrangler.jsonc): sign-in, and the Wall of Fame
 * (worker/fame.ts). Every other path is a static file served straight from dist/.
 */
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/auth/")) {
      auth ??= makeAuth(env);
      return auth.handler(request);
    }
    if (pathname.startsWith("/api/")) {
      auth ??= makeAuth(env);
      const signedIn = auth;
      const fame = await handleFame(request, env, async () => {
        const s = await signedIn.api.getSession({ headers: request.headers });
        return s ? { id: s.user.id, email: s.user.email } : null;
      });
      if (fame) return fame;
      return new Response("Not found", { status: 404 });
    }
    return env.ASSETS.fetch(request);
  },
  // Daily (see triggers in wrangler.jsonc): sessions that ran out are deleted, not just ignored.
  async scheduled(_, env) {
    const now = new Date().toISOString();
    await env.DB.batch([env.DB.prepare(`delete from "session" where "expiresAt" < ?`).bind(now), env.DB.prepare(`delete from "verification" where "expiresAt" < ?`).bind(now)]);
  },
} satisfies ExportedHandler<Env>;
