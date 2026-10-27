import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";
import type { CodeProject } from "./types";

/** Game Lab projects in a link: "c1." + base64url(raw DEFLATE(JSON)) after the "#". */
const PREFIX = "c1.";

const toB64 = (bytes: Uint8Array) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export function encodeProject(p: CodeProject): string {
  return PREFIX + toB64(deflateSync(strToU8(JSON.stringify(p)), { level: 9 }));
}

export function decodeProject(fragment: string): CodeProject {
  const text = fragment.replace(/^#/, "");
  if (!text.startsWith(PREFIX)) throw new Error("not a project link");
  const b64 = text.slice(PREFIX.length).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  return JSON.parse(strFromU8(inflateSync(Uint8Array.from(bin, (c) => c.charCodeAt(0)))));
}
