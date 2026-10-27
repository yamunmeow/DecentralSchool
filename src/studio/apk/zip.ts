/** Just enough ZIP for APKs: read entries without unpacking them, write them back aligned. */

export interface ZipEntry {
  name: string;
  /** 0 = stored, 8 = deflated. */
  method: number;
  crc: number;
  size: number;
  /** The bytes as they sit in the archive (compressed when method is 8). */
  data: Uint8Array;
  attrs: number;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function readZip(buf: Uint8Array): ZipEntry[] {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--)
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw new Error("not a zip file");
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out: ZipEntry[] = [];
  const dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("broken central directory");
    const method = v.getUint16(p + 10, true);
    const crc = v.getUint32(p + 16, true);
    const csize = v.getUint32(p + 20, true);
    const size = v.getUint32(p + 24, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const attrs = v.getUint32(p + 38, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    out.push({ name, method, crc, size, data: buf.subarray(start, start + csize), attrs });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

const DOS_TIME = (1 << 11) | (1 << 5) | 1; // 01:01:02
const DOS_DATE = (1 << 9) | (1 << 5) | 1; // 1981-01-01

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/**
 * Writes entries as the three parts APK signing works on. Stored entries are aligned:
 * 4 bytes, or 16 KB for native libraries (what zipalign does).
 */
export function writeZip(entries: ZipEntry[]): { body: Uint8Array; central: Uint8Array; eocd: Uint8Array } {
  const enc = new TextEncoder();
  const body: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    const utf8 = /[^\x00-\x7f]/.test(e.name) ? 0x800 : 0;
    let extra = new Uint8Array(0);
    if (e.method === 0) {
      const align = e.name.endsWith(".so") ? 16384 : 4;
      const start = offset + 30 + name.length;
      const pad = (align - ((start + 6) % align)) % align;
      extra = new Uint8Array(6 + pad);
      const xv = new DataView(extra.buffer);
      xv.setUint16(0, 0xd935, true);
      xv.setUint16(2, 2 + pad, true);
      xv.setUint16(4, align, true);
    }
    const version = e.method === 8 ? 20 : 10;
    const head = new Uint8Array(30);
    const h = new DataView(head.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, version, true);
    h.setUint16(6, utf8, true);
    h.setUint16(8, e.method, true);
    h.setUint16(10, DOS_TIME, true);
    h.setUint16(12, DOS_DATE, true);
    h.setUint32(14, e.crc, true);
    h.setUint32(18, e.data.length, true);
    h.setUint32(22, e.size, true);
    h.setUint16(26, name.length, true);
    h.setUint16(28, extra.length, true);
    body.push(head, name, extra, e.data);

    const cd = new Uint8Array(46);
    const c = new DataView(cd.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 0x0314, true);
    c.setUint16(6, version, true);
    c.setUint16(8, utf8, true);
    c.setUint16(10, e.method, true);
    c.setUint16(12, DOS_TIME, true);
    c.setUint16(14, DOS_DATE, true);
    c.setUint32(16, e.crc, true);
    c.setUint32(20, e.data.length, true);
    c.setUint32(24, e.size, true);
    c.setUint16(28, name.length, true);
    c.setUint32(38, e.attrs || (0o100644 << 16) >>> 0, true);
    c.setUint32(42, offset, true);
    central.push(cd, name);
    offset += 30 + name.length + extra.length + e.data.length;
  }
  const cdBytes = concat(central);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdBytes.length, true);
  ev.setUint32(16, offset, true);
  return { body: concat(body), central: cdBytes, eocd };
}

export { concat };
