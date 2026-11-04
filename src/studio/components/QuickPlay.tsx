import { useMemo, useRef, useState } from "react";
import { normalize, READING_ACTIVITIES, VOCAB_MODES } from "../../shared/normalize";
import { uid } from "../../shared/random";
import type { Game, GrammarItem, Passage, Template, Word } from "../../shared/types";
import { KIND_LABEL } from "../editors/GrammarEditor";
import { MathEditor } from "../editors/MathEditor";
import { ACTIVITY_LABEL } from "../editors/ReadingEditor";
import { MODE_LABEL } from "../editors/VocabEditor";
import { Section } from "../editors/common";
import { pageFor } from "../exporting";
import { DEFAULT_SOURCE, SourcePicker } from "../random/Randomizer";
import { describe, fetchQuestions, fetchWords, WORD_TOPICS, type Source } from "../random/sources";
import { go, useApp } from "../store";
import { blankGame, fromStarter, startersFor, templateInfo } from "../templates";
import { getLang, t, tc } from "../i18n";
import { Field, Icon, Modal } from "../ui";
import { GameSettings } from "./GameSettings";
import { PlayerSheet, type Playing } from "./PlayerSheet";

type Kind = GrammarItem["type"];
const KINDS = Object.keys(KIND_LABEL) as Kind[];

/** Where a round's problems come from; the game itself holds every other option. */
interface Choices {
  /** Quiz: countries, trivia or words. */
  source: Source;
  /** Grammar: which kinds of sentence. */
  kinds: Kind[];
  /** Vocabulary: the example word lists, or words about a topic. */
  wordsFrom: "lists" | "topic";
  lists: number[];
  topic: string;
  /** Reading: which example texts (by place in the pool). */
  texts: number[];
  /** Your own game: which example. */
  example: number;
}

interface Setup {
  game: Game;
  pick: Choices;
}

const KEY = (template: Template) => `ds-play-${template}`;

/** Every example of a template, pooled: the problems a random round draws from. */
function poolsFor(template: Template) {
  const games = startersFor(templateInfo(template)).map(fromStarter);
  return {
    games,
    items: games.flatMap((g) => (g.template === "grammar" ? g.items : [])),
    lists: games.map((g) => (g.template === "vocab" ? g.words : [])),
    texts: games.flatMap((g) => (g.template === "reading" ? g.passages : [])),
  };
}

type Pools = ReturnType<typeof poolsFor>;

function fresh(template: Template, pools: Pools): Setup {
  const game = { ...blankGame(template), title: t(templateInfo(template).name) };
  return {
    game,
    pick: {
      source: DEFAULT_SOURCE,
      kinds: KINDS,
      wordsFrom: "lists",
      lists: pools.lists.map((_, i) => i),
      topic: "animals",
      texts: pools.texts.map((_, i) => i),
      example: 0,
    },
  };
}

function load(template: Template, pools: Pools): Setup {
  const start = fresh(template, pools);
  try {
    const saved = JSON.parse(localStorage.getItem(KEY(template)) || "null") as Setup | null;
    if (!saved) return start;
    return { game: normalize({ ...saved.game, template }, { id: start.game.id }), pick: { ...start.pick, ...saved.pick } };
  } catch {
    return start;
  }
}

function remember(template: Template, setup: Setup) {
  try {
    localStorage.setItem(KEY(template), JSON.stringify(setup));
  } catch {
    /* private mode: the choices last until the window closes */
  }
}

const shuffle = <T,>(a: T[]): T[] => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

function ready({ game, pick }: Setup, pools: Pools): boolean {
  switch (game.template) {
    case "quiz":
      return pick.source.kind !== "words" || !!pick.source.topic.trim();
    case "math":
    case "balloon":
      return game.sets.length > 0;
    case "grammar":
      return pools.items.some((it) => pick.kinds.includes(it.type));
    case "vocab":
      return game.modes.length > 0 && (pick.wordsFrom === "topic" ? !!pick.topic.trim() : pick.lists.length > 0);
    case "reading":
      return game.activities.length > 0 && pick.texts.length > 0;
    case "custom":
      return !!pools.games[pick.example];
  }
}

/** A fresh, random game from the choices. Countries, maths and the examples need no internet. */
async function build({ game, pick }: Setup, pools: Pools): Promise<{ game: Game; note?: string }> {
  const keep = { id: uid() };
  const bank = Math.min(50, Math.max(30, game.settings.round));
  switch (game.template) {
    case "quiz": {
      const got = await fetchQuestions(pick.source, bank);
      return { game: normalize({ ...game, subtitle: game.subtitle || describe(pick.source), questions: got.questions }, keep), note: got.offline ? t("No internet: this set is made from saved words") : undefined };
    }
    case "grammar":
      return { game: normalize({ ...game, items: shuffle(pools.items.filter((it) => pick.kinds.includes(it.type))) }, keep) };
    case "vocab": {
      const listed = (ids: number[]) => ids.flatMap((i) => pools.lists[i] || []);
      if (pick.wordsFrom === "lists") return { game: normalize({ ...game, words: shuffle(listed(pick.lists)) }, keep) };
      const words: Word[] = await fetchWords(pick.topic.trim(), Math.max(24, game.settings.round + 4)).catch(() => []);
      if (words.length >= 4) return { game: normalize({ ...game, subtitle: game.subtitle || t("Words: {topic}", { topic: t(pick.topic.trim()) }), words }, keep) };
      return { game: normalize({ ...game, words: shuffle(listed(pools.lists.map((_, i) => i))) }, keep), note: t("No internet: this set is made from saved words") };
    }
    case "reading":
      return { game: normalize({ ...game, passages: shuffle(pick.texts.map((i) => pools.texts[i]).filter((p): p is Passage => !!p)) }, keep) };
    case "custom": {
      const example = pools.games[pick.example];
      return { game: normalize({ ...example, tint: game.tint, subtitle: game.subtitle }, keep) };
    }
    default:
      return { game: normalize(game, keep) };
  }
}

/** "Play" on a template: pick every option, then play a random set straight away. */
export function QuickPlay({ template, onClose }: { template: Template; onClose: () => void }) {
  const { save, toast } = useApp();
  const pools = useMemo(() => poolsFor(template), [template]);
  const [setup, setSetup] = useState<Setup>(() => load(template, pools));
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [busy, setBusy] = useState(false);
  const runs = useRef(0);
  const name = t(templateInfo(template).name);

  const update = (next: Setup) => (setSetup(next), remember(template, next));
  const setGame = (game: Game) => update({ ...setup, game });
  const setPick = (patch: Partial<Choices>) => update({ ...setup, pick: { ...setup.pick, ...patch } });
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const play = async () => {
    setBusy(true);
    try {
      const { game, note } = await build(setup, pools);
      if (note) toast(note);
      setPlaying({
        kind: "page",
        title: game.title,
        page: pageFor(game),
        run: ++runs.current,
        actions: (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setPlaying(null)} aria-label={t("Options")} title={t("Options")}>
              <Icon name="gear" size={16} /> <span className="hide-sm">{t("Options")}</span>
            </button>
            <button className="btn btn-coral btn-sm" onClick={play}>
              <Icon name="shuffle" size={16} /> {t("New set")}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => save(game).then(() => go(`game/${game.id}`))} aria-label={t("Make it mine")} title={t("Make it mine")}>
              <Icon name="edit" size={16} /> <span className="hide-sm">{t("Make it mine")}</span>
            </button>
          </>
        ),
      });
    } catch (e) {
      toast(e instanceof Error && e.message !== "Failed to fetch" ? e.message : t("Couldn't reach the question service. Country quizzes work offline."), "error");
    } finally {
      setBusy(false);
    }
  };

  if (playing) return <PlayerSheet playing={playing} onClose={onClose} />;

  const { game, pick } = setup;
  return (
    <Modal
      title={t("Play {name}", { name })}
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => update(fresh(template, pools))}>
            {t("Reset")}
          </button>
          <span className="spacer" />
          <button className="btn btn-primary" onClick={play} disabled={busy || !ready(setup, pools)}>
            <Icon name="play" size={18} /> {busy ? t("Getting…") : t("Play")}
          </button>
        </>
      }
    >
      <div className="quick-play">
        {game.template === "quiz" && (
          <Section title={t("Questions")}>
            <SourcePicker value={pick.source} onChange={(source) => setPick({ source })} />
          </Section>
        )}

        {(game.template === "math" || game.template === "balloon") && <MathEditor game={game} onChange={setGame} own={false} />}

        {game.template === "grammar" && (
          <Section title={t("Sentences")}>
            <div className="chips">
              {KINDS.map((k) => (
                <button key={k} type="button" className={`chip-btn${pick.kinds.includes(k) ? " on" : ""}`} aria-pressed={pick.kinds.includes(k)} onClick={() => setPick({ kinds: toggle(pick.kinds, k) })}>
                  {pick.kinds.includes(k) && <Icon name="check" size={16} />} {t(KIND_LABEL[k])}
                </button>
              ))}
            </div>
          </Section>
        )}

        {game.template === "vocab" && (
          <>
            <Section
              title={t("Words")}
              actions={
                <div className="seg seg-small" role="radiogroup" aria-label={t("Words")}>
                  {(
                    [
                      ["lists", "Word lists"],
                      ["topic", "A topic"],
                    ] as const
                  ).map(([from, label]) => (
                    <button key={from} type="button" className={pick.wordsFrom === from ? "on" : ""} aria-pressed={pick.wordsFrom === from} onClick={() => setPick({ wordsFrom: from })}>
                      {t(label)}
                    </button>
                  ))}
                </div>
              }
            >
              {pick.wordsFrom === "lists" ? (
                <div className="chips">
                  {pools.games.map((g, i) => (
                    <button key={i} type="button" className={`chip-btn${pick.lists.includes(i) ? " on" : ""}`} aria-pressed={pick.lists.includes(i)} onClick={() => setPick({ lists: toggle(pick.lists, i) })}>
                      {pick.lists.includes(i) && <Icon name="check" size={16} />} {g.title}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <Field label={tc("words", "Topic")}>
                    <input list="play-word-topics" value={pick.topic} onChange={(e) => setPick({ topic: e.target.value })} />
                    <datalist id="play-word-topics">
                      {WORD_TOPICS.map((topic) => (
                        <option key={topic} value={topic} />
                      ))}
                    </datalist>
                  </Field>
                  {getLang() === "fr" && <p className="muted">{t("These questions come in English.")}</p>}
                </>
              )}
            </Section>
            <Section title={t("Activities")}>
              <div className="chips">
                {VOCAB_MODES.map((m) => (
                  <button key={m} type="button" className={`chip-btn${game.modes.includes(m) ? " on" : ""}`} aria-pressed={game.modes.includes(m)} onClick={() => setGame({ ...game, modes: toggle(game.modes, m) })}>
                    {game.modes.includes(m) && <Icon name="check" size={16} />} {t(MODE_LABEL[m])}
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}

        {game.template === "reading" && (
          <>
            <Section title={t("Texts")}>
              <div className="chips">
                {pools.texts.map((p, i) => (
                  <button key={i} type="button" className={`chip-btn${pick.texts.includes(i) ? " on" : ""}`} aria-pressed={pick.texts.includes(i)} onClick={() => setPick({ texts: toggle(pick.texts, i) })}>
                    {pick.texts.includes(i) && <Icon name="check" size={16} />} {p.title}
                  </button>
                ))}
              </div>
            </Section>
            <Section title={t("Activities")}>
              <div className="chips">
                {READING_ACTIVITIES.map((a) => (
                  <button key={a} type="button" className={`chip-btn${game.activities.includes(a) ? " on" : ""}`} aria-pressed={game.activities.includes(a)} onClick={() => setGame({ ...game, activities: toggle(game.activities, a) })}>
                    {game.activities.includes(a) && <Icon name="check" size={16} />} {t(ACTIVITY_LABEL[a])}
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}

        {game.template === "custom" && (
          <Section title={t("Game")}>
            <div className="chips">
              {pools.games.map((g, i) => (
                <button key={i} type="button" className={`chip-btn${pick.example === i ? " on" : ""}`} aria-pressed={pick.example === i} onClick={() => setPick({ example: i })}>
                  {pick.example === i && <Icon name="check" size={16} />} {g.title}
                </button>
              ))}
            </div>
          </Section>
        )}

        {game.template !== "custom" && (
          <Field label={t("Title")}>
            <input value={game.title} onChange={(e) => setGame({ ...game, title: e.target.value })} />
          </Field>
        )}
        <GameSettings game={game} onChange={setGame} />
      </div>
    </Modal>
  );
}
