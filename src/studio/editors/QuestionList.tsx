import type { Question, QuestionType } from "../../shared/types";
import type { GenerateRequest } from "../ai/prompts";
import { Icon } from "../ui";
import { GenerateButton, ItemCard, ListInput, move, PasteButton, removeAt, replaceAt, splitBars } from "./common";

const TYPE_LABEL: Record<QuestionType, string> = {
  mcq: "Multiple choice",
  tf: "True / false",
  short: "Short answer",
  order: "Put in order",
  match: "Match pairs",
};

export function blankQuestion(type: QuestionType, from?: Question): Question {
  const q = from?.q || "";
  const explain = from?.explain;
  switch (type) {
    case "mcq": return { type, q, options: from?.type === "short" ? [from.accept[0] || "", "", "", ""] : ["", "", "", ""], answer: 0, explain };
    case "tf": return { type, q, answer: true, explain };
    case "short": return { type, q, accept: from?.type === "mcq" ? [from.options[from.answer] || ""].filter(Boolean) : [], explain };
    case "order": return { type, q, items: ["", "", ""], explain };
    case "match": return { type, q, pairs: [["", ""], ["", ""], ["", ""]], explain };
  }
}

/** "Question | right | wrong | wrong", "Statement | true", "Question | answer". */
export function parseQuestionLine(line: string): Question | null {
  const [q, ...rest] = splitBars(line);
  if (!q || !rest.length) return null;
  if (rest.length === 1 && /^(true|false|t|f|yes|no)$/i.test(rest[0])) return { type: "tf", q, answer: /^(true|t|yes)$/i.test(rest[0]) };
  if (rest.length === 1) return { type: "short", q, accept: rest[0].split("/").map((s) => s.trim()).filter(Boolean) };
  return { type: "mcq", q, options: rest, answer: 0 };
}

export function QuestionList({
  questions,
  onChange,
  generate,
}: {
  questions: Question[];
  onChange: (q: Question[]) => void;
  generate?: Omit<GenerateRequest, "topic" | "level" | "count" | "language"> & Partial<GenerateRequest>;
}) {
  const set = (i: number, q: Question) => onChange(replaceAt(questions, i, q));
  return (
    <div className="question-list">
      <ol className="items">
        {questions.map((q, i) => (
          <ItemCard
            key={i}
            index={i}
            count={questions.length}
            head={
              <select className="type-select" value={q.type} aria-label="Question type" onChange={(e) => set(i, blankQuestion(e.target.value as QuestionType, q))}>
                {(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            }
            onMove={(by) => onChange(move(questions, i, by))}
            onCopy={() => onChange([...questions.slice(0, i + 1), structuredClone(q), ...questions.slice(i + 1)])}
            onDelete={() => onChange(removeAt(questions, i))}
          >
            <QuestionFields q={q} onChange={(next) => set(i, next)} />
          </ItemCard>
        ))}
      </ol>
      <div className="add-row">
        {(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => (
          <button key={t} type="button" className="chip-btn" onClick={() => onChange([...questions, blankQuestion(t)])}>
            <Icon name="plus" size={16} /> {TYPE_LABEL[t]}
          </button>
        ))}
        <span className="spacer" />
        <PasteButton placeholder={"What is 7 × 8? | 56 | 54 | 48\nThe Sun is a star. | true\nCapital of Kenya? | Nairobi"} parse={parseQuestionLine} onAdd={(add) => onChange([...questions, ...add])} />
        {generate && <GenerateButton request={generate} onResult={(r) => onChange([...questions, ...(r.questions || [])])} />}
      </div>
    </div>
  );
}

function QuestionFields({ q, onChange }: { q: Question; onChange: (q: Question) => void }) {
  return (
    <>
      <textarea className="q-text" rows={2} value={q.q} placeholder={q.type === "tf" ? "Statement" : q.type === "order" || q.type === "match" ? "Instruction (optional)" : "Question"} aria-label="Question" onChange={(e) => onChange({ ...q, q: e.target.value })} />
      {q.type === "mcq" && (
        <div className="options">
          {q.options.map((o, j) => (
            <div key={j} className={`option-row${q.answer === j ? " is-right" : ""}`}>
              <button type="button" className="right-toggle" aria-pressed={q.answer === j} aria-label={`Option ${j + 1} is right`} title="Right answer" onClick={() => onChange({ ...q, answer: j })}>
                <Icon name="check" size={16} />
              </button>
              <input value={o} placeholder={q.answer === j ? "Right answer" : "Wrong answer"} aria-label={`Option ${j + 1}`} onChange={(e) => onChange({ ...q, options: replaceAt(q.options, j, e.target.value) })} />
              {q.options.length > 2 && (
                <button type="button" className="icon-btn icon-btn-sm" aria-label="Remove option" onClick={() => onChange({ ...q, options: removeAt(q.options, j), answer: q.answer > j ? q.answer - 1 : q.answer === j ? 0 : q.answer })}>
                  <Icon name="trash" size={16} />
                </button>
              )}
            </div>
          ))}
          {q.options.length < 6 && (
            <button type="button" className="link-btn" onClick={() => onChange({ ...q, options: [...q.options, ""] })}>
              + Option
            </button>
          )}
        </div>
      )}
      {q.type === "tf" && (
        <div className="seg seg-small" role="radiogroup" aria-label="Answer">
          <button type="button" className={q.answer ? "on" : ""} aria-pressed={q.answer} onClick={() => onChange({ ...q, answer: true })}>
            ✓ True
          </button>
          <button type="button" className={!q.answer ? "on" : ""} aria-pressed={!q.answer} onClick={() => onChange({ ...q, answer: false })}>
            ✗ False
          </button>
        </div>
      )}
      {q.type === "short" && <ListInput label="Accepted answers" value={q.accept} placeholder="Accepted answers, comma separated" onChange={(accept) => onChange({ ...q, accept })} />}
      {q.type === "order" && (
        <textarea rows={Math.max(3, q.items.length)} value={q.items.join("\n")} placeholder={"First\nSecond\nThird"} aria-label="Items in the right order, one per line" onChange={(e) => onChange({ ...q, items: e.target.value.split("\n") })} />
      )}
      {q.type === "match" && (
        <div className="pairs">
          {q.pairs.map(([a, b], j) => (
            <div key={j} className="pair-row">
              <input value={a} placeholder="Left" aria-label={`Pair ${j + 1} left`} onChange={(e) => onChange({ ...q, pairs: replaceAt(q.pairs, j, [e.target.value, b]) })} />
              <span aria-hidden>↔</span>
              <input value={b} placeholder="Right" aria-label={`Pair ${j + 1} right`} onChange={(e) => onChange({ ...q, pairs: replaceAt(q.pairs, j, [a, e.target.value]) })} />
              {q.pairs.length > 2 && (
                <button type="button" className="icon-btn icon-btn-sm" aria-label="Remove pair" onClick={() => onChange({ ...q, pairs: removeAt(q.pairs, j) })}>
                  <Icon name="trash" size={16} />
                </button>
              )}
            </div>
          ))}
          {q.pairs.length < 6 && (
            <button type="button" className="link-btn" onClick={() => onChange({ ...q, pairs: [...q.pairs, ["", ""]] })}>
              + Pair
            </button>
          )}
        </div>
      )}
      <input className="explain-input" value={q.explain || ""} placeholder="Explanation shown after answering (optional)" aria-label="Explanation" onChange={(e) => onChange({ ...q, explain: e.target.value || undefined })} />
    </>
  );
}
