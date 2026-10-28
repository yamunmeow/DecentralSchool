import { useMemo, useState } from "react";
import type { Game } from "../../shared/types";
import { pageFor } from "../exporting";
import { t } from "../i18n";
import { Icon } from "../ui";

/** The student page in a phone-sized, sandboxed frame. Its progress never touches the studio. */
export function PhonePreview({ game, compact }: { game: Game; compact?: boolean }) {
  const [run, setRun] = useState(0);
  const page = useMemo(() => pageFor(game), [game]);
  return (
    <div className={`phone-wrap${compact ? " is-compact" : ""}`}>
      <div className="phone">
        <iframe key={run} title={t("{title} preview", { title: game.title })} srcDoc={page} sandbox="allow-scripts allow-modals" />
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => setRun((n) => n + 1)}>
        <Icon name="shuffle" size={16} /> {t("Restart")}
      </button>
    </div>
  );
}
