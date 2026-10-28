import { useState } from "react";
import type { Game } from "../../shared/types";
import { gameApk } from "../apk/game";
import { download, kb, linkFor, pageFor, slug } from "../exporting";
import { summary } from "../gameio";
import { useApp } from "../store";
import { t, tj } from "../i18n";
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
      toast(t("Android app ready: {size}", { size: kb(built.blob.size) }));
    } catch (e) {
      toast((e as Error).message || t("Couldn't build the app."), "error");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(linkFor(game));
      toast(t("Student link copied"));
    } catch {
      toast(t("Couldn't copy the link."), "error");
    }
  };

  return (
    <section className="card ready-bar" aria-label={t("Your game")}>
      <div className="ready-title">
        <span className="ready-emoji">{game.emoji}</span>
        <div className="grow">
          <strong>{game.title}</strong>
          <small>{summary(game)}</small>
        </div>
      </div>
      <div className="ready-actions">
        <button className="btn btn-primary btn-sm" onClick={apk} disabled={busy}>
          <Icon name="android" size={16} /> {busy ? t("Building…") : game.app ? t("Android app (v{n})", { n: game.app.versionCode + 1 }) : t("Android app")}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => download(`${slug(game.title)}.html`, pageFor(game))}>
          <Icon name="download" size={16} /> {t("Offline file")}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={copy}>
          <Icon name="link" size={16} /> {t("Link")}
        </button>
        <a className="btn btn-ghost btn-sm" href={`#/game/${game.id}`}>
          <Icon name="edit" size={16} /> {t("Edit")}
        </a>
        <a className="btn btn-ghost btn-sm" href={`#/game/${game.id}/share`}>
          <Icon name="share" size={16} /> {t("More")}
        </a>
      </div>
      {newKey && (
        <p className="note">
          {tj("A signing key was made for your apps. {backup}: updates must be signed with the same key.", { backup: <a href="#/settings">{t("Back it up")}</a> })}
        </p>
      )}
    </section>
  );
}
