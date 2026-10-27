import { useRef, useState, type ReactNode } from "react";
import { chat, signIn } from "../ai/openrouter";
import { generatorPrompt, readGenerated, type GenerateRequest } from "../ai/prompts";
import { ModelPicker } from "../components/ModelPicker";
import { Field, Icon, Modal } from "../ui";
import { useAi } from "../useAi";

/* ---------- list helpers ---------- */

export const replaceAt = <T,>(list: T[], i: number, item: T) => list.map((x, j) => (j === i ? item : x));
export const removeAt = <T,>(list: T[], i: number) => list.filter((_, j) => j !== i);
export const move = <T,>(list: T[], i: number, by: number) => {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const out = list.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
};

/** Card around one item of a list, with move / copy / delete. */
export function ItemCard({
  index,
  count,
  head,
  children,
  onMove,
  onCopy,
  onDelete,
}: {
  index: number;
  count: number;
  head?: ReactNode;
  children: ReactNode;
  onMove: (by: number) => void;
  onCopy?: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="item-card">
      <div className="item-head">
        <span className="item-n">{index + 1}</span>
        {head}
        <span className="spacer" />
        <button type="button" className="icon-btn icon-btn-sm" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move up" title="Move up">
          <Icon name="up" size={18} />
        </button>
        <button type="button" className="icon-btn icon-btn-sm" disabled={index === count - 1} onClick={() => onMove(1)} aria-label="Move down" title="Move down">
          <Icon name="down" size={18} />
        </button>
        {onCopy && (
          <button type="button" className="icon-btn icon-btn-sm" onClick={onCopy} aria-label="Duplicate" title="Duplicate">
            <Icon name="copy" size={18} />
          </button>
        )}
        <button type="button" className="icon-btn icon-btn-sm danger-hover" onClick={onDelete} aria-label="Delete" title="Delete">
          <Icon name="trash" size={18} />
        </button>
      </div>
      <div className="item-body">{children}</div>
    </li>
  );
}

/** Comma-separated text ↔ list, without fighting the cursor while typing. */
export function ListInput({ value, onChange, placeholder, label }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; label: string }) {
  const [text, setText] = useState(value.join(", "));
  const last = useRef(value);
  if (last.current !== value && value.join(", ") !== text.split(",").map((s) => s.trim()).filter(Boolean).join(", ")) {
    last.current = value;
    setText(value.join(", "));
  }
  return (
    <input
      value={text}
      aria-label={label}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        const next = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
        last.current = next;
        onChange(next);
      }}
    />
  );
}

export function Section({ title, count, actions, children }: { title: string; count?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="card editor-section">
      <div className="section-bar">
        <h2 className="section-title">{title}</h2>
        {count && <span className="pill">{count}</span>}
        <span className="spacer" />
        {actions}
      </div>
      {children}
    </section>
  );
}

/* ---------- AI generation ---------- */

type Result = ReturnType<typeof readGenerated>;

export function GenerateButton({ request, onResult, label = "Generate" }: { request: Omit<GenerateRequest, "topic" | "level" | "count" | "language"> & Partial<GenerateRequest>; onResult: (r: Result) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-soft btn-sm" onClick={() => setOpen(true)}>
        <Icon name="sparkle" size={16} /> {label}
      </button>
      {open && <GenerateModal request={request} onClose={() => setOpen(false)} onResult={onResult} />}
    </>
  );
}

const LEVEL_KEY = "ds-gen-level";

function GenerateModal({ request, onClose, onResult }: { request: Partial<GenerateRequest> & Pick<GenerateRequest, "template">; onClose: () => void; onResult: (r: Result) => void }) {
  const ai = useAi();
  const reading = request.template === "reading";
  const [topic, setTopic] = useState(request.topic || "");
  const [level, setLevel] = useState(() => localStorage.getItem(LEVEL_KEY) || "");
  const [count, setCount] = useState(request.count || 10);
  const [language, setLanguage] = useState(request.language || "English");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const ctrl = useRef<AbortController | null>(null);

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      localStorage.setItem(LEVEL_KEY, level);
    } catch {
      /* ignore */
    }
    const req: GenerateRequest = { ...request, topic, level, count, language } as GenerateRequest;
    ctrl.current = new AbortController();
    try {
      const raw = await chat(
        [
          { role: "system", content: "You write accurate classroom content for teachers. Reply with JSON only." },
          { role: "user", content: generatorPrompt(req) },
        ],
        (t) => setProgress(t.length),
        ctrl.current.signal,
      );
      const result = readGenerated(req, raw);
      const n = (result.questions?.length || 0) + (result.items?.length || 0) + (result.words?.length || 0) + (result.glossary?.length || 0);
      if (!n) throw new Error("empty");
      onResult(result);
      onClose();
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message && (e as Error).message !== "empty" && !(e instanceof SyntaxError) ? (e as Error).message : "The model's answer couldn't be read. Try again or pick another model.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={reading ? "Questions from the text" : "Generate with AI"}
      onClose={() => {
        ctrl.current?.abort();
        onClose();
      }}
      footer={
        ai.connected ? (
          <>
            <ModelPicker />
            {busy && <span className="muted">Writing… {progress > 0 ? `${Math.round(progress / 100) / 10}k` : ""}</span>}
            <span className="spacer" />
            <button className="btn btn-primary" disabled={busy || (!reading && !topic.trim())} onClick={run}>
              <Icon name="sparkle" size={18} /> {busy ? "Generating…" : "Generate"}
            </button>
          </>
        ) : undefined
      }
    >
      {!ai.connected ? (
        <div className="connect-inline">
          <p>Connect OpenRouter to generate content. Free models are used by default.</p>
          <button className="btn btn-primary" onClick={() => signIn()}>
            Connect OpenRouter
          </button>
        </div>
      ) : (
        <>
          {!reading && (
            <Field label="Topic">
              <textarea rows={2} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Photosynthesis; parts of a plant" autoFocus />
            </Field>
          )}
          <div className="form-grid form-grid-3">
            <Field label="Class or age">
              <input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Class 6" />
            </Field>
            <Field label="How many">
              <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[5, 8, 10, 15, 20, 30].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </Field>
            <Field label="Language">
              <input value={language} onChange={(e) => setLanguage(e.target.value)} />
            </Field>
          </div>
          {error && <p className="form-error">{error}</p>}
        </>
      )}
    </Modal>
  );
}

/* ---------- paste a list ---------- */

export function PasteButton<T>({ placeholder, parse, onAdd }: { placeholder: string; parse: (line: string) => T | null; onAdd: (items: T[]) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const items = text.split("\n").map((l) => l.trim()).filter(Boolean).map(parse).filter((x): x is T => !!x);
  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        <Icon name="list" size={16} /> Paste list
      </button>
      {open && (
        <Modal
          title="Paste a list"
          onClose={() => setOpen(false)}
          wide
          footer={
            <>
              <span className="muted">{items.length} ready</span>
              <span className="spacer" />
              <button
                className="btn btn-primary"
                disabled={!items.length}
                onClick={() => {
                  onAdd(items);
                  setText("");
                  setOpen(false);
                }}
              >
                Add {items.length || ""}
              </button>
            </>
          }
        >
          <textarea className="mono" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} autoFocus aria-label="One per line" />
        </Modal>
      )}
    </>
  );
}

export const splitBars = (line: string) => line.split("|").map((s) => s.trim());
