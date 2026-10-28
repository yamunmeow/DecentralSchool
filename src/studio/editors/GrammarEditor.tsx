import { tokens } from "../../shared/tasks";
import type { GrammarGame, GrammarItem } from "../../shared/types";
import { t } from "../i18n";
import { Icon } from "../ui";
import { GenerateButton, ItemCard, ListInput, move, PasteButton, removeAt, replaceAt, Section, splitBars } from "./common";

type Kind = GrammarItem["type"];

// English; shown through t().
const KIND_LABEL: Record<Kind, string> = {
  fix: "Spot the mistake",
  gap: "Fill the gap",
  judge: "Right or wrong?",
  unscramble: "Unscramble",
};

function blank(type: Kind, from?: GrammarItem): GrammarItem {
  const text = from?.text || "";
  switch (type) {
    case "fix": return { type, text, wrong: "", right: "", options: [] };
    case "gap": return { type, text, options: ["", "", ""], answer: 0 };
    case "judge": return { type, text, correct: true };
    case "unscramble": return { type, text };
  }
}

/** "She go to school. | go | goes | going", "I ___ here. | am | is | are", "judge: …", or a plain sentence to unscramble. */
function parseLine(line: string): GrammarItem | null {
  const [text, ...rest] = splitBars(line);
  if (!text) return null;
  if (/_{2,}/.test(text) && rest.length >= 2) return { type: "gap", text, options: rest, answer: 0 };
  if (rest.length >= 2) return { type: "fix", text, wrong: rest[0], right: rest[1], options: rest.slice(2) };
  if (rest.length === 1 && /^(true|false|right|wrong|correct|incorrect|vrai|faux|juste|correcte?|incorrecte?)$/i.test(rest[0])) return { type: "judge", text, correct: /^(true|right|correct|vrai|juste|correcte?)$/i.test(rest[0]) };
  return { type: "unscramble", text };
}

export function GrammarEditor({ game, onChange }: { game: GrammarGame; onChange: (g: GrammarGame) => void }) {
  const items = game.items;
  const set = (i: number, it: GrammarItem) => onChange({ ...game, items: replaceAt(items, i, it) });
  return (
    <Section title={t("Sentences")} count={t("{all} · {round} per round", { all: items.length, round: Math.min(game.settings.round, items.length) })}>
      <ol className="items">
        {items.map((it, i) => (
          <ItemCard
            key={i}
            index={i}
            count={items.length}
            head={
              <select className="type-select" value={it.type} aria-label={t("Activity")} onChange={(e) => set(i, blank(e.target.value as Kind, it))}>
                {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                  <option key={k} value={k}>
                    {t(KIND_LABEL[k])}
                  </option>
                ))}
              </select>
            }
            onMove={(by) => onChange({ ...game, items: move(items, i, by) })}
            onCopy={() => onChange({ ...game, items: [...items.slice(0, i + 1), structuredClone(it), ...items.slice(i + 1)] })}
            onDelete={() => onChange({ ...game, items: removeAt(items, i) })}
          >
            <ItemFields it={it} onChange={(next) => set(i, next)} />
          </ItemCard>
        ))}
      </ol>
      <div className="add-row">
        {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
          <button key={k} type="button" className="chip-btn" onClick={() => onChange({ ...game, items: [...items, blank(k)] })}>
            <Icon name="plus" size={16} /> {t(KIND_LABEL[k])}
          </button>
        ))}
        <span className="spacer" />
        <PasteButton
          placeholder={t("She go to school. | go | goes | going\nI ___ a student. | am | is | are\nHe don't like rice. | wrong\nThe cat is sleeping on the mat.")}
          parse={parseLine}
          onAdd={(add) => onChange({ ...game, items: [...items, ...add] })}
        />
        <GenerateButton request={{ template: "grammar" }} onResult={(r) => onChange({ ...game, items: [...items, ...(r.items || [])] })} />
      </div>
    </Section>
  );
}

function ItemFields({ it, onChange }: { it: GrammarItem; onChange: (it: GrammarItem) => void }) {
  const sentence = (placeholder: string) => (
    <textarea className="q-text" rows={2} value={it.text} placeholder={placeholder} aria-label={t("Sentence")} onChange={(e) => onChange({ ...it, text: e.target.value })} />
  );
  switch (it.type) {
    case "fix": {
      const found = !it.wrong.trim() || tokens(it.text, it.wrong).at >= 0;
      return (
        <>
          {sentence(t("Sentence with one mistake"))}
          <div className="form-grid">
            <input value={it.wrong} placeholder={t("Wrong word(s)")} aria-label={t("Wrong word")} aria-invalid={!found} onChange={(e) => onChange({ ...it, wrong: e.target.value })} />
            <input value={it.right} placeholder={t("Correction")} aria-label={t("Correction")} onChange={(e) => onChange({ ...it, right: e.target.value })} />
          </div>
          {!found && <p className="form-error">{t("“{word}” isn't in the sentence.", { word: it.wrong })}</p>}
          <ListInput label={t("Other choices")} value={it.options || []} placeholder={t("Other wrong choices, comma separated (optional)")} onChange={(options) => onChange({ ...it, options })} />
          <Explain it={it} onChange={onChange} />
        </>
      );
    }
    case "gap":
      return (
        <>
          {sentence(t("Sentence with ___ for the gap"))}
          <div className="options">
            {it.options.map((o, j) => (
              <div key={j} className={`option-row${it.answer === j ? " is-right" : ""}`}>
                <button type="button" className="right-toggle" aria-pressed={it.answer === j} aria-label={t("Choice {n} is right", { n: j + 1 })} onClick={() => onChange({ ...it, answer: j })}>
                  <Icon name="check" size={16} />
                </button>
                <input value={o} placeholder={it.answer === j ? t("Right word") : t("Wrong word")} aria-label={t("Choice {n}", { n: j + 1 })} onChange={(e) => onChange({ ...it, options: replaceAt(it.options, j, e.target.value) })} />
                {it.options.length > 2 && (
                  <button type="button" className="icon-btn icon-btn-sm" aria-label={t("Remove choice")} onClick={() => onChange({ ...it, options: removeAt(it.options, j), answer: it.answer > j ? it.answer - 1 : it.answer === j ? 0 : it.answer })}>
                    <Icon name="trash" size={16} />
                  </button>
                )}
              </div>
            ))}
            {it.options.length < 5 && (
              <button type="button" className="link-btn" onClick={() => onChange({ ...it, options: [...it.options, ""] })}>
                + {t("Choice")}
              </button>
            )}
          </div>
          <Explain it={it} onChange={onChange} />
        </>
      );
    case "judge":
      return (
        <>
          {sentence(t("Sentence"))}
          <div className="seg seg-small" role="radiogroup" aria-label={t("Is it correct?")}>
            <button type="button" className={it.correct ? "on" : ""} aria-pressed={it.correct} onClick={() => onChange({ ...it, correct: true })}>
              ✓ {t("Correct")}
            </button>
            <button type="button" className={!it.correct ? "on" : ""} aria-pressed={!it.correct} onClick={() => onChange({ ...it, correct: false })}>
              ✗ {t("Has a mistake")}
            </button>
          </div>
          {!it.correct && <input value={it.fix || ""} placeholder={t("Corrected sentence")} aria-label={t("Corrected sentence")} onChange={(e) => onChange({ ...it, fix: e.target.value || undefined })} />}
          <Explain it={it} onChange={onChange} />
        </>
      );
    case "unscramble":
      return sentence(t("A correct sentence; students rebuild it from shuffled words"));
  }
}

function Explain({ it, onChange }: { it: GrammarItem; onChange: (it: GrammarItem) => void }) {
  return <input className="explain-input" value={it.explain || ""} placeholder={t("Explanation shown after answering (optional)")} aria-label={t("Explanation")} onChange={(e) => onChange({ ...it, explain: e.target.value || undefined })} />;
}
