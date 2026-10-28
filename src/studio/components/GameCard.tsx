import type { CSSProperties, ReactNode } from "react";
import type { Tint } from "../../shared/types";
import { t } from "../i18n";
import { PALETTE } from "../palette";
import { Icon } from "../ui";

type IconName = Parameters<typeof Icon>[0]["name"];

/** What sits on the cover: an emoji or a thumbnail in a white square, or an app icon as it is. */
export type Cover = { emoji: string } | { img: string; framed?: boolean };

interface CardProps {
  title: string;
  blurb?: ReactNode;
  tags?: string[];
  cover: Cover;
  /** Cover colour; without one the cover is the brand yellow with doodles. */
  tint?: Tint;
  /** Something extra on the cover, such as the game's critter. */
  coverExtra?: ReactNode;
  /** The cover's main action: a link, or a button. */
  href?: string;
  onOpen?: () => void;
  badge?: { label: string; icon: IconName };
  actions?: ReactNode;
  className?: string;
}

/** The card every game on the site is shown in: a cover to open it, then title, blurb, tags and actions. */
export function GameCard({ title, blurb, tags = [], cover, tint, coverExtra, href, onOpen, badge, actions, className = "" }: CardProps) {
  badge ??= { label: t("Play"), icon: "play" };
  const style = tint ? ({ "--cover": PALETTE[tint].tint } as CSSProperties) : undefined;
  const inner = (
    <>
      <CoverPicture cover={cover} />
      {coverExtra}
      <span className="play-badge">
        <Icon name={badge.icon} size={18} /> {badge.label}
      </span>
    </>
  );
  const label = `${badge.label} ${title}`;
  return (
    <article className={`play-card${className ? ` ${className}` : ""}`}>
      {href ? (
        <a className={`play-cover${tint ? " is-tinted" : ""}`} href={href} style={style} aria-label={label}>
          {inner}
        </a>
      ) : (
        <button type="button" className={`play-cover${tint ? " is-tinted" : ""}`} onClick={onOpen} style={style} aria-label={label}>
          {inner}
        </button>
      )}
      <div className="play-body">
        <h3>{title}</h3>
        {blurb && <p>{blurb}</p>}
        {tags.length > 0 && (
          <div className="tags">
            {tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}
        {actions && <div className="play-actions">{actions}</div>}
      </div>
    </article>
  );
}

function CoverPicture({ cover }: { cover: Cover }) {
  if ("emoji" in cover)
    return (
      <span className="play-pic" aria-hidden>
        {cover.emoji}
      </span>
    );
  if (cover.framed)
    return (
      <span className="play-pic">
        <img src={cover.img} alt="" />
      </span>
    );
  return <img src={cover.img} alt="" width={104} height={104} />;
}

/** The small tile, for the CAEB games: icon, title and one line. */
export function GameTile({ img, title, note, onOpen, label }: { img: string; title: string; note: string; onOpen: () => void; label?: string }) {
  return (
    <button type="button" className="quiz-tile game-tile" onClick={onOpen} aria-label={label}>
      <img src={img} alt="" width={52} height={52} className="lib-icon" />
      <strong>{title}</strong>
      <small>{note}</small>
    </button>
  );
}
