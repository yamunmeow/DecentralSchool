import { useEffect, useState } from "react";
import { MODES } from "../../learn/concepts";
import { EXAMPLES } from "../../learn/examples";
import { fromExample, newLearnProject } from "../../learn/project";
import type { LearnProject } from "../../learn/types";
import { models as table } from "../db";
import { go } from "../store";
import { Icon, Modal } from "../ui";
import "./learn.css";
import { ZoPic } from "./Zo";

const MODE_NAME = Object.fromEntries(MODES.map((m) => [m.id, m.name]));

/** Zo Wants to Learn: students teach a tiny model from their own data. */
export function LearnHome() {
  const [list, setList] = useState<LearnProject[] | null>(null);
  const [deleting, setDeleting] = useState<LearnProject | null>(null);

  useEffect(() => {
    table.all().then((all) => setList(all.sort((a, b) => b.updated - a.updated)), () => setList([]));
  }, []);

  const open = async (p: LearnProject) => {
    await table.put(p);
    go(`learn/${p.id}`);
  };

  return (
    <div className="page learn-home">
      <section className="hero learn-hero">
        <div className="hero-critters" aria-hidden>
          <ZoPic outfit="baby" pose="wave" size={88} />
        </div>
        <div className="hero-text">
          <h1>Zo Wants to Learn</h1>
          <p className="muted">Feed Zo your own examples, clean them, train it and test it.</p>
        </div>
      </section>

      <div className="page-head">
        <h2 className="section-title">Teach Zo to…</h2>
      </div>
      <div className="mode-row">
        {MODES.map((m) => (
          <button key={m.id} className="mode-card" onClick={() => open(newLearnProject(m.id, `My ${m.name.toLowerCase()} model`))}>
            <ZoPic outfit={m.zo} pose="wave" size={56} />
            <strong>{m.name}</strong>
            <small>{m.blurb}</small>
          </button>
        ))}
      </div>

      <div className="page-head">
        <h2 className="section-title">Start from an example</h2>
      </div>
      <div className="example-row">
        {EXAMPLES.map((e) => (
          <button key={e.id} className="example-card" onClick={() => open(fromExample(e))}>
            <span className="pill">{MODE_NAME[e.mode]}</span>
            <strong>{e.title}</strong>
            <small>{e.blurb}</small>
          </button>
        ))}
      </div>

      <div className="page-head">
        <h2 className="section-title">My models</h2>
      </div>
      {list && list.length ? (
        <div className="game-grid">
          {list.map((p) => (
            <article key={p.id} className="game-card">
              <a href={`#/learn/${p.id}`} className="game-card-main">
                <span className="game-emoji project-thumb">
                  <ZoPic outfit={p.badges.includes("graduate") ? "graduate" : p.model ? "student" : "baby"} size={40} />
                </span>
                <span className="game-card-text">
                  <strong>{p.title}</strong>
                  <small>
                    {MODE_NAME[p.mode]} · {p.rows.length} example{p.rows.length === 1 ? "" : "s"} · {p.badges.length} badge{p.badges.length === 1 ? "" : "s"}
                  </small>
                </span>
              </a>
              <div className="game-card-actions">
                <a className="btn btn-soft btn-sm" href={`#/learn/${p.id}`}>
                  <Icon name="edit" size={16} /> Open
                </a>
                <span className="spacer" />
                <button className="icon-btn icon-btn-sm danger-hover" aria-label={`Delete ${p.title}`} onClick={() => setDeleting(p)}>
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : list ? (
        <div className="card is-quiet learn-empty">
          <ZoPic outfit="baby" pose="stand" size={56} />
          <p>No models yet.</p>
        </div>
      ) : null}

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
              <button
                className="btn btn-danger"
                onClick={async () => {
                  await table.remove(deleting.id);
                  setList((l) => (l || []).filter((x) => x.id !== deleting.id));
                  setDeleting(null);
                }}
              >
                Delete
              </button>
            </>
          }
        >
          <p>Apps you already saved keep working.</p>
        </Modal>
      )}
    </div>
  );
}
