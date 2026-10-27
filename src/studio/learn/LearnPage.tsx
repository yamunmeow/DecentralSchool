import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { checkData } from "../../learn/clean";
import { BADGES, MODES, QUESTIONS, questionsFor, STEPS, type Question, type Step } from "../../learn/concepts";
import { testResult, usableRows } from "../../learn/project";
import type { LearnProject } from "../../learn/types";
import { models as table } from "../db";
import { go, useApp } from "../store";
import { Icon } from "../ui";
import { CleanStep, FeedStep, SplitStep } from "./DataSteps";
import { TestStep } from "./TestStep";
import { TrainStep } from "./TrainStep";
import { UseStep } from "./UseStep";
import "./learn.css";
import { ZoPic } from "./Zo";

export interface StepProps {
  project: LearnProject;
  update: (fn: (p: LearnProject) => LearnProject) => void;
  award: (id: string) => void;
}

export function LearnPage({ id, step }: { id: string; step?: string }) {
  const [project, setProject] = useState<LearnProject | null | undefined>(undefined);
  useEffect(() => {
    table.get(id).then((p) => setProject(p || null), () => setProject(null));
  }, [id]);
  if (project === undefined) return <div className="splash" aria-busy />;
  if (project === null)
    return (
      <div className="page">
        <p>This model isn't in this browser.</p>
        <a className="btn btn-primary" href="#/learn">
          Zo Wants to Learn
        </a>
      </div>
    );
  return <Learn key={project.id} initial={project} step={(STEPS.find((s) => s.id === step)?.id || "feed") as Step} />;
}

function Learn({ initial, step }: { initial: LearnProject; step: Step }) {
  const { toast } = useApp();
  const [project, setProject] = useState(initial);
  const ref = useRef(project);
  ref.current = project;
  const timer = useRef(0);

  const persist = useCallback(() => {
    window.clearTimeout(timer.current);
    table.put(ref.current).catch(() => toast("Couldn't save in this browser.", "error"));
  }, [toast]);

  const update = useCallback(
    (fn: (p: LearnProject) => LearnProject) => {
      setProject((p) => {
        const next = { ...fn(p), updated: Date.now() };
        ref.current = next;
        return next;
      });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(persist, 600);
    },
    [persist],
  );

  useEffect(() => {
    window.addEventListener("pagehide", persist);
    return () => {
      window.removeEventListener("pagehide", persist);
      persist();
    };
  }, [persist]);

  const award = useCallback(
    (badge: string) => {
      if (ref.current.badges.includes(badge)) return;
      update((p) => (p.badges.includes(badge) ? p : { ...p, badges: [...p.badges, badge] }));
      const b = BADGES.find((x) => x.id === badge);
      if (b) toast(`Badge: ${b.name}`);
    },
    [update, toast],
  );

  // Badges that follow from the project itself.
  const usable = usableRows(project.rows, project.mode).length;
  const issues = useMemo(() => checkData(project.rows, project.mode), [project.rows, project.mode]);
  const toFix = issues.filter((i) => i.level === "fix").length;
  const result = useMemo(() => testResult(project), [project.model, project.runs, project.rows, project.seed, project.testShare]);
  useEffect(() => {
    if (usable >= 10) award("fed");
    if (usable >= 10 && toFix === 0) award("detective");
    if (project.runs.length) award("trained");
    if (new Set(project.runs.map((r) => JSON.stringify(r.settings))).size >= 3) award("scientist");
    if (result?.pass) award("graduate");
    const qs = QUESTIONS.filter((q) => !q.modes || q.modes.includes(project.mode));
    if (qs.every((q) => project.quiz[q.id] === q.answer)) award("quiz");
    if (project.card.by.trim() && project.card.goodAt.trim() && project.card.badAt.trim()) award("card");
  }, [usable, toFix, project.runs, result?.pass, project.quiz, project.card, project.mode, award]);

  const index = STEPS.findIndex((s) => s.id === step);
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    nav.current?.querySelector(".learn-step.on")?.scrollIntoView({ block: "nearest", inline: "center" });
    window.scrollTo({ top: 0 });
  }, [step]);
  const props: StepProps = { project, update, award };
  const mode = MODES.find((m) => m.id === project.mode)!;
  const done: Record<Step, boolean> = {
    feed: usable >= 10,
    clean: usable >= 10 && toFix === 0,
    split: project.badges.includes("split"),
    train: !!project.model,
    test: project.badges.includes("examiner"),
    use: project.badges.includes("shipped"),
  };

  return (
    <div className="page learn-page">
      <header className="learn-head">
        <a href="#/learn" className="icon-btn" aria-label="All models">
          <Icon name="arrowL" />
        </a>
        <input className="learn-title" value={project.title} aria-label="Model name" onChange={(e) => update((p) => ({ ...p, title: e.target.value }))} />
        <span className="pill">
          {mode.name}: {mode.blurb}
        </span>
      </header>

      <nav className="learn-steps" aria-label="Steps" ref={nav}>
        {STEPS.map((s, i) => (
          <a key={s.id} href={`#/learn/${project.id}/${s.id}`} className={`learn-step${s.id === step ? " on" : ""}${done[s.id] ? " is-done" : ""}`} aria-current={s.id === step ? "step" : undefined}>
            <ZoPic outfit={s.zo} size={30} />
            <span>
              <small>{done[s.id] ? "✓" : i + 1}</small> {s.name}
            </span>
          </a>
        ))}
      </nav>

      <div className="learn-body">
        {step === "feed" && <FeedStep {...props} />}
        {step === "clean" && <CleanStep {...props} issues={issues} />}
        {step === "split" && <SplitStep {...props} />}
        {step === "train" && <TrainStep {...props} />}
        {step === "test" && <TestStep {...props} result={result} />}
        {step === "use" && <UseStep {...props} result={result} />}
      </div>

      {questionsFor(step, project.mode).map((q) => (
        <Quiz key={q.id} q={q} chosen={project.quiz[q.id]} onChoose={(n) => update((p) => ({ ...p, quiz: { ...p.quiz, [q.id]: n } }))} />
      ))}

      <footer className="learn-foot">
        {index > 0 && (
          <a className="btn btn-ghost" href={`#/learn/${project.id}/${STEPS[index - 1].id}`}>
            <Icon name="arrowL" size={18} /> {STEPS[index - 1].name}
          </a>
        )}
        <span className="spacer" />
        {index < STEPS.length - 1 && (
          <button className="btn btn-primary" onClick={() => (persist(), go(`learn/${project.id}/${STEPS[index + 1].id}`))}>
            {STEPS[index + 1].name} <Icon name="arrowR" size={18} />
          </button>
        )}
      </footer>
    </div>
  );
}

/** "Zo asks": one question about what this step is for. */
function Quiz({ q, chosen, onChoose }: { q: Question; chosen?: number; onChoose: (n: number) => void }) {
  const answered = chosen !== undefined;
  return (
    <section className="card quiz" aria-labelledby={`q-${q.id}`}>
      <div className="quiz-head">
        <ZoPic outfit="wizard" pose={answered && chosen === q.answer ? "cheer" : "stand"} size={44} />
        <div>
          <small className="muted">Zo asks</small>
          <h3 id={`q-${q.id}`}>{q.q}</h3>
        </div>
      </div>
      <div className="quiz-options">
        {q.options.map((o, i) => (
          <button
            key={o}
            className={`quiz-option${answered && i === chosen ? (i === q.answer ? " is-right" : " is-wrong") : ""}`}
            aria-pressed={chosen === i}
            onClick={() => onChoose(i)}
          >
            {answered && i === chosen && <Icon name={i === q.answer ? "check" : "undo"} size={16} />}
            {o}
          </button>
        ))}
      </div>
      {answered && (
        <p className={`quiz-explain ${chosen === q.answer ? "is-right" : "is-wrong"}`} role="status">
          <strong>{chosen === q.answer ? "Yes! " : "Not quite. "}</strong>
          {q.explain}
        </p>
      )}
    </section>
  );
}
