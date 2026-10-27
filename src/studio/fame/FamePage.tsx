import { useEffect, useRef, useState, type ReactNode } from "react";
import { costumeSvg, svgUrl } from "../../code/art";
import type { CodeProject } from "../../code/types";
import { normalize } from "../../shared/normalize";
import { uid } from "../../shared/random";
import type { Game } from "../../shared/types";
import { useAccount } from "../account";
import { GameCard } from "../components/GameCard";
import { PlayerSheet, type Playing, type Show } from "../components/PlayerSheet";
import { projects } from "../db";
import { download, pageFor, slug } from "../exporting";
import { ZoPic } from "../learn/Zo";
import { TEMPLATE_CRITTER } from "../palette";
import { Critter } from "../Critter";
import { getName, useRole } from "../role";
import { go, useApp } from "../store";
import { TEMPLATE_INFO } from "../templates";
import { Empty, Field, Icon, Modal } from "../ui";
import { cleanGame, cleanProject, decide, fameGame, forReview, mine, send, wall, withdraw, type FameCard, type ForReview, type Kind, type Status, type Submission } from "./api";
import { printCertificate } from "./certificate";
import "./fame.css";

const STATUS: Record<Status, string> = { waiting: "Waiting for review", featured: "On the Wall of Fame", declined: "Not chosen this time" };
const kindName = (g: FameCard) => (g.kind === "lab" ? "Game Lab" : TEMPLATE_INFO.find((t) => t.id === g.tag)?.name || "Quick game");
const day = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** A game that came back from the server, ready to play and to copy into the studio. */
type Loaded = { kind: "quick"; game: Game } | { kind: "lab"; project: CodeProject };

function load(kind: Kind, raw: unknown): Loaded {
  if (kind === "lab") {
    const p = raw as CodeProject;
    if (p?.kind !== "code" || !p.stage || !Array.isArray(p.sprites)) throw new Error("That game couldn't be opened.");
    return { kind: "lab", project: p };
  }
  return { kind: "quick", game: normalize(raw, { id: uid() }) };
}

/** Plays a Wall of Fame game in the full-screen player, with a button to keep a copy. */
function usePlayer() {
  const { save, toast } = useApp();
  const [playing, setShown] = useState<Playing | null>(null);
  const runs = useRef(0);

  const keep = async (l: Loaded) => {
    if (l.kind === "quick") {
      const g = { ...l.game, id: uid(), created: Date.now(), updated: Date.now() };
      await save(g);
      go(`game/${g.id}`);
    } else {
      const p = { ...l.project, id: uid(), created: Date.now(), updated: Date.now() };
      await projects.put(p);
      go(`code/${p.id}`);
    }
  };

  const play = async (id: string, title: string, extra?: ReactNode) => {
    try {
      const got = await fameGame(id);
      const l = load(got.kind, got.game);
      const page = l.kind === "quick" ? pageFor(l.game) : (await import("../code/files")).appFile(l.project);
      const show: Show = {
        kind: "page",
        title,
        page,
        actions: (
          <>
            {extra}
            <button className="btn btn-ghost btn-sm" onClick={() => keep(l).catch(() => toast("Couldn't copy that game.", "error"))}>
              <Icon name="edit" size={16} /> Make it mine
            </button>
          </>
        ),
      };
      setShown({ ...show, run: ++runs.current });
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const sheet = playing && <PlayerSheet playing={playing} onClose={() => setShown(null)} />;
  return { play, keep, sheet };
}

export function FamePage({ sub }: { sub?: string }) {
  if (sub === "review") return <ReviewPage />;
  return <Wall />;
}

function Wall() {
  const { role } = useRole();
  const { toast } = useApp();
  const [games, setGames] = useState<FameCard[] | null>(null);
  const [error, setError] = useState("");
  const [own, setOwn] = useState<{ mine: Submission[]; reviewer: boolean } | null>(null);
  const [sending, setSending] = useState(false);
  const [leaving, setLeaving] = useState<Submission | null>(null);
  const player = usePlayer();

  const refresh = () => {
    wall().then(setGames, (e: Error) => setError(e.message));
    mine().then(setOwn, () => setOwn(null));
  };
  useEffect(refresh, []);

  const teacher = role === "teacher";

  return (
    <div className="page fame-page">
      <section className="hero fame-hero">
        <div className="hero-text">
          <h1>Wall of Fame</h1>
          <p className="hero-lede">Games made by teachers, chosen every week for being creative and unique. Play them, or make one your own.</p>
          {teacher && (
            <button className="btn btn-primary" onClick={() => setSending(true)}>
              <Icon name="upload" size={18} /> Submit a game
            </button>
          )}
        </div>
        <div className="fame-hero-zo" aria-hidden>
          <ZoPic outfit="royal" pose="cheer" size={96} />
        </div>
      </section>

      {own?.reviewer && (
        <a className="card fame-review-link" href="#/fame/review">
          <Icon name="eye" size={20} />
          <strong className="grow">Review submissions</strong>
          <Icon name="arrowR" size={18} />
        </a>
      )}

      <section aria-labelledby="fame-games">
        <div className="page-head">
          <h2 id="fame-games" className="section-title">
            Featured games
          </h2>
        </div>
        {error ? (
          <div className="card is-quiet">
            <Empty critter={<Critter kind="owl" color="sky" size={84} mood="sleepy" />}>{error}</Empty>
          </div>
        ) : games === null ? null : games.length ? (
          <div className="play-grid">
            {games.map((g) => (
              <FameGameCard key={g.id} g={g} onPlay={() => player.play(g.id, g.title)} onKeep={() => fameGame(g.id).then((r) => player.keep(load(r.kind, r.game))).catch((e: Error) => toast(e.message, "error"))} />
            ))}
          </div>
        ) : (
          <div className="card is-quiet">
            <Empty critter={<ZoPic outfit="artist" size={64} />}>The first games are on their way.</Empty>
          </div>
        )}
      </section>

      {own && own.mine.length > 0 && (
        <section aria-labelledby="fame-mine">
          <div className="page-head">
            <h2 id="fame-mine" className="section-title">
              My submissions
            </h2>
          </div>
          <ul className="fame-list">
            {own.mine.map((s) => (
              <li key={s.id} className="card fame-item">
                <div className="fame-item-head">
                  <strong className="grow">{s.title}</strong>
                  <span className={`fame-status is-${s.status}`}>{STATUS[s.status]}</span>
                </div>
                <small className="muted">Sent {day(s.createdAt)}</small>
                {s.reply && <p className="fame-reply">{s.reply}</p>}
                <div className="toolbar">
                  {s.status === "featured" && (
                    <button className="btn btn-primary btn-sm" onClick={() => printCertificate({ credit: s.credit, school: s.school, title: s.title, date: s.reviewedAt || s.createdAt })}>
                      <Icon name="star" size={16} /> Certificate
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => player.play(s.id, s.title)}>
                    <Icon name="play" size={16} /> Play
                  </button>
                  <span className="spacer" />
                  <button className="btn btn-ghost btn-sm" onClick={() => setLeaving(s)}>
                    <Icon name="trash" size={16} /> Withdraw
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sending && (
        <SubmitModal
          onClose={() => setSending(false)}
          onSent={() => {
            setSending(false);
            toast("Sent. We review new games every week.");
            refresh();
          }}
        />
      )}
      {leaving && (
        <Modal
          title={`Withdraw “${leaving.title}”?`}
          onClose={() => setLeaving(null)}
          footer={
            <>
              <span className="spacer" />
              <button className="btn btn-ghost" onClick={() => setLeaving(null)}>
                Keep it
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  const s = leaving;
                  setLeaving(null);
                  withdraw(s.id).then(
                    () => (toast("Withdrawn"), refresh()),
                    (e: Error) => toast(e.message, "error"),
                  );
                }}
              >
                Withdraw
              </button>
            </>
          }
        >
          <p>{leaving.status === "featured" ? "It comes off the Wall of Fame and is deleted from our server." : "It's deleted from our server."} Your copy in the studio stays.</p>
        </Modal>
      )}
      {player.sheet}
    </div>
  );
}

function FameGameCard({ g, onPlay, onKeep }: { g: FameCard; onPlay: () => void; onKeep: () => void }) {
  const tag = kindName(g);
  const tint = g.kind === "lab" ? "mint" : g.tint || "lemon";
  return (
    <GameCard
      title={g.title}
      blurb={g.blurb}
      tags={[tag, `by ${g.credit}`, ...(g.school ? [g.school] : [])]}
      cover={g.kind === "lab" ? (g.thumb ? { img: g.thumb, framed: true } : { emoji: "🎮" }) : { emoji: g.emoji || "⭐" }}
      tint={tint}
      coverExtra={g.kind === "quick" && TEMPLATE_CRITTER[g.tag] ? <Critter kind={TEMPLATE_CRITTER[g.tag]} color={tint} size={56} className="play-critter" /> : undefined}
      onOpen={onPlay}
      actions={
        <button className="btn btn-ghost btn-sm" onClick={onKeep}>
          <Icon name="edit" size={16} /> Make it mine
        </button>
      }
    />
  );
}

type Pick = { key: string; kind: Kind; title: string; get: () => { game: Game | CodeProject; thumb?: string } };

function SubmitModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const { games } = useApp();
  const account = useAccount();
  const [labs, setLabs] = useState<CodeProject[]>([]);
  const [key, setKey] = useState("");
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [credit, setCredit] = useState(getName() || account?.name || "");
  const [school, setSchool] = useState("");
  const [note, setNote] = useState("");
  const [mineOk, setMineOk] = useState(false);
  const [safeOk, setSafeOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    projects.all().then((all) => setLabs(all.filter((p) => !p.mission).sort((a, b) => b.updated - a.updated)), () => setLabs([]));
  }, []);

  const picks: Pick[] = [
    ...[...games].sort((a, b) => b.updated - a.updated).map((g): Pick => ({ key: `q:${g.id}`, kind: "quick", title: g.title, get: () => ({ game: cleanGame(g) }) })),
    ...labs.map((p): Pick => {
      const sprite = p.sprites.find((s) => s.visible) || p.sprites[0];
      const costume = sprite ? sprite.costumes[sprite.costume] : p.stage.costumes[p.stage.costume];
      return { key: `l:${p.id}`, kind: "lab", title: p.title, get: () => ({ game: cleanProject(p), thumb: costume ? svgUrl(costumeSvg(costume)) : undefined }) };
    }),
  ];
  const picked = picks.find((p) => p.key === key);
  const ready = picked && title.trim() && blurb.trim() && credit.trim() && mineOk && safeOk;

  const submit = async () => {
    if (!picked || !ready) return;
    setBusy(true);
    setError("");
    try {
      const { game, thumb } = picked.get();
      await send({ kind: picked.kind, game, thumb, title, blurb, credit, school, note, consent: true });
      onSent();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Submit a game"
      onClose={onClose}
      footer={
        <>
          {error && (
            <p className="fame-error" role="alert">
              {error}
            </p>
          )}
          <span className="spacer" />
          <button className="btn btn-primary" disabled={!ready || busy} onClick={submit}>
            <Icon name="upload" size={18} /> {busy ? "Sending…" : "Send"}
          </button>
        </>
      }
    >
      {picks.length === 0 ? (
        <Empty critter={<ZoPic outfit="teacher" size={64} />}>Make a quick game or a Game Lab game first.</Empty>
      ) : (
        <>
          <Field label="Game">
            <select
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setTitle(picks.find((p) => p.key === e.target.value)?.title || "");
              }}
              autoFocus
            >
              <option value="" disabled>
                Choose one of your games
              </option>
              {games.length > 0 && (
                <optgroup label="Quick games">
                  {picks.filter((p) => p.kind === "quick").map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.title}
                    </option>
                  ))}
                </optgroup>
              )}
              {labs.length > 0 && (
                <optgroup label="Game Lab">
                  {picks.filter((p) => p.kind === "lab").map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.title}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </Field>
          <Field label="Title">
            <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="What makes it special">
            <textarea rows={2} value={blurb} maxLength={240} onChange={(e) => setBlurb(e.target.value)} placeholder="Students race to build sentences before the train leaves" />
          </Field>
          <div className="form-grid">
            <Field label="Your name, as it should appear">
              <input value={credit} maxLength={80} onChange={(e) => setCredit(e.target.value)} />
            </Field>
            <Field label="School or town (optional)">
              <input value={school} maxLength={120} onChange={(e) => setSchool(e.target.value)} />
            </Field>
          </div>
          <Field label="Note for the reviewers (optional)">
            <textarea rows={2} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <label className="check">
            <input type="checkbox" checked={mineOk} onChange={(e) => setMineOk(e.target.checked)} />
            <span>I made this game, and anyone may play, copy and change it with my name shown (CC BY 4.0).</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={safeOk} onChange={(e) => setSafeOk(e.target.checked)} />
            <span>It has no students' names, photos or other personal details.</span>
          </label>
        </>
      )}
    </Modal>
  );
}

function ReviewPage() {
  const { toast } = useApp();
  const [list, setList] = useState<ForReview[] | null>(null);
  const [error, setError] = useState("");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const player = usePlayer();

  const refresh = () => forReview().then(setList, (e: Error) => setError(e.message));
  useEffect(() => {
    refresh();
  }, []);

  const set = (s: ForReview, status: Status) =>
    decide(s.id, status, replies[s.id] ?? s.reply).then(
      () => (toast(status === "featured" ? "On the Wall of Fame" : status === "declined" ? "Declined" : "Back to waiting"), refresh()),
      (e: Error) => toast(e.message, "error"),
    );

  const save = async (s: ForReview) => {
    try {
      const got = await fameGame(s.id);
      download(`${slug(s.title) || "game"}.json`, JSON.stringify(got.game, null, 1), "application/json");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const waiting = (list || []).filter((s) => s.status === "waiting");
  const done = (list || []).filter((s) => s.status !== "waiting");

  const item = (s: ForReview) => (
    <li key={s.id} className="card fame-item">
      <div className="fame-item-head">
        <strong className="grow">{s.title}</strong>
        <span className={`fame-status is-${s.status}`}>{STATUS[s.status]}</span>
      </div>
      <p>{s.blurb}</p>
      <dl className="fame-facts">
        <dt>From</dt>
        <dd>
          {s.credit}
          {s.school ? `, ${s.school}` : ""} · <a href={`mailto:${s.email}`}>{s.email}</a>
        </dd>
        <dt>Game</dt>
        <dd>
          {kindName(s)} · {Math.max(1, Math.round(s.size / 1024))} KB · sent {day(s.createdAt)}
        </dd>
        {s.note && (
          <>
            <dt>Note</dt>
            <dd>{s.note}</dd>
          </>
        )}
      </dl>
      <Field label="Reply to the teacher (optional)">
        <textarea rows={2} maxLength={600} value={replies[s.id] ?? s.reply} onChange={(e) => setReplies({ ...replies, [s.id]: e.target.value })} />
      </Field>
      <div className="toolbar">
        <button className="btn btn-soft btn-sm" onClick={() => player.play(s.id, s.title)}>
          <Icon name="play" size={16} /> Play
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => save(s)}>
          <Icon name="download" size={16} /> .json
        </button>
        <span className="spacer" />
        {s.status !== "waiting" && (
          <button className="btn btn-ghost btn-sm" onClick={() => set(s, "waiting")}>
            <Icon name="undo" size={16} /> Back to waiting
          </button>
        )}
        {s.status !== "declined" && (
          <button className="btn btn-ghost btn-sm" onClick={() => set(s, "declined")}>
            Decline
          </button>
        )}
        {s.status === "featured" ? (
          <button className="btn btn-primary btn-sm" onClick={() => printCertificate({ credit: s.credit, school: s.school, title: s.title, date: s.reviewedAt || Date.now() })}>
            <Icon name="star" size={16} /> Certificate
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => set(s, "featured")}>
            <Icon name="star" size={16} /> Feature
          </button>
        )}
      </div>
    </li>
  );

  return (
    <div className="page fame-page">
      <div className="page-head">
        <a className="btn btn-ghost btn-sm" href="#/fame">
          <Icon name="arrowL" size={16} /> Wall of Fame
        </a>
      </div>
      <div className="page-head">
        <h1>Review submissions</h1>
      </div>
      {error ? (
        <div className="card is-quiet">
          <Empty critter={<Critter kind="owl" color="sky" size={84} mood="sleepy" />}>{error}</Empty>
        </div>
      ) : list === null ? null : (
        <>
          <section aria-labelledby="fame-waiting">
            <div className="page-head">
              <h2 id="fame-waiting" className="section-title">
                Waiting
              </h2>
              <span className="pill">{waiting.length}</span>
            </div>
            {waiting.length ? (
              <ul className="fame-list">{waiting.map(item)}</ul>
            ) : (
              <div className="card is-quiet">
                <Empty critter={<ZoPic outfit="graduate" size={64} />}>Nothing waiting.</Empty>
              </div>
            )}
          </section>
          {done.length > 0 && (
            <section aria-labelledby="fame-done">
              <div className="page-head">
                <h2 id="fame-done" className="section-title">
                  Reviewed in the last 60 days
                </h2>
              </div>
              <ul className="fame-list">{done.map(item)}</ul>
            </section>
          )}
        </>
      )}
      {player.sheet}
    </div>
  );
}
