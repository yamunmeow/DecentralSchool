import { inflateSync, strFromU8 } from "fflate";

/**
 * Games travel in the part of a link after "#". Browsers never send that part to
 * the server, so a shared link keeps the game between the teacher and the students.
 * Format: "g1." + base64url(raw DEFLATE(JSON)). Encoding lives in codec.ts, so the
 * player carries only the decoder.
 */
export const PREFIX = "g1.";

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function decodeGame(fragment: string): unknown {
  const text = fragment.replace(/^#/, "");
  if (!text.startsWith(PREFIX)) throw new Error("not a game link");
  return JSON.parse(strFromU8(inflateSync(fromBase64Url(text.slice(PREFIX.length)))));
}
