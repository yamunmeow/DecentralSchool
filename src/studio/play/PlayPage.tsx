import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CodeProject } from "../../code/types";
import { normalize } from "../../shared/normalize";
import { uid } from "../../shared/random";
import type { Game } from "../../shared/types";
import { appFile } from "../code/files";
import { STARTERS } from "../code/starters";
import { projects } from "../db";
import { download, pageFor, slug } from "../exporting";
import { SourcePicker, DEFAULT_SOURCE } from "../random/Randomizer";
import { describe, fetchQuestions, type Source } from "../random/sources";
import { go, useApp } from "../store";
import { fromStarter, TEMPLATE_INFO } from "../templates";
import { Icon, Modal } from "../ui";
import { asCustom, fromLibrary, LIBRARY, libraryUrl, singleFile, type LibraryGame } from "./library";

const RANDOM: { title: string; emoji: string; source: Source }[] = [
  { title: "Capitals of Africa", emoji: "🌍", source: { kind: "countries", topic: "capital", region: "Africa" } },
  { title: "Flags of the world", emoji: "🚩", source: { kind: "countries", topic: "flag", region: "" } },
  { title: "World mix", emoji: "🗺️", source: { kind: "countries", topic: "mixed", region: "" } },
  { title: "General knowledge", emoji: "💡", source: { kind: "trivia", category: 9, difficulty: "easy" } },
  { title: "Science & nature", emoji: "🔬", source: { kind: "trivia", category: 17, difficulty: "easy" } },
  { title: "Animals", emoji: "🐘", source: { kind: "trivia", category: 27, difficulty: "easy" } },
  { title: "Word meanings", emoji: "🔤", source: { kind: "words", topic: "food" } },
];

type Show = ({ kind: "page"; page: string } | { kind: "url"; url: string }) & { title: string; actions: ReactNode };
type Playing = Show & { run: number };

/** Play anything here straight away, with nothing to install; copy what you like into the studio. */
export function PlayPage({ id }: { id?: string }) {
  const { save, toast } = useApp();
  const [playing, setShown] = useState<Playing | null>(null);
  const runs = useRef(0);
  const setPlaying = (p: Show | null) => setShown(p && ({ ...p, run: ++runs.current } as Playing));
  const [custom, setCustom] = useState(false);

  const keep = async (game: Game) => {
    await save(game);
    go(`game/${game.id}`);
  };

  const playLibrary = (g: LibraryGame) =>
    setPlaying({
      kind: "url",
      title: g.title,
      url: libraryUrl(g),
      actions: <LibraryActions g={g} onKeep={keep} compact />,
    });

  useEffect(() => {
    const g = LIBRARY.find((x) => x.id === id);
    if (g) playLibrary(g);
    // Only on arrival from a link such as #/play/word-quest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playRandom = async (title: string, emoji: string, source: Source) => {
    try {
      const got = await fetchQuestions(source, 30);
      const game = normalize({ template: "quiz", title, subtitle: describe(source), emoji, tint: "sky", settings: { round: 10 }, questions: got.questions }, { id: uid() });
      setPlaying({
        kind: "page",
        title,
        page: pageFor(game),
        actions: (
          <>
            <button className="btn btn-coral btn-sm" onClick={() => playRandom(title, emoji, source)}>
              <Icon name="shuffle" size={16} /> New set
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => keep(game)}>
              <Icon name="copy" size={16} /> <span className="hide-sm">Keep as a quiz</span>
            </button>
          </>
        ),
      });
      if (got.offline) toast("No internet: this set is made from saved words");
    } catch (e) {
      toast(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "Couldn't reach the question service. Country quizzes work offline.", "error");
    }
  };

  const playQuick = (game: Game) =>
    setPlaying({
      kind: "page",
      title: game.title,
      page: pageFor(game),
      actions: (
        <button className="btn btn-ghost btn-sm" onClick={() => keep({ ...game, id: uid() })}>
          <Icon name="edit" size={16} /> Make it mine
        </button>
      ),
    });

  const playCode = (p: CodeProject) =>
    setPlaying({
      kind: "page",
      title: p.title,
      page: appFile(p),
      actions: (
        <button
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            const copy = { ...p, id: uid(), created: Date.now(), updated: Date.now() };
            await projects.put(copy);
            go(`code/${copy.id}`);
          }}
        >
          <Icon name="code" size={16} /> See the blocks
        </button>
      ),
    });

  return (
    <div className="page play-page">
      <section className="hero play-hero">
        <div className="hero-text">
          <h1>Play now</h1>
          <p className="hero-lede">Nothing to install and no sign-up. Every game here keeps working without the internet.</p>
        </div>
        <ul className="hero-points" aria-label="What you can do here">
          <li>
            <Icon name="play" size={20} /> Play in the browser
          </li>
          <li>
            <Icon name="edit" size={20} /> Make it your own
          </li>
          <li>
            <Icon name="download" size={20} /> Download for offline
          </li>
        </ul>
      </section>

      <section aria-labelledby="caeb">
        <div className="page-head">
          <h2 id="caeb" className="section-title">
            Games from the CAEB, Porto-Novo
          </h2>
        </div>
        <div className="play-grid">
          {LIBRARY.map((g) => (
            <article key={g.id} className="play-card">
              <button className="play-cover" onClick={() => playLibrary(g)} aria-label={`Play ${g.title}`}>
                <img src={libraryUrl(g, "icon.png")} alt="" width={96} height={96} />
                <span className="play-badge">
                  <Icon name="play" size={18} /> Play
                </span>
              </button>
              <div className="play-body">
                <h3>{g.title}</h3>
                <p>{g.blurb}</p>
                <div className="tags">
                  {g.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
                <LibraryActions g={g} onKeep={keep} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="random">
        <div className="page-head">
          <h2 id="random" className="section-title">
            Random quizzes
          </h2>
          <span className="pill">A new set every time</span>
        </div>
        <div className="tile-grid">
          {RANDOM.map((r) => (
            <button key={r.title} className="quiz-tile" onClick={() => playRandom(r.title, r.emoji, r.source)}>
              <span className="quiz-emoji">{r.emoji}</span>
              <strong>{r.title}</strong>
              <small>{r.source.kind === "countries" ? "Works offline" : "Online"}</small>
            </button>
          ))}
          <button className="quiz-tile is-make" onClick={() => setCustom(true)}>
            <span className="quiz-emoji">
              <Icon name="dice" size={30} />
            </span>
            <strong>Choose your own</strong>
            <small>Subject, level, region</small>
          </button>
        </div>
      </section>

      <section aria-labelledby="quick">
        <div className="page-head">
          <h2 id="quick" className="section-title">
            Quick game examples
          </h2>
        </div>
        <div className="tile-grid">
          {TEMPLATE_INFO.flatMap((t) => t.starters.map((s) => ({ t, s }))).map(({ t, s }) => {
            const game = fromStarter(s);
            return (
              <button key={`${t.id}-${s.title}`} className="quiz-tile" onClick={() => playQuick(game)}>
                <span className="quiz-emoji">{game.emoji}</span>
                <strong>{game.title}</strong>
                <small>{t.name}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="lab">
        <div className="page-head">
          <h2 id="lab" className="section-title">
            Made in the Game Lab
          </h2>
        </div>
        <div className="tile-grid">
          {STARTERS.map((s) => (
            <button key={s.id} className="quiz-tile" onClick={() => playCode(s.make())}>
              <img src={s.thumb()} alt="" width={56} height={70} />
              <strong>{s.title}</strong>
              <small>{s.blurb}</small>
            </button>
          ))}
        </div>
      </section>

      {custom && <CustomRandom onClose={() => setCustom(false)} onPlay={(src) => (setCustom(false), playRandom(describe(src), "🎲", src))} />}
      {playing && <PlayerSheet playing={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}

function LibraryActions({ g, onKeep, compact }: { g: LibraryGame; onKeep: (game: Game) => void; compact?: boolean }) {
  const { toast } = useApp();
  const [menu, setMenu] = useState(false);
  const run = (fn: () => Promise<void>) => fn().catch((e: Error) => toast(e.message || "Something went wrong", "error"));
  return (
    <div className="play-actions">
      <div className="menu-wrap">
        <button className={`btn ${compact ? "btn-ghost" : "btn-primary"} btn-sm`} aria-expanded={menu} onClick={() => setMenu(!menu)}>
          <Icon name="edit" size={16} /> Make it mine
        </button>
        {menu && (
          <>
            <div className="menu-catch" onClick={() => setMenu(false)} />
            <div className={`menu ${compact ? "menu-down" : "menu-left"}`} role="menu">
              {g.templates.map((t) => (
                <button key={t.file} role="menuitem" onClick={() => (setMenu(false), run(async () => onKeep(await fromLibrary(g, t.file))))}>
                  <Icon name="game" size={18} /> {t.label}
                </button>
              ))}
              <button role="menuitem" onClick={() => (setMenu(false), run(async () => onKeep(await asCustom(g))))}>
                <Icon name="code" size={18} /> Its HTML code
              </button>
            </div>
          </>
        )}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => run(async () => download(`${slug(g.title)}.html`, await singleFile(g)))}>
        <Icon name="download" size={16} /> {compact ? <span className="hide-sm">.html</span> : ".html"}
      </button>
    </div>
  );
}

function CustomRandom({ onClose, onPlay }: { onClose: () => void; onPlay: (s: Source) => void }) {
  const [src, setSrc] = useState<Source>(DEFAULT_SOURCE);
  return (
    <Modal
      title="Random quiz"
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button className="btn btn-primary" onClick={() => onPlay(src)} disabled={src.kind === "words" && !src.topic.trim()}>
            <Icon name="play" size={18} /> Play
          </button>
        </>
      }
    >
      <SourcePicker value={src} onChange={setSrc} />
    </Modal>
  );
}

/** A game filling the screen, with its own buttons in the bar on top. */
function PlayerSheet({ playing, onClose }: { playing: Playing; onClose: () => void }) {
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
        <button className="icon-btn" onClick={onClose} aria-label="Close game">
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
