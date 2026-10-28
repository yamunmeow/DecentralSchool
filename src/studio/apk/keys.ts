import { kv } from "../db";
import { createSigningKey, importSigningKey, type SigningKey } from "./sign";
import { t } from "../i18n";

/**
 * The teacher's app-signing key. Android only installs an update over an existing app
 * if both were signed with the same key, so it is kept in this browser and can be
 * backed up to a file and restored on another computer.
 */

interface Stored {
  pkcs8: Uint8Array;
  spki: Uint8Array;
  cert: Uint8Array;
  created: number;
}

const KEY = "signing-key";
// Kept from before the rename, so older key backups still restore.
const FILE_TYPE = "decentralschool-signing-key";

export const loadStored = () => kv.get<Stored>(KEY);

export async function getSigningKey(): Promise<SigningKey> {
  let stored = await loadStored();
  if (!stored) {
    stored = { ...(await createSigningKey()), created: Date.now() };
    await kv.set(KEY, stored);
  }
  return importSigningKey(stored);
}

export async function newSigningKey(): Promise<Stored> {
  const stored = { ...(await createSigningKey()), created: Date.now() };
  await kv.set(KEY, stored);
  return stored;
}

const b64 = (b: Uint8Array) => btoa(Array.from(b, (x) => String.fromCharCode(x)).join(""));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function exportKeyFile(): Promise<Blob | null> {
  const s = await loadStored();
  if (!s) return null;
  const body = { type: FILE_TYPE, version: 1, created: s.created, pkcs8: b64(s.pkcs8), spki: b64(s.spki), cert: b64(s.cert) };
  return new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
}

export async function importKeyFile(file: File): Promise<void> {
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await file.text());
  } catch {
    throw new Error(t("That file isn't a signing key backup."));
  }
  if (body.type !== FILE_TYPE || typeof body.pkcs8 !== "string" || typeof body.cert !== "string" || typeof body.spki !== "string")
    throw new Error(t("That file isn't a signing key backup."));
  const stored: Stored = { pkcs8: unb64(body.pkcs8), spki: unb64(body.spki), cert: unb64(body.cert), created: Number(body.created) || Date.now() };
  await importSigningKey(stored); // throws if the key is unusable
  await kv.set(KEY, stored);
}
