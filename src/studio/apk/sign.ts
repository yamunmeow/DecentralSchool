import { concat } from "./zip";

/**
 * APK Signature Scheme v2 with WebCrypto (RSA PKCS#1 v1.5 + SHA-256), which is all a
 * minSdk 24+ app needs. A port of the CAEB games' tools/sign_apk.py.
 */

const CHUNK = 1024 * 1024;
const V2_BLOCK_ID = 0x7109871a;
const RSA_PKCS1_SHA256 = 0x0103;
const MAGIC = new TextEncoder().encode("APK Sig Block 42");

const u32 = (n: number) => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
};
const u64 = (n: number) => {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, BigInt(n), true);
  return b;
};
const lp = (...parts: Uint8Array[]) => {
  const body = concat(parts);
  return concat([u32(body.length), body]);
};
const sha256 = async (data: Uint8Array) => new Uint8Array(await crypto.subtle.digest("SHA-256", data as BufferSource));

async function v2Digest(sections: Uint8Array[]): Promise<Uint8Array> {
  const digests: Uint8Array[] = [];
  for (const sec of sections)
    for (let i = 0; i < sec.length; i += CHUNK) {
      const chunk = sec.subarray(i, i + CHUNK);
      digests.push(await sha256(concat([new Uint8Array([0xa5]), u32(chunk.length), chunk])));
    }
  return sha256(concat([new Uint8Array([0x5a]), u32(digests.length), ...digests]));
}

export interface SigningKey {
  privateKey: CryptoKey;
  /** SubjectPublicKeyInfo, DER. */
  spki: Uint8Array;
  /** X.509 certificate, DER. */
  cert: Uint8Array;
}

/** body, central and eocd as written by writeZip(); returns the signed APK. */
export async function signApk(body: Uint8Array, central: Uint8Array, eocd: Uint8Array, key: SigningKey): Promise<Uint8Array> {
  const digest = await v2Digest([body, central, eocd]);
  const signedData = concat([lp(lp(u32(RSA_PKCS1_SHA256), lp(digest))), lp(lp(key.cert)), lp()]);
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key.privateKey, signedData as BufferSource));
  const signer = concat([lp(signedData), lp(lp(u32(RSA_PKCS1_SHA256), lp(signature))), lp(key.spki)]);
  const value = lp(lp(signer));
  const pairs = concat([u64(4 + value.length), u32(V2_BLOCK_ID), value]);
  const size = pairs.length + 8 + 16;
  const block = concat([u64(size), pairs, u64(size), MAGIC]);
  const end = eocd.slice();
  new DataView(end.buffer).setUint32(16, body.length + block.length, true);
  return concat([body, block, central, end]);
}

/* ---------- a self-signed certificate, DER-encoded by hand ---------- */

function der(tag: number, ...parts: Uint8Array[]): Uint8Array {
  const body = concat(parts);
  const n = body.length;
  const len = n < 0x80 ? [n] : n < 0x100 ? [0x81, n] : n < 0x10000 ? [0x82, n >> 8, n & 0xff] : [0x83, n >> 16, (n >> 8) & 0xff, n & 0xff];
  return concat([new Uint8Array([tag, ...len]), body]);
}

function oid(dotted: string): Uint8Array {
  const [a, b, ...rest] = dotted.split(".").map(Number);
  const out = [40 * a + b];
  for (const n of rest) {
    const bytes = [n & 0x7f];
    for (let x = n >> 7; x > 0; x >>= 7) bytes.unshift(0x80 | (x & 0x7f));
    out.push(...bytes);
  }
  return der(0x06, new Uint8Array(out));
}

const seq = (...p: Uint8Array[]) => der(0x30, ...p);
const text = (s: string) => new TextEncoder().encode(s);
const time = (d: Date) => {
  const iso = d.toISOString().replace(/[-:T]/g, "").slice(0, 14) + "Z";
  return d.getUTCFullYear() < 2050 ? der(0x17, text(iso.slice(2))) : der(0x18, text(iso));
};

export async function createSigningKey(name = "DecentralSchool"): Promise<{ pkcs8: Uint8Array; spki: Uint8Array; cert: Uint8Array }> {
  const pair = (await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const serial = crypto.getRandomValues(new Uint8Array(16));
  serial[0] &= 0x7f;
  const sha256WithRsa = seq(oid("1.2.840.113549.1.1.11"), new Uint8Array([0x05, 0x00]));
  const dn = seq(der(0x31, seq(oid("2.5.4.3"), der(0x0c, text(name)))));
  const now = new Date();
  const tbs = seq(
    der(0xa0, der(0x02, new Uint8Array([2]))),
    der(0x02, serial),
    sha256WithRsa,
    dn,
    seq(time(now), time(new Date(Date.UTC(now.getUTCFullYear() + 50, 0, 1)))),
    dn,
    spki,
  );
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, tbs as BufferSource));
  const cert = seq(tbs, sha256WithRsa, der(0x03, new Uint8Array([0]), sig));
  return { pkcs8, spki, cert };
}

export async function importSigningKey(stored: { pkcs8: Uint8Array; spki: Uint8Array; cert: Uint8Array }): Promise<SigningKey> {
  const privateKey = await crypto.subtle.importKey("pkcs8", stored.pkcs8 as BufferSource, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  return { privateKey, spki: stored.spki, cert: stored.cert };
}

/** SHA-256 of the certificate, the fingerprint Android shows for a signer. */
export async function fingerprint(cert: Uint8Array): Promise<string> {
  return Array.from(await sha256(cert), (b) => b.toString(16).padStart(2, "0")).join(":").toUpperCase();
}
