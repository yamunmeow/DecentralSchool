import { deflateSync, strToU8 } from "fflate";
import { PREFIX } from "./decode";
import type { Game } from "./types";

export { decodeGame } from "./decode";

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** What goes into a link or file: the game without the teacher's own bookkeeping. */
export function shareable(game: Game): Game {
  const { app: _app, ...rest } = game;
  return rest as Game;
}

export function encodeGame(game: Game): string {
  return PREFIX + toBase64Url(deflateSync(strToU8(JSON.stringify(shareable(game))), { level: 9 }));
}
