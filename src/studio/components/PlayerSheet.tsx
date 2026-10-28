import { useEffect, useRef, type ReactNode } from "react";
import { t } from "../i18n";
import { Icon } from "../ui";

/** A game to show: a built page (played from srcdoc, with no access to the studio) or a library URL. */
export type Show = ({ kind: "page"; page: string } | { kind: "url"; url: string }) & { title: string; actions: ReactNode };
/** `run` changes on every new start, so the same game can be played again from the top. */
export type Playing = Show & { run: number };

/** A game filling the screen, with its own buttons in the bar on top. */
export function PlayerSheet({ playing, onClose }: { playing: Playing; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="player-sheet"
      aria-label={playing.title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header className="player-bar">
        <button className="icon-btn" onClick={onClose} aria-label={t("Close game")}>
          <Icon name="close" size={22} />
        </button>
        <strong className="player-title">{playing.title}</strong>
        <span className="spacer" />
        {playing.actions}
      </header>
      {playing.kind === "url" ? (
        <iframe key={playing.run} title={playing.title} src={playing.url} sandbox="allow-scripts allow-same-origin allow-modals allow-downloads" />
      ) : (
        <iframe key={playing.run} title={playing.title} srcDoc={playing.page} sandbox="allow-scripts allow-modals allow-downloads" />
      )}
    </dialog>
  );
}
