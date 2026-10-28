import { useEffect, useState } from "react";
import { MODES } from "../../learn/concepts";
import { examplesFor } from "../../learn/examples";
import { fromExample, newLearnProject } from "../../learn/project";
import type { LearnProject } from "../../learn/types";
import { models as table } from "../db";
import { go } from "../store";
import { getLang, t, tn } from "../i18n";
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
          <h1>{t("Zo Wants to Learn")}</h1>
          <p className="muted">{t("Feed Zo your own examples, clean them, train it and test it.")}</p>
        </div>
      </section>

      <div className="page-head">
        <h2 className="section-title">{t("Teach Zo to…")}</h2>
      </div>
      <div className="mode-row">
        {MODES.map((m) => (
          <button key={m.id} className="mode-card" onClick={() => open(newLearnProject(m.id, t(`My ${m.name.toLowerCase()} model`)))}>
            <ZoPic outfit={m.zo} pose="wave" size={56} />
            <strong>{t(m.name)}</strong>
            <small>{t(m.blurb)}</small>
          </button>
        ))}
      </div>

      <div className="page-head">
        <h2 className="section-title">{t("Start from an example")}</h2>
      </div>
      <div className="example-row">
        {examplesFor(getLang()).map((e) => (
          <button key={e.id} className="example-card" onClick={() => open(fromExample(e))}>
            <span className="pill">{t(MODE_NAME[e.mode])}</span>
            <strong>{e.title}</strong>
            <small>{e.blurb}</small>
          </button>
        ))}
      </div>

      <div className="page-head">
        <h2 className="section-title">{t("My models")}</h2>
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
                    {t(MODE_NAME[p.mode])} · {tn(p.rows.length, "{n} example", "{n} examples")} · {tn(p.badges.length, "{n} badge", "{n} badges")}
                  </small>
                </span>
              </a>
              <div className="game-card-actions">
                <a className="btn btn-soft btn-sm" href={`#/learn/${p.id}`}>
                  <Icon name="edit" size={16} /> {t("Open")}
                </a>
                <span className="spacer" />
                <button className="icon-btn icon-btn-sm danger-hover" aria-label={t("Delete {name}", { name: p.title })} onClick={() => setDeleting(p)}>
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : list ? (
        <div className="card is-quiet learn-empty">
          <ZoPic outfit="baby" pose="stand" size={56} />
          <p>{t("No models yet.")}</p>
        </div>
      ) : null}

      {deleting && (
        <Modal
          title={t("Delete “{title}”?", { title: deleting.title })}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <span className="spacer" />
              <button className="btn btn-ghost" onClick={() => setDeleting(null)}>
                {t("Keep it")}
              </button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  await table.remove(deleting.id);
                  setList((l) => (l || []).filter((x) => x.id !== deleting.id));
                  setDeleting(null);
                }}
              >
                {t("Delete")}
              </button>
            </>
          }
        >
          <p>{t("Apps you already saved keep working.")}</p>
        </Modal>
      )}
    </div>
  );
}
