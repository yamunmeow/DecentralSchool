import { useEffect, useRef } from "react";
import { GameReady } from "../components/GameReady";
import { PhonePreview } from "../components/PhonePreview";
import { kb } from "../exporting";
import { askAssistant } from "../pages/Home";
import { useApp } from "../store";
import { Icon } from "../ui";
import { foundSummary, KIND_LABEL, kindsFor, lessonGame, type Lesson, type LessonKind } from "./detect";
import type { HtmlGame } from "./htmlGame";

export type Upload =
  | { kind: "html"; file: string; game: HtmlGame; id: string }
  | { kind: "lesson"; file: string; lesson: Lesson; text: string; id: string; chosen: LessonKind };

/** What came out of an uploaded file: the game, how it was read, and everything to hand it out. */
export function UploadResult({ upload, onChange, onAgain }: { upload: Upload; onChange: (u: Upload) => void; onAgain: () => void }) {
  const { byId, save } = useApp();
  const game = byId(upload.id);
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    box.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [upload.id]);
  if (!game) return null;

  const switchTo = (k: LessonKind) => {
    if (upload.kind !== "lesson" || k === upload.chosen) return;
    void save({ ...lessonGame(upload.lesson, k, game.id), title: game.title, app: game.app, created: game.created });
    onChange({ ...upload, chosen: k });
  };

  return (
    <section className="upload-result" ref={box} aria-label="Your uploaded game">
      <div className="upload-info">
        <div className="card">
          <div className="upload-head">
            <span className="upload-badge">
              <Icon name={upload.kind === "html" ? "code" : "file"} size={18} />
            </span>
            <div className="grow">
              <small className="muted">From {upload.file}</small>
              <input className="upload-title" value={game.title} aria-label="Game name" onChange={(e) => void save({ ...game, title: e.target.value })} />
            </div>
          </div>

          {upload.kind === "html" ? (
            <>
              <p>
                <strong>Your HTML game</strong>, ready as it is · {kb(new Blob([upload.game.html]).size)}
              </p>
              {upload.game.warnings.map((w) => (
                <p key={w} className="note">
                  {w}
                </p>
              ))}
            </>
          ) : (
            <>
              <p>
                Looks like <strong>{KIND_LABEL[upload.lesson.best].toLowerCase()}</strong>. Found {foundSummary(upload.lesson, upload.chosen)}.
              </p>
              <div className="kind-pick" role="radiogroup" aria-label="Make it a">
                <span className="muted">Make it a</span>
                {(["reading", "quiz", "math", "grammar", "vocab"] as LessonKind[]).map((k) => {
                  const ok = kindsFor(upload.lesson).includes(k);
                  return (
                    <button key={k} type="button" role="radio" aria-checked={upload.chosen === k} className={`chip-btn${upload.chosen === k ? " on" : ""}`} disabled={!ok} title={ok ? undefined : "Nothing of this kind was found in the file"} onClick={() => switchTo(k)}>
                      {upload.chosen === k && <Icon name="check" size={14} />} {KIND_LABEL[k]}
                    </button>
                  );
                })}
              </div>
              {upload.lesson.unmarked > 0 && (upload.chosen === "quiz" || upload.chosen === "reading") && (
                <p className="note">
                  {upload.lesson.unmarked} question{upload.lesson.unmarked === 1 ? " had" : "s had"} no answer marked. Tick the right one in <a href={`#/game/${game.id}`}>Edit</a>.
                </p>
              )}
            </>
          )}
          <div className="toolbar">
            <button type="button" className="link-btn" onClick={onAgain}>
              <Icon name="upload" size={16} /> Upload another file
            </button>
            {upload.kind === "lesson" && (
              <button type="button" className="link-btn" onClick={() => askAssistant(`Make a game from this lesson.\n\nText from “${upload.file}”:\n"""\n${upload.text.slice(0, 12000)}\n"""`)}>
                <Icon name="sparkle" size={16} /> Let the AI make it instead
              </button>
            )}
          </div>
        </div>
        <GameReady game={game} />
      </div>
      <PhonePreview game={game} />
    </section>
  );
}
