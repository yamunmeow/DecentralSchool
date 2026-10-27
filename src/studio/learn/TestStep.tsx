import { useEffect, useMemo, useState } from "react";
import { judge, predict, strongest } from "../../learn/classifier";
import { featureName, normalise } from "../../learn/text";
import { splitOf, stale } from "../../learn/project";
import { explained, pointsOf, predictLine } from "../../learn/regression";
import type { ClassifierModel, LineModel, WriterModel } from "../../learn/types";
import { copiedShare, detokenise, generate, nextWords, tokensOf } from "../../learn/writer";
import { Icon } from "../ui";
import { Bars, Confusion, fmt, Scatter } from "./charts";
import type { StepProps } from "./LearnPage";
import { ZoGuide } from "./Zo";

type Result = { value: number; text: string; pass: boolean } | null;

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Below this confidence Zo says it doesn't know (Reply mode). */
export const SURE = 0.4;

export function TestStep(props: StepProps & { result: Result }) {
  const { project, result } = props;
  const m = project.model;
  if (!m)
    return (
      <ZoGuide outfit="teacher" pose="stand">
        Train me first, then test me here.
      </ZoGuide>
    );
  return (
    <>
      {stale(project) && <p className="notice">The data changed since Zo was trained. Train again to test the new data.</p>}
      {m.kind === "classifier" && <ClassifierTest {...props} model={m} result={result} />}
      {m.kind === "line" && <LineTest {...props} model={m} result={result} />}
      {m.kind === "writer" && <WriterTest {...props} model={m} result={result} />}
    </>
  );
}

function Hero({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="hero-number">
      <strong>{value}</strong>
      <span>{label}</span>
      {sub && <small className="muted">{sub}</small>}
    </div>
  );
}

function useExaminer(award: (id: string) => void, tried: boolean) {
  useEffect(() => {
    if (!tried) return;
    const t = window.setTimeout(() => award("examiner"), 900);
    return () => window.clearTimeout(t);
  }, [tried, award]);
}

/* ---------- Sort and Reply ---------- */

function ClassifierTest({ project, award, model, result }: StepProps & { model: ClassifierModel; result: Result }) {
  const { test } = useMemo(() => splitOf(project), [project.rows, project.testShare, project.seed, project.mode]);
  const judged = useMemo(() => judge(model, test), [model, test]);
  const wrong = judged.filter((j) => !j.right);
  const [text, setText] = useState("");
  const out = useMemo(() => (text.trim() ? predict(model, text) : null), [model, text]);
  useExaminer(award, !!out);
  const reply = project.mode === "reply";
  const top = out?.probs[0];
  const sure = !!top && top.p >= SURE && out!.known > 0;

  const cells = useMemo(() => {
    const idx = new Map(model.labels.map((l, i) => [normalise(l), i]));
    const c = model.labels.map(() => model.labels.map(() => 0));
    for (const j of judged) {
      const r = idx.get(normalise(j.row.label));
      const g = idx.get(normalise(j.guess));
      if (r !== undefined && g !== undefined) c[r][g]++;
    }
    return c;
  }, [judged, model.labels]);

  const say = result
    ? result.pass
      ? `I got ${result.text} of my test right! Try me with something new.`
      : `I got ${result.text} of my test right. Look at my mistakes: what could you feed me to help?`
    : "There's nothing in my test. Keep some examples back on the Split step.";

  return (
    <>
      <ZoGuide outfit={result?.pass ? "graduate" : "teacher"} pose={result?.pass ? "cheer" : "stand"}>
        {say}
      </ZoGuide>

      {result && <Hero value={result.text} label="right on the test" sub={`${judged.length - wrong.length} of ${judged.length}`} />}

      <section className="card try-box">
        <h2 className="card-title">{reply ? "Ask Zo" : "Try Zo"}</h2>
        <input className="try-input" value={text} placeholder={reply ? "Type a question" : "Type something new"} onChange={(e) => setText(e.target.value)} aria-label={reply ? "Question" : "Text to sort"} />
        {out && top && (
          <div className="try-out" role="status">
            {reply ? (
              <p className={`zo-answer${sure ? "" : " is-unsure"}`}>{sure ? top.label : "I haven't learned that yet."}</p>
            ) : (
              <p className="zo-answer">
                {out.known === 0 ? "These words are all new to me, so this is a wild guess: " : ""}
                <strong>{top.label}</strong> ({pct(top.p)} sure)
              </p>
            )}
            <Bars items={out.probs.slice(0, 5).map((x) => ({ label: x.label, value: x.p }))} format={pct} max={1} highlight={top.label} />
            <div className="why">
              <span className="why-title">Why: words that pushed Zo towards “{top.label}” or away</span>
              <p className="why-words">
                {out.words.map((w, i) => {
                  const strength = Math.min(1, Math.abs(w.push) / 0.6);
                  const level = w.push === 0 ? 0 : Math.max(1, Math.round(strength * 4));
                  return (
                    <span key={i} className={`why-word ${w.push > 0 ? "is-for" : w.push < 0 ? "is-against" : ""} lvl-${level}`} title={`${w.push > 0 ? "+" : ""}${w.push.toFixed(2)}`}>
                      {w.word}
                    </span>
                  );
                })}
              </p>
              <ul className="viz-legend">
                <li>
                  <span className="viz-key why-key is-for" aria-hidden /> towards
                </li>
                <li>
                  <span className="viz-key why-key is-against" aria-hidden /> away
                </li>
              </ul>
            </div>
          </div>
        )}
      </section>

      {!reply && model.labels.length <= 8 && judged.length > 0 && <Confusion labels={model.labels} cells={cells} />}

      {wrong.length > 0 && (
        <section className="card">
          <h2 className="card-title">
            Zo's mistakes <span className="pill">{wrong.length}</span>
          </h2>
          <ul className="mistakes">
            {wrong.map((j) => (
              <li key={j.row.id}>
                <span className="mistake-text">{j.row.text}</span>
                <span className="mistake-labels">
                  <span>
                    Real: <strong>{j.row.label}</strong>
                  </span>
                  <span>
                    Zo: <strong>{j.guess}</strong> ({pct(j.p)})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!reply && (
        <section className="card">
          <h2 className="card-title">What Zo looks for</h2>
          <div className="looks-for">
            {model.labels.map((l) => (
              <div key={l}>
                <h3>{l}</h3>
                <p className="feature-chips">
                  {strongest(model, l, 8)
                    .filter((f) => f.weight > 0)
                    .map((f) => (
                      <span key={f.feature} className="feature-chip">
                        {featureName(f.feature)}
                      </span>
                    ))}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/* ---------- Predict ---------- */

function LineTest({ project, award, model, result }: StepProps & { model: LineModel; result: Result }) {
  const { train, test } = useMemo(() => splitOf(project), [project.rows, project.testShare, project.seed, project.mode]);
  const tp = pointsOf(test);
  const [x, setX] = useState("");
  const xv = Number(x.replace(",", "."));
  const has = x.trim() !== "" && isFinite(xv);
  useExaminer(award, has);
  const miss = tp.length ? tp.reduce((s, p) => s + Math.abs(p.y - predictLine(model, p.x)), 0) / tp.length : NaN;
  const outside = has && (xv < model.xMin || xv > model.xMax);
  const [xn, yn] = project.columns;

  return (
    <>
      <ZoGuide outfit={result?.pass ? "graduate" : "teacher"} pose={result?.pass ? "cheer" : "stand"}>
        {isFinite(miss) ? `On the test my guesses were about ${fmt(miss)} off on average.` : "There's nothing in my test. Keep some rows back on the Split step."}
        {result && ` My line explains ${result.text} of the ups and downs.`}
      </ZoGuide>

      <div className="hero-row">
        {isFinite(miss) && <Hero value={fmt(miss)} label={`average miss (${yn})`} />}
        {result && <Hero value={result.text} label="of the spread explained" sub={`R² = ${explained(model, tp).toFixed(2)}`} />}
      </div>

      <section className="card try-box">
        <h2 className="card-title">Try Zo</h2>
        <label className="field">
          <span className="field-label">{xn}</span>
          <input className="try-input" inputMode="decimal" value={x} onChange={(e) => setX(e.target.value)} />
        </label>
        {has && (
          <div className="try-out" role="status">
            <p className="zo-answer">
              {yn}: <strong>{fmt(predictLine(model, xv))}</strong>
            </p>
            {outside && (
              <p className="notice">
                I only practised from {fmt(model.xMin)} to {fmt(model.xMax)}. Out here I'm just stretching my line, so don't trust me much.
              </p>
            )}
          </div>
        )}
      </section>

      <Scatter
        title="Zo's line and the test"
        xName={xn}
        yName={yn}
        dots={[...pointsOf(train).map((d) => ({ ...d, slot: 1 as const })), ...tp.map((d) => ({ ...d, slot: 2 as const }))]}
        line={(v) => predictLine(model, v)}
      />

      {tp.length > 0 && (
        <section className="card">
          <h2 className="card-title">Test rows</h2>
          <div className="viz-table-scroll">
            <table className="plain-table">
              <thead>
                <tr>
                  <th>{xn}</th>
                  <th>{yn}</th>
                  <th>Zo's guess</th>
                  <th>Miss</th>
                </tr>
              </thead>
              <tbody>
                {tp.map((p, i) => (
                  <tr key={i}>
                    <td>{p.x}</td>
                    <td>{p.y}</td>
                    <td>{fmt(predictLine(model, p.x))}</td>
                    <td>{fmt(Math.abs(p.y - predictLine(model, p.x)))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

/* ---------- Write ---------- */

function WriterTest({ project, award, model, result }: StepProps & { model: WriterModel; result: Result }) {
  const { train } = useMemo(() => splitOf(project), [project.rows, project.testShare, project.seed, project.mode]);
  const [prompt, setPrompt] = useState(() => tokensOf(train[0]?.text || "").slice(0, 2).join(" "));
  const [heat, setHeat] = useState(0.8);
  const [length, setLength] = useState(30);
  const [out, setOut] = useState<string[] | null>(null);
  useExaminer(award, !!out);
  const next = useMemo(() => nextWords(model, (normalise(prompt).match(/[\p{L}\p{M}\p{N}']+|[.,!?;:।]/gu) || []).slice(-3), 6), [model, prompt]);
  const copied = out ? copiedShare(train, out) : 0;

  return (
    <>
      <ZoGuide outfit={result?.pass ? "graduate" : "teacher"} pose={out ? "cheer" : "stand"}>
        {out
          ? copied > 0.6
            ? `${pct(copied)} of what I wrote is copied word for word from your text. I'm mostly remembering, not writing.`
            : `Only ${pct(copied)} is copied word for word. The rest I put together myself!`
          : "Give me a few words to start and I'll carry on."}
      </ZoGuide>

      {result && <Hero value={result.text} label="less surprised than guessing blindly" sub={`${model.vocab} words known`} />}

      <section className="card try-box">
        <label className="field">
          <span className="field-label">Start with</span>
          <input className="try-input" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </label>
        <div className="settings-grid">
          <label className="field">
            <span className="field-label">
              Creativity: <strong>{heat.toFixed(1)}</strong>
            </span>
            <input type="range" min={0.1} max={2} step={0.1} value={heat} onChange={(e) => setHeat(Number(e.target.value))} />
          </label>
          <label className="field">
            <span className="field-label">
              Words: <strong>{length}</strong>
            </span>
            <input type="range" min={5} max={80} step={5} value={length} onChange={(e) => setLength(Number(e.target.value))} />
          </label>
        </div>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={() => setOut(generate(model, prompt, heat, length))}>
            <Icon name="sparkle" size={18} /> Write
          </button>
        </div>
        {out && (
          <p className="zo-writing" role="status">
            {detokenise(out)}
          </p>
        )}
      </section>

      {next.length > 0 && <Bars title={`What Zo thinks comes after “${prompt.trim().split(/\s+/).slice(-3).join(" ") || "…"}”`} items={next.map((n) => ({ label: n.word, value: n.p }))} format={pct} max={Math.max(...next.map((n) => n.p))} />}
    </>
  );
}
