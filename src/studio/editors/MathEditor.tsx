import { useMemo, useState } from "react";
import { generate, MATH_KINDS } from "../../shared/math";
import type { MathGame, MathKind, MathSet } from "../../shared/types";
import { t, tc } from "../i18n";
import { Icon } from "../ui";
import { removeAt, replaceAt, Section } from "./common";
import { QuestionList } from "./QuestionList";

const KINDS = Object.keys(MATH_KINDS) as MathKind[];

export function MathEditor({ game, onChange }: { game: MathGame; onChange: (g: MathGame) => void }) {
  const [seed, setSeed] = useState(0);
  const setSets = (sets: MathSet[]) => onChange({ ...game, sets });
  const samples = useMemo(() => {
    const active = game.sets.filter((s) => s.weight > 0);
    return active.length ? Array.from({ length: 6 }, (_, i) => ({ set: active[i % active.length], p: generate(active[i % active.length], game.settings.ui) })) : [];
  }, [game.sets, seed]);

  return (
    <>
      <Section
        title={t("Problem types")}
        count={t("{n} per round", { n: game.settings.round })}
        actions={
          <div className="seg seg-small" role="radiogroup" aria-label={t("How students answer")}>
            <button type="button" className={game.answer === "type" ? "on" : ""} aria-pressed={game.answer === "type"} onClick={() => onChange({ ...game, answer: "type" })}>
              {t("Number pad")}
            </button>
            <button type="button" className={game.answer === "choose" ? "on" : ""} aria-pressed={game.answer === "choose"} onClick={() => onChange({ ...game, answer: "choose" })}>
              {t("4 choices")}
            </button>
          </div>
        }
      >
        <ul className="math-sets">
          {game.sets.map((s, i) => {
            const meta = MATH_KINDS[s.kind];
            return (
              <li key={i} className="math-set">
                <label className="field math-kind">
                  <span className="field-label">{t("Type")}</span>
                  <select
                    value={s.kind}
                    onChange={(e) => {
                      const kind = e.target.value as MathKind;
                      const [min, max] = MATH_KINDS[kind].defaults;
                      setSets(replaceAt(game.sets, i, { ...s, kind, min, max }));
                    }}
                  >
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {t(MATH_KINDS[k].label)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">{t(meta.range[0])}</span>
                  <input type="number" inputMode="numeric" value={s.min} onChange={(e) => setSets(replaceAt(game.sets, i, { ...s, min: Number(e.target.value) }))} />
                </label>
                <label className="field">
                  <span className="field-label">{t(meta.range[1])}</span>
                  <input type="number" inputMode="numeric" value={s.max} onChange={(e) => setSets(replaceAt(game.sets, i, { ...s, max: Number(e.target.value) }))} />
                </label>
                <label className="field math-weight">
                  <span className="field-label">{tc("weight", "Share")}</span>
                  <input type="range" min={1} max={5} value={s.weight} onChange={(e) => setSets(replaceAt(game.sets, i, { ...s, weight: Number(e.target.value) }))} aria-valuetext={t("{n} of 5", { n: s.weight })} />
                </label>
                <button type="button" className="icon-btn icon-btn-sm" aria-label={t("Remove")} onClick={() => setSets(removeAt(game.sets, i))}>
                  <Icon name="trash" size={18} />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="add-row">
          <button type="button" className="chip-btn" onClick={() => setSets([...game.sets, { kind: "add", min: 1, max: 20, weight: 1 }])}>
            <Icon name="plus" size={16} /> {t("Problem type")}
          </button>
        </div>
        {samples.length > 0 && (
          <div className="samples">
            <div className="section-bar">
              <h3 className="sub-head">{t("Sample problems")}</h3>
              <span className="spacer" />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSeed((n) => n + 1)}>
                <Icon name="shuffle" size={16} /> {t("New samples")}
              </button>
            </div>
            <ul className="sample-list">
              {samples.map(({ p }, i) => (
                <li key={i}>
                  <span>{p.prompt}</span>
                  <strong>{game.settings.ui === "fr" ? p.answer.replace(".", ",") : p.answer}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>
      <Section title={t("Your own problems")} count={game.questions.length ? String(game.questions.length) : undefined}>
        <QuestionList questions={game.questions} onChange={(questions) => onChange({ ...game, questions })} generate={{ template: "math-questions" }} />
      </Section>
    </>
  );
}
