#!/usr/bin/env node
/**
 * Checks the French dictionary against the code: every literal t("…"), tn(n, "…", "…"),
 * tc("ctx", "…") and tj("…") has an entry, and no key is defined twice with different
 * French. Strings passed to t() as variables are caught at run time instead (the dev
 * server logs "[fr] missing" in the console).
 *
 *   node scripts/i18n-check.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dictDir = join(root, "src/studio/i18n/fr");

const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const unquote = (s) => JSON.parse(s[0] === '"' ? s : `"${s.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"')}"`);
const STR = String.raw`("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')`;

const dict = new Map();
const clashes = [];
for (const file of walk(dictDir).filter((f) => !f.endsWith("index.ts"))) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(new RegExp(String.raw`^\s*(?:${STR}|([A-Za-zÀ-ÿ_$][\w$]*))\s*:\s*\n?\s*${STR},?\s*$`, "gm"))) {
    const key = m[1] ? unquote(m[1]) : m[2];
    const value = unquote(m[3]);
    if (dict.has(key) && dict.get(key).value !== value) clashes.push(`${JSON.stringify(key)}: ${JSON.stringify(dict.get(key).value)} (${dict.get(key).file}) vs ${JSON.stringify(value)} (${file.slice(dictDir.length + 1)})`);
    dict.set(key, { value, file: file.slice(dictDir.length + 1) });
  }
}

const missing = new Map();
const used = (key, where) => !dict.has(key) && missing.set(key, where);
const sources = ["src/studio", "src/learn", "src/code/web"].flatMap((d) => walk(join(root, d)));
for (const file of sources.filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes("/i18n/"))) {
  const src = readFileSync(file, "utf8");
  const where = file.slice(root.length + 1);
  for (const m of src.matchAll(new RegExp(String.raw`\b(?:t|tj)\(\s*${STR}`, "g"))) used(unquote(m[1]), where);
  for (const m of src.matchAll(new RegExp(String.raw`\btn\([^,]+,\s*${STR}\s*,\s*${STR}`, "g"))) (used(unquote(m[1]), where), used(unquote(m[2]), where));
  for (const m of src.matchAll(new RegExp(String.raw`\btc\(\s*${STR}\s*,\s*${STR}`, "g"))) {
    const key = `${unquote(m[1])}: ${unquote(m[2])}`;
    if (!dict.has(key)) used(unquote(m[2]), where);
  }
}

for (const c of clashes) console.log("clash:", c);
for (const [k, where] of missing) console.log("missing:", JSON.stringify(k), "←", where);
console.log(`${dict.size} entries, ${missing.size} missing, ${clashes.length} clashes`);
process.exit(missing.size || clashes.length ? 1 : 0);
