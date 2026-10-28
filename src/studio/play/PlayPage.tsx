import { useEffect, useRef, useState } from "react";
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
import { fromStarter, startersFor, TEMPLATE_INFO } from "../templates";
import { getLang, t } from "../i18n";
import { Icon, Modal } from "../ui";
import { PlayerSheet, type Playing, type Show } from "../components/PlayerSheet";
import { GameCard, GameTile } from "../components/GameCard";
import { Critter } from "../Critter";
import { summary } from "../gameio";
import { TEMPLATE_CRITTER } from "../palette";
import { asCustom, fromLibrary, LIBRARY, libraryUrl, pageFile, singleFile, type LibraryGame } from "./library";

// Titles are English; shown through t().
const RANDOM: { title: string; emoji: string; source: Source }[] = [
  { title: "Capitals of Africa", emoji: "🌍", source: { kind: "countries", topic: "capital", region: "Africa" } },
  { title: "Flags of the world", emoji: "🚩", source: { kind: "countries", topic: "flag", region: "" } },
  { title: "World mix", emoji: "🗺️", source: { kind: "countries", topic: "mixed", region: "" } },
  { title: "General knowledge", emoji: "💡", source: { kind: "trivia", category: 9, difficulty: "easy" } },
  { title: "Science & nature", emoji: "🔬", source: { kind: "trivia", category: 17, difficulty: "easy" } },
  { title: "Animals", emoji: "🐘", source: { kind: "trivia", category: 27, difficulty: "easy" } },
  { title: "Word meanings", emoji: "🔤", source: { kind: "words", topic: "food" } },
];


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
      title: t(g.title),
      url: libraryUrl(g, pageFile(g)),
      actions: <LibraryActions g={g} onKeep={keep} />,
    });

  useEffect(() => {
    const g = LIBRARY.find((x) => x.id === id);
    if (g) playLibrary(g);
    // Only on arrival from a link such as #/play/word-quest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playRandom = async (title: string, emoji: string, source: Source) => {
    title = t(title);
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
              <Icon name="shuffle" size={16} /> {t("New set")}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => keep(game)}>
              <Icon name="copy" size={16} /> <span className="hide-sm">{t("Keep as a quiz")}</span>
            </button>
          </>
        ),
      });
      if (got.offline) toast(t("No internet: this set is made from saved words"));
    } catch (e) {
      toast(e instanceof Error && e.message !== "Failed to fetch" ? e.message : t("Couldn't reach the question service. Country quizzes work offline."), "error");
    }
  };

  const playQuick = (game: Game) =>
    setPlaying({
      kind: "page",
      title: game.title,
      page: pageFor(game),
      actions: (
        <button className="btn btn-ghost btn-sm" onClick={() => keep({ ...game, id: uid() })}>
          <Icon name="edit" size={16} /> {t("Make it mine")}
        </button>
      ),
    });

  const openBlocks = async (p: CodeProject) => {
    const copy = { ...p, id: uid(), created: Date.now(), updated: Date.now() };
    await projects.put(copy);
    go(`code/${copy.id}`);
  };

  const playCode = (p: CodeProject) =>
    setPlaying({
      kind: "page",
      title: p.title,
      page: appFile(p),
      actions: (
        <button className="btn btn-ghost btn-sm" onClick={() => openBlocks(p)}>
          <Icon name="code" size={16} /> {t("See the blocks")}
        </button>
      ),
    });

  return (
    <div className="page play-page">
      <section className="hero play-hero">
        <div className="hero-text">
          <h1>{t("Play now")}</h1>
          <p className="hero-lede">{t("Free, with nothing to install and no sign-up. Every game here keeps working without the internet.")}</p>
        </div>
        <ul className="hero-points" aria-label={t("What you can do here")}>
          <li>
            <Icon name="play" size={20} /> {t("Play in the browser")}
          </li>
          <li>
            <Icon name="edit" size={20} /> {t("Make it your own")}
          </li>
          <li>
            <Icon name="download" size={20} /> {t("Download for offline")}
          </li>
        </ul>
      </section>

      <section aria-labelledby="random">
        <div className="page-head">
          <h2 id="random" className="section-title">
            {t("Random quizzes")}
          </h2>
          <span className="pill">{t("A new set every time")}</span>
        </div>
        <div className="play-grid">
          {RANDOM.map((r) => (
            <GameCard
              key={r.title}
              title={t(r.title)}
              blurb={describe(r.source)}
              tags={[t("Quiz"), r.source.kind === "countries" ? t("Works offline") : getLang() === "fr" ? t("In English") : t("Online")]}
              cover={{ emoji: r.emoji }}
              tint="sky"
              onOpen={() => playRandom(r.title, r.emoji, r.source)}
            />
          ))}
          <GameCard
            className="is-make"
            title={t("Choose your own")}
            blurb={t("Pick the subject, the level and the region.")}
            tags={[t("Quiz")]}
            cover={{ emoji: "🎲" }}
            badge={{ label: t("Choose"), icon: "dice" }}
            onOpen={() => setCustom(true)}
          />
        </div>
      </section>

      <section aria-labelledby="quick">
        <div className="page-head">
          <h2 id="quick" className="section-title">
            {t("Quick game examples")}
          </h2>
        </div>
        <div className="play-grid">
          {TEMPLATE_INFO.flatMap((tpl) => startersFor(tpl).map((s) => ({ tpl, s }))).map(({ tpl, s }) => {
            const game = fromStarter(s);
            return (
              <GameCard
                key={`${tpl.id}-${s.title}`}
                title={game.title}
                blurb={game.subtitle || summary(game)}
                tags={[t(tpl.name)]}
                cover={{ emoji: game.emoji }}
                tint={game.tint}
                coverExtra={<Critter kind={TEMPLATE_CRITTER[game.template]} color={game.tint} size={56} className="play-critter" />}
                onOpen={() => playQuick(game)}
                actions={
                  <button className="btn btn-ghost btn-sm" onClick={() => keep({ ...game, id: uid() })}>
                    <Icon name="edit" size={16} /> {t("Make it mine")}
                  </button>
                }
              />
            );
          })}
        </div>
      </section>

      <section aria-labelledby="lab">
        <div className="page-head">
          <h2 id="lab" className="section-title">
            {t("Made in the Game Lab")}
          </h2>
        </div>
        <div className="play-grid">
          {STARTERS.map((s) => (
            <GameCard
              key={s.id}
              title={t(s.title)}
              blurb={t(s.blurb)}
              tags={[t("Game Lab")]}
              cover={{ img: s.thumb(), framed: true }}
              tint="mint"
              onOpen={() => playCode(s.make())}
              actions={
                <button className="btn btn-ghost btn-sm" onClick={() => openBlocks(s.make())}>
                  <Icon name="code" size={16} /> {t("See the blocks")}
                </button>
              }
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="caeb">
        <div className="page-head">
          <h2 id="caeb" className="section-title">
            {t("Games from the CAEB, Porto-Novo")}
          </h2>
        </div>
        <div className="tile-grid">
          {LIBRARY.map((g) => (
            <GameTile key={g.id} img={libraryUrl(g, "icon.png")} title={t(g.title)} note={g.tags.map((tag) => t(tag)).join(" · ")} label={t("Play {title}", { title: t(g.title) })} onOpen={() => playLibrary(g)} />
          ))}
        </div>
      </section>

      {custom && <CustomRandom onClose={() => setCustom(false)} onPlay={(src) => (setCustom(false), playRandom(describe(src), "🎲", src))} />}
      {playing && <PlayerSheet playing={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}

/** "Make it mine" and the .html download, in the player bar of a CAEB game. */
function LibraryActions({ g, onKeep }: { g: LibraryGame; onKeep: (game: Game) => void }) {
  const { toast } = useApp();
  const [menu, setMenu] = useState(false);
  const run = (fn: () => Promise<void>) => fn().catch((e: Error) => toast(e.message || t("Something went wrong. Try again."), "error"));
  return (
    <div className="play-actions">
      <div className="menu-wrap">
        <button className="btn btn-ghost btn-sm" aria-expanded={menu} onClick={() => setMenu(!menu)}>
          <Icon name="edit" size={16} /> {t("Make it mine")}
        </button>
        {menu && (
          <>
            <div className="menu-catch" onClick={() => setMenu(false)} />
            <div className="menu menu-down" role="menu">
              {g.templates.map((tpl) => (
                <button key={tpl.file} role="menuitem" onClick={() => (setMenu(false), run(async () => onKeep(await fromLibrary(g, tpl.file))))}>
                  <Icon name="game" size={18} /> {t(tpl.label)}
                </button>
              ))}
              <button role="menuitem" onClick={() => (setMenu(false), run(async () => onKeep(await asCustom(g))))}>
                <Icon name="code" size={18} /> {t("Its HTML code")}
              </button>
            </div>
          </>
        )}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => run(async () => download(`${slug(t(g.title))}.html`, await singleFile(g)))}>
        <Icon name="download" size={16} /> <span className="hide-sm">.html</span>
      </button>
    </div>
  );
}

function CustomRandom({ onClose, onPlay }: { onClose: () => void; onPlay: (s: Source) => void }) {
  const [src, setSrc] = useState<Source>(DEFAULT_SOURCE);
  return (
    <Modal
      title={t("Random quiz")}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button className="btn btn-primary" onClick={() => onPlay(src)} disabled={src.kind === "words" && !src.topic.trim()}>
            <Icon name="play" size={18} /> {t("Play")}
          </button>
        </>
      }
    >
      <SourcePicker value={src} onChange={setSrc} />
    </Modal>
  );
}
