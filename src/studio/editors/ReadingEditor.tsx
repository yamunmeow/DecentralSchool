import { useRef, useState } from "react";
import { READING_ACTIVITIES } from "../../shared/normalize";
import type { Passage, ReadingActivity, ReadingGame } from "../../shared/types";
import { ACCEPT_TEXT, splitPassages, textFromFile, wordCount } from "../importText";
import { useApp } from "../store";
import { Field, Icon, Modal } from "../ui";
import { GenerateButton, move, removeAt, replaceAt, Section } from "./common";
import { QuestionList } from "./QuestionList";

const ACTIVITY_LABEL: Record<ReadingActivity, string> = {
  questions: "Your questions",
  cloze: "Fill the gaps",
  sequence: "Order the sentences",
  truefalse: "Did the text say it?",
  glossary: "Glossary words",
};

export function ReadingEditor({ game, onChange }: { game: ReadingGame; onChange: (g: ReadingGame) => void }) {
  const { toast } = useApp();
  const passages = game.passages;
  const [open, setOpen] = useState(0);
  const [pending, setPending] = useState<{ title: string; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const setP = (i: number, p: Passage) => onChange({ ...game, passages: replaceAt(passages, i, p) });
  const add = (list: Passage[]) => {
    onChange({ ...game, passages: [...passages, ...list] });
    setOpen(passages.length);
  };
  const toggle = (a: ReadingActivity) => onChange({ ...game, activities: game.activities.includes(a) ? game.activities.filter((x) => x !== a) : [...game.activities, a] });

  const upload = async (f: File) => {
    try {
      const text = (await textFromFile(f)).trim();
      if (!text) throw new Error();
      const title = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
      if (wordCount(text) > 450) setPending({ title, text });
      else add(splitPassages(title, text, Infinity));
    } catch {
      toast(`Couldn't read text from ${f.name}`, "error");
    }
  };

  return (
    <>
      <Section title="Activities">
        <div className="chips">
          {READING_ACTIVITIES.map((a) => (
            <button key={a} type="button" className={`chip-btn${game.activities.includes(a) ? " on" : ""}`} aria-pressed={game.activities.includes(a)} onClick={() => toggle(a)}>
              {game.activities.includes(a) && <Icon name="check" size={16} />} {ACTIVITY_LABEL[a]}
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Texts"
        count={passages.length > 1 ? `${passages.length} · one per round` : undefined}
        actions={
          <>
            <button type="button" className="btn btn-soft btn-sm" onClick={() => file.current?.click()}>
              <Icon name="upload" size={16} /> Upload
            </button>
            <input
              ref={file}
              type="file"
              accept={ACCEPT_TEXT}
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = "";
              }}
            />
          </>
        }
      >
        <ol className="passages">
          {passages.map((p, i) => (
            <li key={i} className={`passage-card${open === i ? " is-open" : ""}`}>
              <div className="passage-head">
                <button type="button" className="passage-toggle" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                  <Icon name="book" />
                  <strong>{p.title || `Text ${i + 1}`}</strong>
                  <small>
                    {wordCount(p.text)} words · {p.questions.length} questions
                  </small>
                </button>
                <button type="button" className="icon-btn icon-btn-sm" disabled={i === 0} aria-label="Move up" onClick={() => onChange({ ...game, passages: move(passages, i, -1) })}>
                  <Icon name="up" size={18} />
                </button>
                <button type="button" className="icon-btn icon-btn-sm" aria-label="Delete text" onClick={() => onChange({ ...game, passages: removeAt(passages, i) })}>
                  <Icon name="trash" size={18} />
                </button>
              </div>
              {open === i && (
                <div className="passage-body">
                  <Field label="Title">
                    <input value={p.title} onChange={(e) => setP(i, { ...p, title: e.target.value })} />
                  </Field>
                  <Field label="Text">
                    <textarea rows={12} value={p.text} placeholder="Paste or type the text. Leave a blank line between paragraphs." onChange={(e) => setP(i, { ...p, text: e.target.value })} />
                  </Field>
                  <div className="section-bar">
                    <h3 className="sub-head">Questions</h3>
                    <span className="spacer" />
                    <GenerateButton
                      label="Questions from text"
                      request={{ template: "reading", passage: p, topic: p.title, count: 8 }}
                      onResult={(r) => setP(i, { ...p, questions: [...p.questions, ...(r.questions || [])], glossary: [...p.glossary, ...(r.glossary || []).filter((g) => !p.glossary.some((x) => x.word === g.word))] })}
                    />
                  </div>
                  <QuestionList questions={p.questions} onChange={(questions) => setP(i, { ...p, questions })} />
                  <h3 className="sub-head">Glossary</h3>
                  <div className="glossary">
                    {p.glossary.map((w, j) => (
                      <div key={j} className="pair-row">
                        <input value={w.word} placeholder="word" aria-label="Word" onChange={(e) => setP(i, { ...p, glossary: replaceAt(p.glossary, j, { ...w, word: e.target.value }) })} />
                        <input value={w.meaning} placeholder="meaning" aria-label="Meaning" onChange={(e) => setP(i, { ...p, glossary: replaceAt(p.glossary, j, { ...w, meaning: e.target.value }) })} />
                        <button type="button" className="icon-btn icon-btn-sm" aria-label="Remove word" onClick={() => setP(i, { ...p, glossary: removeAt(p.glossary, j) })}>
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="link-btn" onClick={() => setP(i, { ...p, glossary: [...p.glossary, { word: "", meaning: "" }] })}>
                      + Word
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
        <div className="add-row">
          <button type="button" className="chip-btn" onClick={() => add([{ title: "", text: "", questions: [], glossary: [] }])}>
            <Icon name="plus" size={16} /> Text
          </button>
        </div>
      </Section>

      {pending && <SplitModal pending={pending} onClose={() => setPending(null)} onAdd={(list) => (add(list), setPending(null))} />}
    </>
  );
}

function SplitModal({ pending, onClose, onAdd }: { pending: { title: string; text: string }; onClose: () => void; onAdd: (p: Passage[]) => void }) {
  const [size, setSize] = useState(300);
  const parts = splitPassages(pending.title, pending.text, size);
  return (
    <Modal
      title="A long text"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => onAdd(splitPassages(pending.title, pending.text, Infinity))}>
            Keep as one text
          </button>
          <span className="spacer" />
          <button className="btn btn-primary" onClick={() => onAdd(parts)}>
            Split into {parts.length}
          </button>
        </>
      }
    >
      <p>
        {wordCount(pending.text)} words. Shorter parts suit small screens, and each round picks a different part.
      </p>
      <Field label="Words per part">
        <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
          {[150, 200, 300, 400, 600].map((n) => (
            <option key={n} value={n}>
              about {n}
            </option>
          ))}
        </select>
      </Field>
    </Modal>
  );
}
