/**
 * Rewrites the shell's compiled (binary XML) AndroidManifest.xml: swaps the placeholder
 * package, label and versionName strings and sets versionCode. A port of the CAEB
 * games' tools/build_game.py rewrite_manifest().
 */

export const TEMPLATE_ID = "org.decentralschool.shell";
const LABEL_PLACEHOLDER = "SHELL_APP_LABEL";
const VERSION_PLACEHOLDER = "SHELL_VERSION_NAME";

interface Pool {
  strings: string[];
  utf8: boolean;
  flags: number;
  headerSize: number;
  size: number;
}

function readPool(b: Uint8Array, off: number): Pool {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const headerSize = v.getUint16(off + 2, true);
  const size = v.getUint32(off + 4, true);
  const count = v.getUint32(off + 8, true);
  const styles = v.getUint32(off + 12, true);
  const flags = v.getUint32(off + 16, true);
  const stringsStart = v.getUint32(off + 20, true);
  if (styles) throw new Error("template manifest has styled strings; rebuild the shell");
  const utf8 = (flags & 0x100) !== 0;
  const strings: string[] = [];
  const dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    let p = off + stringsStart + v.getUint32(off + headerSize + 4 * i, true);
    if (utf8) {
      p += b[p] & 0x80 ? 2 : 1;
      let n = b[p];
      if (n & 0x80) {
        n = ((n & 0x7f) << 8) | b[p + 1];
        p += 2;
      } else p += 1;
      strings.push(dec.decode(b.subarray(p, p + n)));
    } else {
      let n = v.getUint16(p, true);
      p += 2;
      if (n & 0x8000) {
        n = ((n & 0x7fff) << 16) | v.getUint16(p, true);
        p += 2;
      }
      let s = "";
      for (let k = 0; k < n; k++) s += String.fromCharCode(v.getUint16(p + 2 * k, true));
      strings.push(s);
    }
  }
  return { strings, utf8, flags, headerSize, size };
}

function encodeString(s: string, utf8: boolean): number[] {
  if (utf8) {
    const raw = Array.from(new TextEncoder().encode(s));
    const len = (n: number) => (n > 0x7f ? [0x80 | (n >> 8), n & 0xff] : [n]);
    return [...len(s.length), ...len(raw.length), ...raw, 0];
  }
  const n = s.length;
  const out = n > 0x7fff ? [((0x8000 | (n >> 16)) & 0xff), (0x8000 | (n >> 16)) >> 8, n & 0xff, (n >> 8) & 0xff] : [n & 0xff, n >> 8];
  for (let i = 0; i < n; i++) {
    const c = s.charCodeAt(i);
    out.push(c & 0xff, c >> 8);
  }
  out.push(0, 0);
  return out;
}

function buildPool(strings: string[], utf8: boolean, flags: number, headerSize: number): Uint8Array {
  const offsets: number[] = [];
  const blob: number[] = [];
  for (const s of strings) {
    offsets.push(blob.length);
    for (const x of encodeString(s, utf8)) blob.push(x);
  }
  while (blob.length % 4) blob.push(0);
  const stringsStart = headerSize + 4 * strings.length;
  const out = new Uint8Array(stringsStart + blob.length);
  const v = new DataView(out.buffer);
  v.setUint16(0, 0x0001, true);
  v.setUint16(2, headerSize, true);
  v.setUint32(4, out.length, true);
  v.setUint32(8, strings.length, true);
  v.setUint32(12, 0, true);
  v.setUint32(16, flags, true);
  v.setUint32(20, stringsStart, true);
  v.setUint32(24, 0, true);
  offsets.forEach((o, i) => v.setUint32(headerSize + 4 * i, o, true));
  out.set(blob, stringsStart);
  return out;
}

export function rewriteManifest(data: Uint8Array, app: { id: string; name: string; version: string; versionCode: number }): Uint8Array {
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (v.getUint16(0, true) !== 0x0003) throw new Error("template AndroidManifest.xml is not binary XML");
  const fileHeader = v.getUint16(2, true);
  const pool = readPool(data, fileHeader);
  const swaps: Record<string, string> = { [TEMPLATE_ID]: app.id, [LABEL_PLACEHOLDER]: app.name, [VERSION_PLACEHOLDER]: app.version };
  const missing = Object.keys(swaps).filter((k) => !pool.strings.includes(k));
  if (missing.length) throw new Error(`template manifest lacks ${missing.join(", ")}`);
  const newPool = buildPool(pool.strings.map((s) => swaps[s] ?? s), pool.utf8, pool.flags, pool.headerSize);

  const rest = data.slice(fileHeader + pool.size);
  const r = new DataView(rest.buffer);
  let patched = false;
  for (let off = 0; off < rest.length; ) {
    const type = r.getUint16(off, true);
    const header = r.getUint16(off + 2, true);
    const size = r.getUint32(off + 4, true);
    if (type === 0x0102) {
      const name = r.getUint32(off + header + 4, true);
      const attrStart = r.getUint16(off + header + 8, true);
      const attrSize = r.getUint16(off + header + 10, true);
      const attrCount = r.getUint16(off + header + 12, true);
      for (let i = 0; i < attrCount; i++) {
        const a = off + header + attrStart + i * attrSize;
        if (pool.strings[name] === "manifest" && pool.strings[r.getUint32(a + 4, true)] === "versionCode") {
          r.setUint32(a + 8, 0xffffffff, true); // no raw string value
          r.setUint16(a + 12, 8, true);
          r.setUint8(a + 14, 0);
          r.setUint8(a + 15, 0x10); // TYPE_INT_DEC
          r.setUint32(a + 16, app.versionCode, true);
          patched = true;
        }
      }
    }
    if (!size) break;
    off += size;
  }
  if (!patched) throw new Error("template manifest has no versionCode");

  const out = new Uint8Array(fileHeader + newPool.length + rest.length);
  out.set(data.subarray(0, fileHeader), 0);
  out.set(newPool, fileHeader);
  out.set(rest, fileHeader + newPool.length);
  new DataView(out.buffer).setUint32(4, out.length, true);
  return out;
}
