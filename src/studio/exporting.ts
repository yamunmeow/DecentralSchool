import runtime from "virtual:player-runtime";
import { encodeGame, shareable } from "../shared/codec";
import { buildPage } from "../shared/page";
import type { Game } from "../shared/types";

/** The self-contained student page: what downloads, previews and APKs carry. */
export const pageFor = (game: Game) => buildPage(runtime, shareable(game));

/** Student link. The game rides in the #fragment, which never reaches the server. */
export const linkFor = (game: Game) => `${new URL("/p/", window.location.origin).href}#${encodeGame(game)}`;

export const slug = (title: string) =>
  title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "game";

export function download(name: string, data: Blob | string, type = "text/html") {
  const blob = typeof data === "string" ? new Blob([data], { type: `${type};charset=utf-8` }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export const kb = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
