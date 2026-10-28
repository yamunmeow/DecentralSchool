import { useEffect, useMemo, useRef, useState } from "react";
import { checkData, labelCounts, type Issue } from "../../learn/clean";
import { pointsOf } from "../../learn/regression";
import { splitOf, usableRows } from "../../learn/project";
import { looksLikeHeader, parseTable } from "../../learn/table";
import { isNumber, seeded, sentences, toNumber } from "../../learn/text";
import type { LearnProject, Row } from "../../learn/types";
import { uid } from "../../shared/random";
import { ACCEPT_TEXT, textFromFile } from "../importText";
import { useApp } from "../store";
import { Icon } from "../ui";
import { Bars, Legend, Scatter, SplitStrip } from "./charts";
import type { StepProps } from "./LearnPage";
import { ZoGuide } from "./Zo";
import { t, tn } from "../i18n";

/** Column names per mode: what a row's text and label mean. */
export function columnsOf(p: LearnProject): [string, string] {
  if (p.mode === "reply") return [t("Question"), t("Answer")];
  if (p.mode === "predict") return p.columns;
  if (p.mode === "write") return [t("Text"), ""];
  return [t("Example"), t("Label")];
}

const PAGE = 40;

/* ---------- Feed ---------- */

export function FeedStep({ project, update }: StepProps) {
  const { toast } = useApp();
  const { mode } = project;
  const [label, setLabel] = useState("");
  const [bulk, setBulk] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [clearing, setClearing] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const counts = useMemo(() => labelCounts(project.rows), [project.rows]);
  const usable = usableRows(project.rows, mode).length;
  const [colA, colB] = columnsOf(project);

  const add = (pairs: [string, string][], columns?: [string, string]) => {
    const clean = pairs.filter(([t, l]) => t.trim() || l.trim());
    if (!clean.length) return toast(t("Nothing to add."), "error");
    update((p) => ({ ...p, columns: columns || p.columns, rows: [...p.rows, ...clean.map(([text, l]) => ({ id: uid(), text, label: l }))] }));
    toast(tn(clean.length, "Added {n} example", "Added {n} examples"));
  };

  /** Pasted or uploaded text → rows, the way this mode reads it. */
  const fromText = (text: string, tabular: boolean) => {
    if (mode === "write") return add(sentences(text).map((s) => [s, ""]));
    const table = tabular ? parseTable(text) : text.split(/\n+/).map((l) => [l.trim()]);
    const wide = table.filter((r) => r.length >= 2).length >= table.length / 2 && table.length > 0;
    if (mode === "predict") {
      if (!wide) return toast(t("Put two numbers on each line, like 3, 55."), "error");
      const head = looksLikeHeader(table[0], true);
      const body = head ? table.slice(1) : table;
      return add(
        body.map((r) => [r[0] || "", r[1] || ""]),
        head ? [table[0][0], table[0][1]] : undefined,
      );
    }
    if (wide) {
      const body = looksLikeHeader(table[0], false) ? table.slice(1) : table;
      return add(body.map((r) => [r[0], r.slice(1).join(", ")]));
    }
    if (!label.trim()) return toast(mode === "reply" ? t("Type the answer first.") : t("Type the label first."), "error");
    const lines = tabular ? table.map((r) => r[0]) : text.split(/\n+/);
    add(lines.map((l) => [l.trim(), label.trim()]));
  };

  const upload = async (f: File) => {
    try {
      const name = f.name.toLowerCase();
      const tabular = /\.(csv|tsv|txt)$/.test(name);
      const text = tabular ? await f.text() : await textFromFile(f);
      if (!tabular && mode !== "write") {
        if (!label.trim()) return toast(mode === "reply" ? t("Type the answer first.") : t("Type the label first."), "error");
        return add(sentences(text).map((s) => [s, label.trim()]));
      }
      fromText(text, tabular);
    } catch (e) {
      toast((e as Error).message || t("Couldn't read that file."), "error");
    }
  };

  const edit = (id: string, patch: Partial<Row>) => update((p) => ({ ...p, rows: p.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const remove = (id: string) => update((p) => ({ ...p, rows: p.rows.filter((r) => r.id !== id) }));
  const rows = project.rows.slice().reverse();

  const say =
    usable === 0
      ? mode === "write"
        ? t("I'm hungry for words! Give me a story, a poem or anything you wrote.")
        : mode === "predict"
          ? t("Give me pairs of numbers and I'll look for the pattern.")
          : mode === "reply"
            ? t("Teach me questions and the answer you'd give.")
            : t("Give me examples and tell me what each one is.")
      : usable < 10
        ? t("Yum! {n} so far. I need at least 10, and more is better.", { n: usable })
        : t("{n} examples! More, and more different ones, help me learn.", { n: usable });

  return (
    <>
      <ZoGuide outfit="baby" pose={usable >= 10 ? "cheer" : "stand"}>
        {say}
      </ZoGuide>

      <section className="card feed-add">
        <h2 className="card-title">{t("Add examples")}</h2>
        {mode === "predict" ? (
          <div className="feed-cols">
            <label className="field">
              <span className="field-label">{t("First column")}</span>
              <input value={project.columns[0]} onChange={(e) => update((p) => ({ ...p, columns: [e.target.value, p.columns[1]] }))} />
            </label>
            <label className="field">
              <span className="field-label">{t("Second column (to predict)")}</span>
              <input value={project.columns[1]} onChange={(e) => update((p) => ({ ...p, columns: [p.columns[0], e.target.value] }))} />
            </label>
          </div>
        ) : (
          mode !== "write" && (
            <label className="field">
              <span className="field-label">{mode === "reply" ? t("Answer") : t("Label")}</span>
              <input value={label} list="learn-labels" placeholder={mode === "reply" ? t("What Zo should say") : t("e.g. happy")} onChange={(e) => setLabel(e.target.value)} />
              <datalist id="learn-labels">
                {counts.map((c) => (
                  <option key={c.label} value={c.label} />
                ))}
              </datalist>
            </label>
          )
        )}
        <label className="field">
          <span className="field-label">{mode === "write" ? t("Text") : mode === "predict" ? `${project.columns[0]}, ${project.columns[1]}` : mode === "reply" ? t("Questions, one per line") : t("Examples, one per line")}</span>
          <textarea
            rows={mode === "write" ? 7 : 4}
            value={bulk}
            placeholder={mode === "predict" ? "3, 55\n4, 61" : mode === "write" ? t("Once upon a time…") : mode === "reply" ? t("What is your name?\nWho are you?") : t("I love sunny days\nThis is the best day ever")}
            onChange={(e) => setBulk(e.target.value)}
          />
        </label>
        <div className="toolbar">
          <button
            className="btn btn-primary"
            disabled={!bulk.trim()}
            onClick={() => {
              fromText(bulk, mode === "predict" || bulk.includes("\t"));
              setBulk("");
            }}
          >
            <Icon name="plus" size={18} /> {t("Add")}
          </button>
          <button className="btn btn-ghost" onClick={() => file.current?.click()}>
            <Icon name="upload" size={18} /> {t("Upload a file")}
          </button>
          <input
            ref={file}
            type="file"
            hidden
            accept={mode === "predict" ? ".csv,.tsv,.txt" : `.csv,.tsv,${ACCEPT_TEXT}`}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) upload(f);
            }}
          />
        </div>
      </section>

      {mode === "sort" && counts.length > 0 && (
        <div className="label-chips" aria-label={t("Labels")}>
          {counts.map((c) => (
            <button key={c.label} className={`chip-btn${label === c.label ? " on" : ""}`} onClick={() => setLabel(c.label)}>
              {c.label} <span>{c.n}</span>
            </button>
          ))}
        </div>
      )}

      <section className="card data-table-card">
        <div className="card-head">
          <h2 className="card-title">
            {t("Data")} <span className="pill">{project.rows.length}</span>
          </h2>
          <span className="spacer" />
          {project.rows.length > 0 &&
            (clearing ? (
              <>
                <button className="btn btn-danger btn-sm" onClick={() => (update((p) => ({ ...p, rows: [] })), setClearing(false))}>
                  Remove all {project.rows.length}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setClearing(false)}>
                  {t("Keep")}
                </button>
              </>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => setClearing(true)}>
                <Icon name="trash" size={16} /> {t("Remove all")}
              </button>
            ))}
        </div>
        {project.rows.length > 0 && (
          <div className="data-table" role="table" aria-label={t("Examples")}>
            <div className={`data-row data-head${mode === "write" ? " is-one" : ""}`} role="row">
              <span role="columnheader">{colA}</span>
              {colB && <span role="columnheader">{colB}</span>}
              <span />
            </div>
            {rows.slice(0, shown).map((r) => (
              <div key={r.id} className={`data-row${mode === "write" ? " is-one" : ""}`} role="row">
                <input aria-label={colA} value={r.text} onChange={(e) => edit(r.id, { text: e.target.value })} inputMode={mode === "predict" ? "decimal" : undefined} />
                {colB && <input aria-label={colB} value={r.label} list={mode === "predict" ? undefined : "learn-labels"} onChange={(e) => edit(r.id, { label: e.target.value })} inputMode={mode === "predict" ? "decimal" : undefined} />}
                <button className="icon-btn icon-btn-sm danger-hover" aria-label={t("Remove")} onClick={() => remove(r.id)}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
        {rows.length > shown && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShown((n) => n + PAGE * 5)}>
            Show more ({rows.length - shown})
          </button>
        )}
      </section>
    </>
  );
}

/* ---------- Clean ---------- */

export function CleanStep({ project, update, issues }: StepProps & { issues: Issue[] }) {
  const [undo, setUndo] = useState<Row[][]>([]);
  const fix = issues.filter((i) => i.level === "fix");
  const think = issues.filter((i) => i.level === "think");
  const counts = useMemo(() => labelCounts(project.rows), [project.rows]);
  const flagged = new Set(issues.find((i) => i.kind === "outlier")?.rows || []);

  const apply = (fn: (rows: Row[]) => Row[]) => {
    setUndo((u) => [...u.slice(-9), project.rows]);
    update((p) => ({ ...p, rows: fn(p.rows) }));
  };
  const fixAll = () =>
    apply((rows) => {
      for (let n = 0; n < 30; n++) {
        const next = checkData(rows, project.mode).find((i) => i.level === "fix" && i.fixes.length);
        if (!next) break;
        rows = next.fixes[0].apply(rows);
      }
      return rows;
    });

  const say = !project.rows.length
    ? t("Nothing to check yet. Feed me first!")
    : fix.length
      ? tn(fix.length, "I found {n} problem in my food. Messy data makes a messy Zo.", "I found {n} problems in my food. Messy data makes a messy Zo.")
      : think.length
        ? t("No mistakes left. A few things are worth a think.")
        : t("Squeaky clean! I'm ready to learn.");

  return (
    <>
      <ZoGuide outfit="detective" pose={fix.length ? "stand" : "cheer"}>
        {say}
      </ZoGuide>

      <div className="clean-bar">
        <span className={`health ${fix.length ? "is-bad" : "is-good"}`}>
          <Icon name={fix.length ? "search" : "check"} size={18} />
          {fix.length ? t("{n} to fix", { n: fix.length }) : t("Nothing to fix")}
          {think.length > 0 && ` · ${t("{n} to think about", { n: think.length })}`}
        </span>
        <span className="spacer" />
        {undo.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => (update((p) => ({ ...p, rows: undo[undo.length - 1] })), setUndo((u) => u.slice(0, -1)))}>
            <Icon name="undo" size={16} /> {t("Undo")}
          </button>
        )}
        {fix.length > 1 && (
          <button className="btn btn-primary btn-sm" onClick={fixAll}>
            {t("Fix all")}
          </button>
        )}
      </div>

      <div className="issues">
        {[...fix, ...think].map((i) => (
          <article key={i.id} className={`card issue is-${i.level}`}>
            <h3>
              <span className="issue-tag">{i.level === "fix" ? t("Fix") : t("Think")}</span>
              {i.title}
            </h3>
            <p>{i.why}</p>
            {i.rows.length > 0 && (
              <details>
                <summary>{i.rows.length === 1 ? t("Show it") : t("Show them ({n})", { n: i.rows.length })}</summary>
                <ul className="issue-rows">
                  {project.rows
                    .filter((r) => i.rows.includes(r.id))
                    .slice(0, 12)
                    .map((r) => (
                      <li key={r.id}>
                        <span className="issue-text">{r.text.trim() ? r.text.replace(/ /g, "·") : <em>{t("(empty)")}</em>}</span>
                        {project.mode !== "write" && <span className="issue-label">{r.label.trim() ? r.label.replace(/ /g, "·") : <em>{t("(empty)")}</em>}</span>}
                      </li>
                    ))}
                </ul>
              </details>
            )}
            {i.fixes.length > 0 && (
              <div className="toolbar">
                {i.fixes.map((f, n) => (
                  <button key={f.label} className={`btn btn-sm ${n === 0 ? "btn-soft" : "btn-ghost"}`} onClick={() => apply(f.apply)}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {project.mode === "sort" && counts.length > 0 && <Bars title={t("Examples per label")} items={counts.map((c) => ({ label: c.label, value: c.n }))} />}
      {project.mode === "predict" && (
        <Scatter
          title={`${project.columns[1]} by ${project.columns[0]}`}
          xName={project.columns[0]}
          yName={project.columns[1]}
          dots={project.rows.filter((r) => isNumber(r.text) && isNumber(r.label)).map((r) => ({ x: toNumber(r.text), y: toNumber(r.label), slot: 1, flagged: flagged.has(r.id) }))}
        />
      )}
    </>
  );
}

/* ---------- Split ---------- */

export function SplitStep({ project, update, award }: StepProps) {
  const { train, test } = useMemo(() => splitOf(project), [project.rows, project.testShare, project.seed, project.mode]);
  useEffect(() => {
    if (test.length) award("split");
  }, [test.length, award]);
  const perLabel = useMemo(() => {
    if (project.mode !== "sort") return [];
    return labelCounts(project.rows).map((c) => ({ label: c.label, train: train.filter((r) => r.label.trim() === c.label).length, test: test.filter((r) => r.label.trim() === c.label).length }));
  }, [train, test, project.rows, project.mode]);
  const pct = Math.round(project.testShare * 100);

  return (
    <>
      <ZoGuide outfit="chef" pose="wave">
        {test.length
          ? t("I'll practise on {train} examples and keep {test} hidden for my test. No peeking!", { train: train.length, test: test.length })
          : t("I need more examples before I can keep some back for a test.")}
      </ZoGuide>

      <section className="card">
        <label className="field">
          <span className="field-label">
            {t("Kept for the test:")} <strong>{pct}%</strong>
          </span>
          <input type="range" min={10} max={50} step={5} value={pct} onChange={(e) => update((p) => ({ ...p, testShare: Number(e.target.value) / 100 }))} />
        </label>
        <Legend items={[{ name: `Practice · ${train.length}`, slot: 1, mark: "dot" }, { name: `Test · ${test.length}`, slot: 2, mark: "dot" }]} />
        <SplitStrip train={train.length} test={test.length} />
        <div className="toolbar">
          <button className="btn btn-ghost btn-sm" onClick={() => update((p) => ({ ...p, seed: Math.floor(seeded(p.seed)() * 1e9) }))}>
            <Icon name="shuffle" size={16} /> {t("Shuffle again")}
          </button>
        </div>
      </section>

      {perLabel.length > 0 && (
        <section className="card">
          <h2 className="card-title">{t("Each label in both sets")}</h2>
          <div className="viz-table-scroll">
            <table className="plain-table">
              <thead>
                <tr>
                  <th>{t("Label")}</th>
                  <th>{t("Practice")}</th>
                  <th>{t("Test")}</th>
                </tr>
              </thead>
              <tbody>
                {perLabel.map((l) => (
                  <tr key={l.label}>
                    <td>{l.label}</td>
                    <td>{l.train}</td>
                    <td>{l.test}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {project.mode === "predict" && (
        <Scatter
          title={t("Practice and test points")}
          xName={project.columns[0]}
          yName={project.columns[1]}
          dots={[...pointsOf(train).map((d) => ({ ...d, slot: 1 as const })), ...pointsOf(test).map((d) => ({ ...d, slot: 2 as const }))]}
        />
      )}

      {test.length > 0 && project.mode !== "predict" && (
        <details className="card test-list">
          <summary>{t("The test examples ({n})", { n: test.length })}</summary>
          <ul>
            {test.map((r) => (
              <li key={r.id}>
                {r.text}
                {project.mode !== "write" && <span className="pill">{r.label}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
