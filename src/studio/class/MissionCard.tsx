import { useMemo, useState } from "react";
import type { CodeProject } from "../../code/types";
import { getName, setName } from "../role";
import { useApp } from "../store";
import { dateText, t } from "../i18n";
import { Field, Icon, Modal } from "../ui";
import { handInFile } from "./files";
import { blockTypes, checkLabel, handInOf, passes, shareFile, stepsDone } from "./model";
import "./class.css";

const Stars = ({ n }: { n: number }) => (
  <span className="stars" aria-label={t("{n} of 3 stars", { n })}>
    {[1, 2, 3].map((i) => (
      <span key={i} className={i <= n ? "on" : ""} aria-hidden>
        ★
      </span>
    ))}
  </span>
);

export { Stars };

/** The teacher's challenge beside the scene: steps that tick themselves, hints, feedback, hand in. */
export function MissionCard({ project, update, onHandIn }: { project: CodeProject; update: (fn: (p: CodeProject) => CodeProject) => void; onHandIn: () => void }) {
  const m = project.mission!;
  const types = useMemo(() => blockTypes(project), [project]);
  const [hint, setHint] = useState<string | null>(null);
  const done = new Set(stepsDone(project));
  const last = project.feedback?.[project.feedback.length - 1];

  return (
    <details className="mission-card" open>
      <summary>
        <span className="mission-tag">{t("Mission")}</span>
        <strong>{m.title}</strong>
        <span className="spacer" />
        <span className={`pill${done.size === m.steps.length ? " pill-done" : ""}`}>
          {done.size}/{m.steps.length}
        </span>
      </summary>
      {m.intro && <p className="mission-intro">{m.intro}</p>}
      <ol className="mission-steps">
        {m.steps.map((s) => {
          const ok = s.check ? passes(s.check, project, types) : (project.ticked || []).includes(s.id);
          return (
            <li key={s.id} className={ok ? "is-done" : ""}>
              {s.check ? (
                <span className="step-mark" title={t("Checked by Game Lab: {check}", { check: checkLabel(s.check) })} aria-label={ok ? t("Done") : t("Not yet")}>
                  {ok ? "✓" : ""}
                </span>
              ) : (
                <button
                  className="step-mark is-tick"
                  aria-pressed={ok}
                  aria-label={ok ? t("Done: untick") : t("Tick when done")}
                  onClick={() => update((p) => ({ ...p, ticked: ok ? (p.ticked || []).filter((x) => x !== s.id) : [...(p.ticked || []), s.id] }))}
                >
                  {ok ? "✓" : ""}
                </button>
              )}
              <span className="step-text">
                {s.text}
                {hint === s.id && s.hint && <span className="step-hint">{s.hint}</span>}
              </span>
              {s.hint && (
                <button className="link-btn step-hint-btn" onClick={() => setHint(hint === s.id ? null : s.id)}>
                  {hint === s.id ? t("Hide hint") : t("Hint")}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {last && (
        <div className={`mission-feedback is-${last.status}`}>
          <div>
            <strong>{last.status === "approved" ? t("Approved") : t("Try again")}</strong> <Stars n={last.stars} />
            {last.teacher && <small> · {last.teacher}</small>}
          </div>
          {last.comment && <p>{last.comment}</p>}
        </div>
      )}
      <div className="toolbar">
        <button className="btn btn-primary btn-sm" onClick={onHandIn}>
          <Icon name="send" size={16} /> {project.handedIn ? t("Hand in again") : t("Hand in")}
        </button>
        {project.handedIn && <small className="muted">{t("Handed in {date}", { date: dateText(project.handedIn) })}</small>}
      </div>
    </details>
  );
}

/** Hand in: a playable file the student sends to the teacher (share sheet on phones). */
export function HandInModal({ project, update, onClose }: { project: CodeProject; update: (fn: (p: CodeProject) => CodeProject) => void; onClose: () => void }) {
  const { toast } = useApp();
  const [name, setStudent] = useState(getName);
  const [note, setNote] = useState("");
  const done = stepsDone(project).length;
  const total = project.mission?.steps.length || 0;

  const send = async () => {
    if (!name.trim()) return toast(t("Write your name so your teacher knows it's yours."), "error");
    setName(name);
    const h = handInOf(project, name.trim(), note.trim());
    const file = `${name.trim()} - ${project.title}.html`.replace(/[\\/:*?"<>|]+/g, " ");
    const how = await shareFile(file, handInFile(h), "text/html", t("{title} by {name}", { title: project.title, name: name.trim() }));
    if (how === "cancelled") return;
    update((p) => ({ ...p, handedIn: h.at, handInIds: [...(p.handInIds || []), h.id] }));
    toast(how === "shared" ? t("Sent!") : t("Saved. Send this file to your teacher."));
    onClose();
  };

  return (
    <Modal
      title={t("Hand in to your teacher")}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>
            {t("Not yet")}
          </button>
          <button className="btn btn-primary" onClick={send}>
            <Icon name="send" size={18} /> {t("Hand in")}
          </button>
        </>
      }
    >
      {total > 0 && (
        <p className={done === total ? "notice is-good" : "notice"}>
          {done === total ? t("All {n} steps done.", { n: total }) : t("{done} of {all} steps done. You can still hand it in.", { done, all: total })}
        </p>
      )}
      <Field label={t("Your name")}>
        <input value={name} onChange={(e) => setStudent(e.target.value)} autoFocus={!name} />
      </Field>
      <Field label={t("A note for your teacher (optional)")}>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Modal>
  );
}
