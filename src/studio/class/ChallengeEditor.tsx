import { useEffect, useMemo, useRef, useState } from "react";
import qrcode from "qrcode-generator";
import { newProject } from "../../code/project";
import type { CodeProject } from "../../code/types";
import { uid } from "../../shared/random";
import { CATEGORIES } from "../code/blocks";
import { STARTERS } from "../code/starters";
import { challenges as table, projects } from "../db";
import { slug } from "../exporting";
import { getName } from "../role";
import { go, useApp } from "../store";
import { Field, Icon } from "../ui";
import { challengeFile } from "./files";
import "./class.css";
import { CHECKS, joinLink, LINK_LIMIT, newChallenge, shareFile, type Challenge, type Check, type CheckKind, type MissionStep } from "./model";
import { t } from "../i18n";

/** Palette categories a challenge can switch off (Memory covers lists too). */
const PALETTE = ["events", "motion", "looks", "sound", "control", "sensing", "operators", "variables", "myblocks", "pen"];

export function ChallengeEditorPage({ id }: { id: string }) {
  const [c, setC] = useState<Challenge | null | undefined>(undefined);
  useEffect(() => {
    if (id === "new") {
      const fresh = newChallenge(STARTERS[0].make(), getName());
      table.put(fresh).then(() => go(`class/challenge/${fresh.id}`));
      return;
    }
    table.get(id).then((x) => setC(x || null), () => setC(null));
  }, [id]);
  if (c === undefined) return <div className="splash" aria-busy />;
  if (c === null)
    return (
      <div className="page">
        <p>{t("This challenge isn't in this browser.")}</p>
        <a className="btn btn-primary" href="#/class">
          {t("Class")}
        </a>
      </div>
    );
  return <ChallengeEditor key={c.id} initial={c} />;
}

function ChallengeEditor({ initial }: { initial: Challenge }) {
  const { toast } = useApp();
  const [c, setC] = useState(initial);
  const [mine, setMine] = useState<CodeProject[]>([]);
  const timer = useRef(0);
  useEffect(() => {
    projects.all().then((all) => setMine(all.filter((p) => !p.mission).sort((a, b) => b.updated - a.updated)), () => setMine([]));
  }, []);

  const update = (fn: (c: Challenge) => Challenge) =>
    setC((old) => {
      const next = { ...fn(old), updated: Date.now() };
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => table.put(next).catch(() => toast(t("Couldn't save in this browser."), "error")), 400);
      return next;
    });
  const latest = useRef(c);
  latest.current = c;
  useEffect(() => () => void table.put(latest.current), []);

  const setStep = (i: number, s: MissionStep) => update((x) => ({ ...x, steps: x.steps.map((y, j) => (j === i ? s : y)) }));
  const moveStep = (i: number, d: number) =>
    update((x) => {
      const steps = x.steps.slice();
      [steps[i], steps[i + d]] = [steps[i + d], steps[i]];
      return { ...x, steps };
    });

  const link = useMemo(() => joinLink(c), [c]);
  const tooLong = link.length > LINK_LIMIT;
  const qr = useMemo(() => {
    if (tooLong) return null;
    try {
      const code = qrcode(0, "L");
      code.addData(link);
      code.make();
      return code.createDataURL(4, 2);
    } catch {
      return null;
    }
  }, [link, tooLong]);

  const starters: { key: string; name: string; make: () => CodeProject }[] = [
    { key: "blank", name: t("Empty game"), make: () => newProject(c.title) },
    ...STARTERS.map((s) => ({ key: `starter:${s.id}`, name: t("Example: {title}", { title: t(s.title) }), make: s.make })),
    ...mine.map((p) => ({ key: `mine:${p.id}`, name: t("My game: {title}", { title: p.title }), make: () => structuredClone(p) })),
  ];
  const all = c.categories === null;

  return (
    <div className="page class-page">
      <header className="class-head">
        <a href="#/class" className="icon-btn" aria-label={t("Class")}>
          <Icon name="arrowL" />
        </a>
        <input className="class-title" value={c.title} aria-label={t("Challenge name")} onChange={(e) => update((x) => ({ ...x, title: e.target.value }))} />
      </header>

      <div className="challenge-grid">
        <div className="challenge-main">
          <section className="card">
            <Field label={t("What students should make")}>
              <textarea rows={3} value={c.intro} placeholder={t("Make a game where a character catches falling fruit.")} onChange={(e) => update((x) => ({ ...x, intro: e.target.value }))} />
            </Field>
            <label className="field">
              <span className="field-label">{t("Students start from")}</span>
              <select
                value=""
                onChange={(e) => {
                  const pick = starters.find((s) => s.key === e.target.value);
                  if (pick) update((x) => ({ ...x, starter: { ...pick.make(), id: uid() } }));
                }}
              >
                <option value="">{c.starter.title} ({c.starter.sprites.length} character{c.starter.sprites.length === 1 ? "" : "s"})</option>
                {starters.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="card">
            <h2 className="card-title">{t("Steps")}</h2>
            <ol className="step-editor">
              {c.steps.map((s, i) => (
                <li key={s.id}>
                  <span className="step-num">{i + 1}</span>
                  <div className="step-fields">
                    <input value={s.text} aria-label={t("Step {n}", { n: i + 1 })} onChange={(e) => setStep(i, { ...s, text: e.target.value })} />
                    <div className="step-row">
                      <select
                        aria-label={t("How it is checked")}
                        value={s.check?.kind ?? ""}
                        onChange={(e) => setStep(i, { ...s, check: e.target.value ? ({ kind: e.target.value as CheckKind, n: CHECKS.find((k) => k.kind === e.target.value)?.counted ? 2 : undefined } as Check) : undefined })}
                      >
                        <option value="">{t("Student ticks it")}</option>
                        {CHECKS.map((k) => (
                          <option key={k.kind} value={k.kind}>
                            {t("Check: {label}", { label: t(k.label).replace(" N ", t(" a number of ")) })}
                          </option>
                        ))}
                      </select>
                      {s.check && CHECKS.find((k) => k.kind === s.check!.kind)?.counted && (
                        <input className="step-n" type="number" min={1} max={20} aria-label={t("How many")} value={s.check.n ?? 2} onChange={(e) => setStep(i, { ...s, check: { ...s.check!, n: Math.max(1, Number(e.target.value) || 1) } })} />
                      )}
                    </div>
                    <input value={s.hint || ""} placeholder={t("Hint (optional)")} aria-label={t("Hint")} onChange={(e) => setStep(i, { ...s, hint: e.target.value || undefined })} />
                  </div>
                  <div className="step-tools">
                    <button className="icon-btn icon-btn-sm" disabled={i === 0} aria-label={t("Move up")} onClick={() => moveStep(i, -1)}>
                      <Icon name="up" size={16} />
                    </button>
                    <button className="icon-btn icon-btn-sm" disabled={i === c.steps.length - 1} aria-label={t("Move down")} onClick={() => moveStep(i, 1)}>
                      <Icon name="down" size={16} />
                    </button>
                    <button className="icon-btn icon-btn-sm danger-hover" disabled={c.steps.length < 2} aria-label={t("Remove step")} onClick={() => update((x) => ({ ...x, steps: x.steps.filter((_, j) => j !== i) }))}>
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            <div className="toolbar">
              <button className="btn btn-soft btn-sm" onClick={() => update((x) => ({ ...x, steps: [...x.steps, { id: uid(), text: "" }] }))}>
                <Icon name="plus" size={16} /> {t("Add a step")}
              </button>
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">{t("Blocks students can use")}</h2>
            <div className="seg seg-small">
              <button className={all ? "on" : ""} aria-pressed={all} onClick={() => update((x) => ({ ...x, categories: null }))}>
                {t("All")}
              </button>
              <button className={!all ? "on" : ""} aria-pressed={!all} onClick={() => update((x) => ({ ...x, categories: x.categories ?? ["events", "motion", "looks", "control"] }))}>
                {t("Only some")}
              </button>
            </div>
            {!all && (
              <div className="cat-picks">
                {PALETTE.map((k) => {
                  const on = c.categories!.includes(k);
                  return (
                    <label key={k} className={`cat-pick${on ? " on" : ""}`} style={{ ["--cat" as string]: CATEGORIES[k].colour }}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          update((x) => {
                            const next = on ? x.categories!.filter((y) => y !== k) : [...x.categories!, k];
                            return { ...x, categories: next.length ? next : x.categories };
                          })
                        }
                      />
                      <span className="cat-dot" aria-hidden />
                      {t(CATEGORIES[k].name)}
                    </label>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="card share-card">
          <h2 className="card-title">{t("Send to students")}</h2>
          <Field label={t("Your name, as students see it")}>
            <input value={c.teacher} onChange={(e) => update((x) => ({ ...x, teacher: e.target.value }))} />
          </Field>
          {qr && <img className="share-qr" src={qr} alt={t("QR code for the challenge link")} />}
          <div className="toolbar">
            {!tooLong && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() =>
                  navigator.clipboard.writeText(link).then(
                    () => toast(t("Link copied")),
                    () => toast(t("Couldn't copy. Use the file instead."), "error"),
                  )
                }
              >
                <Icon name="link" size={16} /> {t("Copy link")}
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => shareFile(`${slug(c.title)}-${t("challenge")}.html`, challengeFile(c), "text/html", c.title)}>
              <Icon name="file" size={16} /> {t("Challenge file")}
            </button>
          </div>
          {tooLong && <p className="notice">{t("The starter game is too big for a link. Send the file.")}</p>}
          <a className="btn btn-ghost btn-sm" href={link} target="_blank" rel="noreferrer">
            <Icon name="eye" size={16} /> {t("Try it as a student")}
          </a>
        </aside>
      </div>
    </div>
  );
}
