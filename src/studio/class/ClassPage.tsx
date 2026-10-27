import { useEffect, useMemo, useRef, useState } from "react";
import type { CodeProject } from "../../code/types";
import { uid } from "../../shared/random";
import { appFile } from "../code/files";
import { challenges as challengeTable, handins as handinTable, projects } from "../db";
import { slug } from "../exporting";
import { getRole, setName, setRole, useRole } from "../role";
import { go, useApp } from "../store";
import { Empty, Field, Icon, Modal } from "../ui";
import { ZoPic } from "../learn/Zo";
import { galleryFile, thumbOf } from "./files";
import { Stars } from "./MissionCard";
import { classFileContents, feedbackLink, projectFor, shareFile, stepsDone, unpack, type Challenge, type Feedback, type HandIn } from "./model";
import "./class.css";

export function ClassPage() {
  const { role } = useRole();
  return role === "teacher" ? <TeacherClass /> : <StudentClass />;
}

/* ---------- teacher ---------- */

type Tab = "challenges" | "handins" | "gallery";

function TeacherClass() {
  const { toast } = useApp();
  const [tab, setTab] = useState<Tab>(() => (sessionStorage.getItem("ds-class-tab") as Tab) || "challenges");
  const [list, setList] = useState<Challenge[]>([]);
  const [inbox, setInbox] = useState<HandIn[]>([]);
  const [deleting, setDeleting] = useState<Challenge | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const reload = () => {
    challengeTable.all().then((a) => setList(a.sort((x, y) => y.updated - x.updated)), () => setList([]));
    handinTable.all().then((a) => setInbox(a.sort((x, y) => y.at - x.at)), () => setInbox([]));
  };
  useEffect(reload, []);
  useEffect(() => sessionStorage.setItem("ds-class-tab", tab), [tab]);

  const importFiles = async (files: FileList | File[]) => {
    let added = 0;
    let skipped = 0;
    for (const f of Array.from(files)) {
      try {
        const data = await classFileContents(f);
        if (data.kind === "hand-in") await handinTable.put(inbox.find((h) => h.id === data.id) ? { ...data, feedback: inbox.find((h) => h.id === data.id)!.feedback } : data);
        else await challengeTable.put(data);
        added++;
      } catch {
        skipped++;
      }
    }
    reload();
    if (added) toast(`Added ${added} file${added === 1 ? "" : "s"}`);
    if (skipped) toast(`${skipped} file${skipped === 1 ? " wasn't a hand-in" : "s weren't hand-ins"}.`, "error");
    if (added) setTab("handins");
  };

  const waiting = inbox.filter((h) => !h.feedback).length;

  return (
    <div
      className={`page class-page${dragging ? " is-dropping" : ""}`}
      onDragOver={(e) => (e.preventDefault(), setDragging(true))}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) importFiles(e.dataTransfer.files);
      }}
    >
      <section className="hero class-hero">
        <div className="hero-critters" aria-hidden>
          <ZoPic outfit="teacher" pose="wave" size={84} />
        </div>
        <div className="hero-text">
          <h1>Class</h1>
          <div className="toolbar">
            <button className="btn btn-primary" onClick={() => go("class/challenge/new")}>
              <Icon name="plus" size={18} /> New challenge
            </button>
            <button className="btn btn-ghost" onClick={() => file.current?.click()}>
              <Icon name="upload" size={18} /> Add hand-ins
            </button>
            <input ref={file} type="file" multiple accept=".html,.htm,.json" hidden onChange={(e) => (e.target.files && importFiles(e.target.files), (e.target.value = ""))} />
          </div>
        </div>
      </section>

      <nav className="seg seg-tabs class-tabs" aria-label="Class">
        <button className={tab === "challenges" ? "on" : ""} aria-pressed={tab === "challenges"} onClick={() => setTab("challenges")}>
          Challenges <span className="count">{list.length}</span>
        </button>
        <button className={tab === "handins" ? "on" : ""} aria-pressed={tab === "handins"} onClick={() => setTab("handins")}>
          Hand-ins {waiting > 0 ? <span className="count is-new">{waiting} new</span> : <span className="count">{inbox.length}</span>}
        </button>
        <button className={tab === "gallery" ? "on" : ""} aria-pressed={tab === "gallery"} onClick={() => setTab("gallery")}>
          Gallery
        </button>
      </nav>

      {tab === "challenges" &&
        (list.length ? (
          <div className="game-grid">
            {list.map((c) => {
              const got = inbox.filter((h) => h.challengeId === c.id);
              return (
                <article key={c.id} className="game-card">
                  <a href={`#/class/challenge/${c.id}`} className="game-card-main">
                    <span className="game-emoji project-thumb">
                      <ZoPic outfit="student" size={40} />
                    </span>
                    <span className="game-card-text">
                      <strong>{c.title}</strong>
                      <small>
                        {c.steps.length} step{c.steps.length === 1 ? "" : "s"} · {got.length} hand-in{got.length === 1 ? "" : "s"}
                      </small>
                    </span>
                  </a>
                  <div className="game-card-actions">
                    <a className="btn btn-soft btn-sm" href={`#/class/challenge/${c.id}`}>
                      <Icon name="edit" size={16} /> Open
                    </a>
                    <span className="spacer" />
                    <button className="icon-btn icon-btn-sm danger-hover" aria-label={`Delete ${c.title}`} onClick={() => setDeleting(c)}>
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card is-quiet">
            <Empty critter={<ZoPic outfit="teacher" size={64} />}>No challenges yet.</Empty>
          </div>
        ))}

      {tab === "handins" && <Inbox inbox={inbox} challenges={list} reload={reload} />}
      {tab === "gallery" && <Gallery inbox={inbox} />}

      {deleting && (
        <Modal
          title={`Delete “${deleting.title}”?`}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <span className="spacer" />
              <button className="btn btn-ghost" onClick={() => setDeleting(null)}>
                Keep it
              </button>
              <button className="btn btn-danger" onClick={async () => (await challengeTable.remove(deleting.id), setDeleting(null), reload())}>
                Delete
              </button>
            </>
          }
        >
          <p>Students who already started keep their copy, and hand-ins stay.</p>
        </Modal>
      )}
    </div>
  );
}

function Inbox({ inbox, challenges, reload }: { inbox: HandIn[]; challenges: Challenge[]; reload: () => void }) {
  const { toast } = useApp();
  const [filter, setFilter] = useState("all");
  const [playing, setPlaying] = useState<HandIn | null>(null);
  const [reviewing, setReviewing] = useState<HandIn | null>(null);
  const groups = useMemo(() => {
    const ids = [...new Set(inbox.map((h) => h.challengeId || "none"))];
    return ids.map((id) => ({ id, title: challenges.find((c) => c.id === id)?.title || inbox.find((h) => (h.challengeId || "none") === id)?.challengeTitle || "Other games" }));
  }, [inbox, challenges]);
  const shown = inbox.filter((h) => filter === "all" || (h.challengeId || "none") === filter);

  const openCopy = async (h: HandIn) => {
    const copy: CodeProject = { ...structuredClone(h.project), id: uid(), title: `${h.project.title} (${h.student})`, updated: Date.now() };
    await projects.put(copy);
    go(`code/${copy.id}`);
  };

  if (!inbox.length)
    return (
      <div className="card is-quiet">
        <Empty critter={<ZoPic outfit="postal" size={64} />}>No hand-ins yet. Drop the files students send you here.</Empty>
      </div>
    );

  return (
    <>
      {groups.length > 1 && (
        <div className="label-chips">
          <button className={`chip-btn${filter === "all" ? " on" : ""}`} onClick={() => setFilter("all")}>
            All
          </button>
          {groups.map((g) => (
            <button key={g.id} className={`chip-btn${filter === g.id ? " on" : ""}`} onClick={() => setFilter(g.id)}>
              {g.title}
            </button>
          ))}
        </div>
      )}
      <ul className="handin-list">
        {shown.map((h) => {
          const total = h.project.mission?.steps.length || 0;
          return (
            <li key={h.id} className="handin">
              <img className="handin-thumb" src={thumbOf(h)} alt="" />
              <div className="handin-text">
                <strong>{h.student}</strong>
                <span>{h.project.title}</span>
                <small className="muted">
                  {h.challengeTitle} · {new Date(h.at).toLocaleDateString()}
                  {total > 0 && ` · ${h.done.length}/${total} steps`}
                </small>
                {h.note && <q className="handin-note">{h.note}</q>}
              </div>
              <span className={`status status-${h.feedback ? h.feedback.status : "new"}`}>{h.feedback ? (h.feedback.status === "approved" ? "Approved" : "Try again") : "New"}</span>
              <div className="handin-actions">
                <button className="btn btn-soft btn-sm" onClick={() => setPlaying(h)}>
                  <Icon name="play" size={16} /> Play
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setReviewing(h)}>
                  <Icon name="star" size={16} /> Feedback
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => openCopy(h)}>
                  <Icon name="code" size={16} /> Blocks
                </button>
                <button className="icon-btn icon-btn-sm danger-hover" aria-label={`Remove ${h.student}'s hand-in`} onClick={async () => (await handinTable.remove(h.id), reload())}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {playing && (
        <Modal title={`${playing.project.title} · ${playing.student}`} wide onClose={() => setPlaying(null)}>
          <iframe className="handin-player" title={playing.project.title} sandbox="allow-scripts" srcDoc={appFile(playing.project)} />
        </Modal>
      )}
      {reviewing && (
        <FeedbackModal
          h={reviewing}
          onClose={() => setReviewing(null)}
          onSave={async (f) => {
            await handinTable.put({ ...reviewing, feedback: f });
            reload();
            setReviewing({ ...reviewing, feedback: f });
            toast("Feedback saved");
          }}
        />
      )}
    </>
  );
}

function FeedbackModal({ h, onClose, onSave }: { h: HandIn; onClose: () => void; onSave: (f: Feedback) => void }) {
  const { toast } = useApp();
  const { name } = useRole();
  const [stars, setStars] = useState(h.feedback?.stars ?? 2);
  const [status, setStatus] = useState<Feedback["status"]>(h.feedback?.status ?? "approved");
  const [comment, setComment] = useState(h.feedback?.comment ?? "");
  const saved = h.feedback;
  const link = saved ? feedbackLink(saved) : "";
  const steps = h.project.mission?.steps || [];

  return (
    <Modal
      title={`Feedback for ${h.student}`}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={() => onSave({ kind: "feedback", v: 1, handInId: h.id, challengeId: h.challengeId || "", stars, status, comment: comment.trim(), teacher: name, at: Date.now() })}>
            Save
          </button>
        </>
      }
    >
      {steps.length > 0 && (
        <ul className="review-steps">
          {steps.map((s) => (
            <li key={s.id} className={h.done.includes(s.id) ? "is-done" : ""}>
              <span aria-hidden>{h.done.includes(s.id) ? "✓" : "○"}</span> {s.text}
            </li>
          ))}
        </ul>
      )}
      <div className="seg">
        <button className={status === "approved" ? "on" : ""} aria-pressed={status === "approved"} onClick={() => setStatus("approved")}>
          Approved
        </button>
        <button className={status === "try-again" ? "on" : ""} aria-pressed={status === "try-again"} onClick={() => setStatus("try-again")}>
          Try again
        </button>
      </div>
      <div className="star-pick" role="radiogroup" aria-label="Stars">
        {[0, 1, 2, 3].map((n) => (
          <button key={n} className={stars === n ? "on" : ""} aria-pressed={stars === n} onClick={() => setStars(n)}>
            {n ? "★".repeat(n) : "No stars"}
          </button>
        ))}
      </div>
      <Field label="Comment">
        <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </Field>
      {saved && (
        <div className="toolbar">
          <button
            className="btn btn-soft btn-sm"
            onClick={() =>
              navigator.clipboard.writeText(link).then(
                () => toast("Feedback link copied"),
                () => toast("Couldn't copy the link.", "error"),
              )
            }
          >
            <Icon name="link" size={16} /> Copy feedback link
          </button>
          {"share" in navigator && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigator.share({ title: `Feedback: ${h.project.title}`, url: link }).catch(() => undefined)}>
              <Icon name="share" size={16} /> Send
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

function Gallery({ inbox }: { inbox: HandIn[] }) {
  const approved = inbox.filter((h) => h.feedback?.status === "approved");
  const [picked, setPicked] = useState<Set<string>>(() => new Set(approved.map((h) => h.id)));
  const [title, setTitle] = useState("Our class games");
  const items = approved.filter((h) => picked.has(h.id));
  if (!approved.length)
    return (
      <div className="card is-quiet">
        <Empty critter={<ZoPic outfit="artist" size={64} />}>Approve hand-ins to put them in the class gallery.</Empty>
      </div>
    );
  return (
    <section className="card">
      <Field label="Gallery name">
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <ul className="gallery-picks">
        {approved.map((h) => (
          <li key={h.id}>
            <label className={`gallery-pick${picked.has(h.id) ? " on" : ""}`}>
              <input
                type="checkbox"
                checked={picked.has(h.id)}
                onChange={() =>
                  setPicked((s) => {
                    const n = new Set(s);
                    if (n.has(h.id)) n.delete(h.id);
                    else n.add(h.id);
                    return n;
                  })
                }
              />
              <img src={thumbOf(h)} alt="" />
              <span>
                <strong>{h.project.title}</strong>
                <small>{h.student}</small>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="toolbar">
        <button className="btn btn-primary" disabled={!items.length} onClick={() => shareFile(`${slug(title) || "class-gallery"}.html`, galleryFile(title, items), "text/html", title)}>
          <Icon name="share" size={18} /> Share the gallery ({items.length})
        </button>
      </div>
    </section>
  );
}

/* ---------- student ---------- */

function StudentClass() {
  const { toast } = useApp();
  const [mine, setMine] = useState<CodeProject[] | null>(null);
  const [text, setText] = useState("");
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    projects.all().then((all) => setMine(all.filter((p) => p.mission).sort((a, b) => b.updated - a.updated)), () => setMine([]));
  }, []);

  const open = (value: string) => {
    const m = value.match(/#\/(join|feedback)\/([A-Za-z0-9_-]+)/);
    if (!m) return toast("That doesn't look like a challenge or feedback link.", "error");
    go(`${m[1]}/${m[2]}`);
  };

  return (
    <div className="page class-page">
      <section className="hero class-hero">
        <div className="hero-critters" aria-hidden>
          <ZoPic outfit="student" pose="wave" size={84} />
        </div>
        <div className="hero-text">
          <h1>My class</h1>
          <form className="idea" onSubmit={(e) => (e.preventDefault(), open(text))}>
            <Icon name="link" />
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a link from your teacher" aria-label="Link from your teacher" />
            <button className="btn btn-primary" disabled={!text.trim()}>
              Open
            </button>
          </form>
          <div className="toolbar">
            <button className="btn btn-ghost btn-sm" onClick={() => file.current?.click()}>
              <Icon name="upload" size={16} /> Open a challenge file
            </button>
            <input
              ref={file}
              type="file"
              accept=".html,.htm,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  const data = await classFileContents(f);
                  if (data.kind !== "challenge") throw new Error();
                  sessionStorage.setItem("ds-join", JSON.stringify(data));
                  go("join/file");
                } catch {
                  toast("That isn't a challenge file.", "error");
                }
              }}
            />
          </div>
        </div>
      </section>

      <div className="page-head">
        <h2 className="section-title">Missions</h2>
      </div>
      {mine && mine.length ? (
        <div className="game-grid">
          {mine.map((p) => {
            const done = stepsDone(p).length;
            const total = p.mission!.steps.length;
            const last = p.feedback?.[p.feedback.length - 1];
            return (
              <article key={p.id} className="game-card">
                <a href={`#/code/${p.id}`} className="game-card-main">
                  <span className="game-emoji project-thumb">
                    <ZoPic outfit={last?.status === "approved" ? "graduate" : "student"} size={40} />
                  </span>
                  <span className="game-card-text">
                    <strong>{p.mission!.title}</strong>
                    <small>
                      {done}/{total} steps{p.mission!.teacher ? ` · ${p.mission!.teacher}` : ""}
                    </small>
                  </span>
                </a>
                <div className="game-card-actions">
                  <span className={`status status-${last ? last.status : p.handedIn ? "sent" : "doing"}`}>{last ? (last.status === "approved" ? "Approved" : "Try again") : p.handedIn ? "Handed in" : "In progress"}</span>
                  {last && <Stars n={last.stars} />}
                  <span className="spacer" />
                  <a className="btn btn-soft btn-sm" href={`#/code/${p.id}`}>
                    <Icon name="edit" size={16} /> Open
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      ) : mine ? (
        <div className="card is-quiet">
          <Empty critter={<ZoPic outfit="student" size={64} />}>No missions yet. Your teacher sends them as a link or a file.</Empty>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- arriving from a link ---------- */

export function JoinPage({ data }: { data: string }) {
  const { toast } = useApp();
  const { name } = useRole();
  const [student, setStudent] = useState(name);
  const [existing, setExisting] = useState<CodeProject | null>(null);
  const c = useMemo<Challenge | null>(() => {
    try {
      const v = data === "file" ? JSON.parse(sessionStorage.getItem("ds-join") || "null") : unpack<Challenge>(data);
      return v?.kind === "challenge" ? v : null;
    } catch {
      return null;
    }
  }, [data]);
  useEffect(() => {
    if (c) projects.all().then((all) => setExisting(all.find((p) => p.mission?.challengeId === c.id) || null));
  }, [c]);

  if (!c)
    return (
      <div className="page">
        <p>This link is broken. Ask your teacher to send it again.</p>
      </div>
    );

  const start = async () => {
    if (student.trim()) setName(student);
    if (!getRole()) setRole("student");
    const p = projectFor(c, student.trim());
    await projects.put(p);
    toast("Mission started");
    go(`code/${p.id}`);
  };

  return (
    <div className="page class-page join-page">
      <section className="card join-card">
        <ZoPic outfit="teacher" pose="wave" size={72} />
        <small className="muted">A challenge{c.teacher ? ` from ${c.teacher}` : ""}</small>
        <h1>{c.title}</h1>
        {c.intro && <p>{c.intro}</p>}
        <ol className="join-steps">
          {c.steps.map((s) => (
            <li key={s.id}>{s.text}</li>
          ))}
        </ol>
        <Field label="Your name">
          <input value={student} onChange={(e) => setStudent(e.target.value)} />
        </Field>
        <div className="toolbar">
          {existing && (
            <a className="btn btn-primary" href={`#/code/${existing.id}`}>
              Continue
            </a>
          )}
          <button className={`btn ${existing ? "btn-ghost" : "btn-primary"}`} onClick={start}>
            {existing ? "Start again" : "Start"}
          </button>
        </div>
      </section>
    </div>
  );
}

export function FeedbackPage({ data }: { data: string }) {
  const [state, setState] = useState<{ f: Feedback; project: CodeProject | null } | null | undefined>(undefined);
  useEffect(() => {
    let f: Feedback;
    try {
      f = unpack<Feedback>(data);
      if (f.kind !== "feedback") throw new Error();
    } catch {
      setState(null);
      return;
    }
    projects.all().then(async (all) => {
      const p = all.find((x) => x.handInIds?.includes(f.handInId)) || all.filter((x) => x.mission?.challengeId === f.challengeId).sort((a, b) => b.updated - a.updated)[0];
      if (p && !(p.feedback || []).some((x) => x.at === f.at && x.handInId === f.handInId)) await projects.put({ ...p, feedback: [...(p.feedback || []), f] });
      setState({ f, project: p || null });
    });
  }, [data]);

  if (state === undefined) return <div className="splash" aria-busy />;
  if (state === null)
    return (
      <div className="page">
        <p>This feedback link is broken.</p>
      </div>
    );
  const { f, project } = state;
  return (
    <div className="page class-page join-page">
      <section className="card join-card">
        <ZoPic outfit={f.status === "approved" ? "graduate" : "teacher"} pose={f.status === "approved" ? "cheer" : "wave"} size={72} />
        <small className="muted">Feedback{f.teacher ? ` from ${f.teacher}` : ""}</small>
        <h1>{f.status === "approved" ? "Approved!" : "Try again"}</h1>
        <Stars n={f.stars} />
        {f.comment && <p className="join-comment">{f.comment}</p>}
        {project ? (
          <a className="btn btn-primary" href={`#/code/${project.id}`}>
            Open {project.title}
          </a>
        ) : (
          <p className="muted">The game it's about isn't in this browser.</p>
        )}
      </section>
    </div>
  );
}
