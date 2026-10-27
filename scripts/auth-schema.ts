// Prints the SQL for the tables Better Auth needs, from the same options the Worker uses:
//   node scripts/auth-schema.ts > migrations/000N_name.sql
// Run it after changing worker/auth.ts, against a copy of the current schema, to get only what changed.
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { getMigrations } from "better-auth/db/migration";
import { options, type AuthEnv } from "../worker/auth.ts";

const db = new DatabaseSync(":memory:");
for (const f of readdirSync("migrations").filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(`migrations/${f}`, "utf8"));

const env = { DB: db, BETTER_AUTH_URL: "http://localhost", BETTER_AUTH_SECRET: "x".repeat(32) } as unknown as AuthEnv;
const { compileMigrations } = await getMigrations(options(env));
const sql = (await compileMigrations()).replace(/^;$/, "").trim();
process.stdout.write((sql || "-- Nothing to change.") + "\n");
