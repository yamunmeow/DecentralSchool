import { useEffect, useMemo, useRef, useState } from "react";
import { labelCounts } from "../../learn/clean";
import { makeTrainer, splitOf, stale, usableRows } from "../../learn/project";
import { pointsOf, predictLine } from "../../learn/regression";
import type { EpochStats, LearnMode, LearnProject, LineModel, RunLog, TrainSettings } from "../../learn/types";
import { uid } from "../../shared/random";
import { Icon } from "../ui";
import { fmt, LineChart, Scatter } from "./charts";
import type { StepProps } from "./LearnPage";
import { ZoGuide } from "./Zo";
import { t, tn } from "../i18n";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const two = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

/** Where test loss bottomed out, if it then rose clearly while practice loss kept falling. */
export function overfitAt(stats: EpochStats[]): number | null {
  const s = stats.filter((x) => x.epoch > 0 && isFinite(x.testLoss));
  if (s.length < 5) return null;
  const best = s.reduce((a, x) => (x.testLoss < a.testLoss ? x : a), s[0]);
  const last = s[s.length - 1];
  return best.epoch < last.epoch - 2 && last.testLoss > best.testLoss * 1.12 && last.trainLoss < best.trainLoss ? best.epoch : null;
}

export function settingsText(mode: LearnMode, s: TrainSettings): string {
  if (mode === "write") return tn(s.context, "looks back {n} word", "looks back {n} words");
  const parts = [`${s.epochs} rounds`, s.speed];
  if (mode === "predict") parts.push(s.shape);
  else parts.push(s.features === "letters" ? t("letter groups") : s.features === "both" ? t("words + letters") : t("words"));
  if (s.simple) parts.push("simple");
  return parts.join(" · ");
}

function Seg<T extends string | number>({ label, value, options, onChange, disabled }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="seg seg-small" role="group" aria-label={label}>
        {options.map(([v, name]) => (
          <button key={String(v)} className={value === v ? "on" : ""} aria-pressed={value === v} disabled={disabled} onClick={() => onChange(v)}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TrainStep({ project, update, award }: StepProps) {
  const { mode } = project;
  const s = project.settings;
  const [live, setLive] = useState<EpochStats[] | null>(null);
  const [liveLine, setLiveLine] = useState<LineModel | null>(null);
  const [running, setRunning] = useState(false);
  const [liveRounds, setLiveRounds] = useState(0);
  const stop = useRef(false);
  useEffect(() => () => void (stop.current = true), []);

  const set = (patch: Partial<TrainSettings>) => update((p) => ({ ...p, settings: { ...p.settings, ...patch } }));
  const { train, test } = useMemo(() => splitOf(project), [project.rows, project.testShare, project.seed, project.mode]);
  const labels = labelCounts(train).length;
  const problem =
    train.length < 3
      ? t("Feed me a few more examples first.")
      : (mode === "sort" && labels < 2)
        ? t("I need at least two different labels to tell apart.")
        : mode === "predict" && pointsOf(train).length < 3
          ? t("I need at least 3 rows of plain numbers.")
          : null;

  const run = async (p: LearnProject) => {
    const t = makeTrainer(p);
    const stats = [t.start()];
    stop.current = false;
    setRunning(true);
    setLiveRounds(t.rounds);
    setLive([...stats]);
    const delay = Math.max(15, Math.min(140, 2400 / t.rounds));
    for (let i = 0; i < t.rounds && !stop.current; i++) {
      await new Promise((r) => window.setTimeout(r, delay));
      if (stop.current && i > 0) break;
      stats.push(t.epoch());
      setLive([...stats]);
      if (mode === "predict") setLiveLine(t.model() as LineModel);
    }
    const log: RunLog = { id: uid(), at: Date.now(), settings: p.settings, rows: usableRows(p.rows, mode).length, stats };
    update((q) => ({ ...q, model: t.model(), trainedOn: { rows: usableRows(q.rows, mode).length, seed: q.seed, testShare: q.testShare }, runs: [log, ...q.runs].slice(0, 12) }));
    setRunning(false);
    setLive(null);
    setLiveLine(null);
    if (overfitAt(stats) !== null) award("overfit");
  };

  const stats = live || project.runs[0]?.stats || [];
  const lastRun = project.runs[0];
  const rounds = live ? liveRounds : lastRun ? (mode === "write" ? lastRun.stats.length - 1 : lastRun.settings.epochs) : mode === "write" ? 10 : s.epochs;
  const last = stats[stats.length - 1];
  const over = !running ? overfitAt(stats) : null;
  const line = liveLine || (project.model?.kind === "line" ? project.model : null);

  let say: string;
  if (problem) say = problem;
  else if (running) say = mode === "write" ? `Reading… page ${stats.length - 1}.` : `Learning… round ${stats.length - 1} of ${s.epochs}.`;
  else if (!project.model) say = mode === "write" ? t("Press Train and I'll read your text page by page.") : t("Press Train and watch me learn. Blue is practice, orange is my test.");
  else if (stale(project)) say = t("My data changed since I last trained. Train me again!");
  else if (over !== null) say = t("Look! After round {n} my test mistakes went up while practice kept improving. I started memorising.", { n: over });
  else if (mode === "write") say = t("Done! On new sentences I'm {n} bits surprised per word. Lower is better.", { n: last && isFinite(last.testLoss) ? two(last.testLoss) : "?" });
  else if (mode === "predict") say = t("Done! My guesses on the test are about {n} off.", { n: last ? fmt(last.testScore) : "?" });
  else say = t("Done! I got {n} of my test right.", { n: last ? pct(last.testScore) : "?" });

  return (
    <>
      <ZoGuide outfit={over !== null ? "explorer" : "student"} pose={running ? "walk1" : project.model && !over ? "cheer" : "stand"}>
        {say}
      </ZoGuide>

      <section className="card train-settings">
        <div className="settings-grid">
          {mode !== "write" && (
            <label className="field">
              <span className="field-label">
                {t("Rounds:")} <strong>{s.epochs}</strong>
              </span>
              <input type="range" min={5} max={100} step={5} value={s.epochs} disabled={running} onChange={(e) => set({ epochs: Number(e.target.value) })} />
            </label>
          )}
          {mode !== "write" && <Seg label={t("Learning speed")} value={s.speed} disabled={running} options={[["slow", t("Slow")], ["medium", t("Medium")], ["fast", t("Fast")]]} onChange={(v) => set({ speed: v })} />}
          {(mode === "sort" || mode === "reply") && <Seg label={t("Zo looks at")} value={s.features} disabled={running} options={[["words", t("Words")], ["letters", t("Letter groups")], ["both", t("Both")]]} onChange={(v) => set({ features: v })} />}
          {mode === "predict" && <Seg label={t("Shape")} value={s.shape} disabled={running} options={[["straight", t("Straight")], ["curve", t("Curve")], ["wiggly", t("Wiggly")]]} onChange={(v) => set({ shape: v })} />}
          {mode === "write" && <Seg label={t("Zo looks back")} value={s.context} disabled={running} options={[[1, t("1 word")], [2, t("2 words")], [3, t("3 words")]]} onChange={(v) => set({ context: v })} />}
          {mode !== "write" && (
            <label className="check">
              <input type="checkbox" checked={s.simple} disabled={running} onChange={(e) => set({ simple: e.target.checked })} />
              {t("Keep it simple")}
            </label>
          )}
        </div>
        <div className="toolbar">
          {running ? (
            <button className="btn btn-danger" onClick={() => (stop.current = true)}>
              <Icon name="stop" size={18} /> {t("Stop")}
            </button>
          ) : (
            <button className="btn btn-primary btn-big" disabled={!!problem} onClick={() => run(project)}>
              <Icon name="play" size={18} /> {project.model ? t("Train again") : t("Train")}
            </button>
          )}
          <span className="muted">
            {train.length} practice · {test.length} test
          </span>
        </div>
      </section>

      {stats.length > 0 && (
        <div className="train-charts">
          {mode === "predict" && (
            <Scatter
              title={t("Zo's line")}
              xName={project.columns[0]}
              yName={project.columns[1]}
              dots={[...pointsOf(train).map((d) => ({ ...d, slot: 1 as const })), ...pointsOf(test).map((d) => ({ ...d, slot: 2 as const }))]}
              line={line ? (x) => predictLine(line, x) : undefined}
            />
          )}
          {mode === "write" ? (
            <LineChart
              title={t("Surprise per word (lower is better)")}
              xLabel={t("Page")}
              rounds={rounds}
              format={two}
              series={[
                { name: t("Practice"), slot: 1, values: stats.map((x) => x.trainLoss) },
                { name: t("Test"), slot: 2, values: stats.map((x) => x.testLoss) },
              ]}
            />
          ) : (
            <LineChart
              title={mode === "predict" ? t("Mistakes (squared, lower is better)") : t("Mistakes: loss (lower is better)")}
              xLabel={t("Round")}
              rounds={rounds}
              format={two}
              series={[
                { name: t("Practice"), slot: 1, values: stats.map((x) => x.trainLoss) },
                { name: t("Test"), slot: 2, values: stats.map((x) => x.testLoss) },
              ]}
            />
          )}
          {(mode === "sort" || mode === "reply") && (
            <LineChart
              title={t("Right answers")}
              xLabel={t("Round")}
              rounds={rounds}
              min={0}
              max={1}
              format={pct}
              series={[
                { name: t("Practice"), slot: 1, values: stats.map((x) => x.trainScore) },
                { name: t("Test"), slot: 2, values: stats.map((x) => x.testScore) },
              ]}
            />
          )}
          {mode === "predict" && (
            <LineChart
              title={t("Average miss (in {unit})", { unit: project.columns[1] })}
              xLabel={t("Round")}
              rounds={rounds}
              format={fmt}
              series={[
                { name: t("Practice"), slot: 1, values: stats.map((x) => x.trainScore) },
                { name: t("Test"), slot: 2, values: stats.map((x) => x.testScore) },
              ]}
            />
          )}
        </div>
      )}

      {project.runs.length > 0 && (
        <section className="card">
          <h2 className="card-title">{t("Experiment log")}</h2>
          <div className="viz-table-scroll">
            <table className="plain-table run-log">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("Settings")}</th>
                  <th>{t("Examples")}</th>
                  <th>{t("Practice")}</th>
                  <th>{t("Test")}</th>
                </tr>
              </thead>
              <tbody>
                {project.runs.map((r, i) => {
                  const end = r.stats[r.stats.length - 1];
                  const show = (n: number, loss: number) => (mode === "write" ? two(loss) : mode === "predict" ? fmt(n) : pct(n));
                  return (
                    <tr key={r.id} className={i === 0 ? "is-current" : ""}>
                      <td>{project.runs.length - i}</td>
                      <td>{settingsText(mode, r.settings)}</td>
                      <td>{r.rows}</td>
                      <td>{end ? show(end.trainScore, end.trainLoss) : "–"}</td>
                      <td>
                        {end ? show(end.testScore, end.testLoss) : "–"}
                        {overfitAt(r.stats) !== null && <span className="pill pill-warn">{t("memorised")}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
