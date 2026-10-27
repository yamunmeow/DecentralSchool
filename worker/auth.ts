import { betterAuth, type BetterAuthOptions } from "better-auth";

export interface AuthEnv {
  DB: D1Database;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  MICROSOFT_CLIENT_ID: string;
  MICROSOFT_CLIENT_SECRET: string;
}

/**
 * Sign-in with Google or Microsoft, nothing else: no passwords to store or reset, so no
 * email has to be sent. The database keeps only what the privacy page promises: a name,
 * an email, which provider it came from, and a session token while signed in.
 */
export function options(env: AuthEnv): BetterAuthOptions {
  return {
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    telemetry: { enabled: false },
    // A sign-in that can't be finished (an expired handshake, say) comes back to the studio, not to a bare error page.
    onAPIError: { errorURL: "/#/signin" },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: "select_account",
      },
      microsoft: {
        clientId: env.MICROSOFT_CLIENT_ID,
        clientSecret: env.MICROSOFT_CLIENT_SECRET,
        tenantId: "common",
        prompt: "select_account",
        // Only "sign you in and read your basic profile", without Graph access or a stored photo.
        disableDefaultScope: true,
        scope: ["openid", "profile", "email"],
        disableProfilePhoto: true,
        // Some work and school accounts have no email claim; their sign-in name is the next best thing.
        mapProfileToUser: (p) => (!p.email && p.preferred_username?.includes("@") ? { email: p.preferred_username, emailVerified: false } : {}),
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      // Checks within five minutes are answered from a signed cookie instead of the database.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    account: {
      // The sign-in handshake lives in an encrypted cookie, not as a database row.
      storeStateStrategy: "cookie",
      updateAccountOnSignIn: false,
    },
    user: { deleteUser: { enabled: true } },
    databaseHooks: {
      user: {
        create: { before: async (user) => ({ data: { ...user, image: null } }) },
      },
      account: {
        // Google and Microsoft hand back tokens to act on the person's behalf. They're never used, so never kept.
        create: { before: async (account) => ({ data: { ...account, accessToken: null, refreshToken: null, idToken: null, accessTokenExpiresAt: null, refreshTokenExpiresAt: null } }) },
      },
      session: {
        create: { before: async (session) => ({ data: { ...session, ipAddress: null, userAgent: null } }) },
      },
    },
  };
}

export const makeAuth = (env: AuthEnv) => betterAuth(options(env));
