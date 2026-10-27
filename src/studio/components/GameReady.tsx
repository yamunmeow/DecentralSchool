import { useState } from "react";
import type { Game } from "../../shared/types";
import { gameApk } from "../apk/game";
import { download, kb, linkFor, pageFor, slug } from "../exporting";
import { summary } from "../gameio";
import { useApp } from "../store";
import { Icon } from "../ui";

/** Everything a teacher does next with a game the assistant just made, without leaving the page. */
export function GameReady({ game }: { game: Game }) {
  const { save, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState(false);

  const apk = async () => {
    setBusy(true);
    try {
      const built = await gameApk(game);
      download(`${slug(game.title)}-v${built.app.versionCode}.apk`, built.blob, "application/vnd.android.package-archive");
      await save({ ...game, app: built.app });
      if (built.newKey) setNewKey(true);
      toast(`Android app ready: ${kb(built.blob.size)}`);
    } catch (e) {
      toast((e as Error).message || "Couldn't build the app.", "error");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(linkFor(game));
      toast("Student link copied");
    } catch {
      toast("Couldn't copy the link.", "error");
    }
  };

  return (
    <section className="card ready-bar" aria-label="Your game">
      <div className="ready-title">
        <span className="ready-emoji">{game.emoji}</span>
        <div className="grow">
          <strong>{game.title}</strong>
          <small>{summary(game)}</small>
        </div>
      </div>
      <div className="ready-actions">
        <button className="btn btn-primary btn-sm" onClick={apk} disabled={busy}>
          <Icon name="android" size={16} /> {busy ? "Building…" : game.app ? `Android app (v${game.app.versionCode + 1})` : "Android app"}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => download(`${slug(game.title)}.html`, pageFor(game))}>
          <Icon name="download" size={16} /> Offline file
        </button>
        <button className="btn btn-ghost btn-sm" onClick={copy}>
          <Icon name="link" size={16} /> Link
        </button>
        <a className="btn btn-ghost btn-sm" href={`#/game/${game.id}`}>
          <Icon name="edit" size={16} /> Edit
        </a>
        <a className="btn btn-ghost btn-sm" href={`#/game/${game.id}/share`}>
          <Icon name="share" size={16} /> More
        </a>
      </div>
      {newKey && (
        <p className="note">
          A signing key was made for your apps. <a href="#/settings">Back it up</a>: updates must be signed with the same key.
        </p>
      )}
    </section>
  );
}
