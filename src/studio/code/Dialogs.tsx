import { useState, type ReactNode } from "react";
import type { ProcPart, ProcState } from "../../code/compiler";
import { uid } from "../../shared/random";
import { Field, Icon, Modal } from "../ui";
import { t } from "../i18n";

/** Every modal question the Game Lab asks, as promises. */

export type DialogRequest =
  | { kind: "prompt"; title: string; label: string; value: string; resolve: (v: string | null) => void }
  | { kind: "confirm"; title: string; text: string; resolve: (v: boolean) => void }
  | { kind: "variable"; list: boolean; stage: boolean; taken: string[]; resolve: (v: { name: string; global: boolean } | null) => void }
  | { kind: "procedure"; proc: ProcState | null; resolve: (v: ProcState | null) => void };

export function DialogHost({ request, done }: { request: DialogRequest | null; done: () => void }) {
  if (!request) return null;
  switch (request.kind) {
    case "prompt":
      return <PromptDialog r={request} done={done} />;
    case "confirm":
      return (
        <Modal
          title={request.title}
          onClose={() => (request.resolve(false), done())}
          footer={
            <>
              <span className="spacer" />
              <button className="btn btn-ghost" onClick={() => (request.resolve(false), done())}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => (request.resolve(true), done())}>
                OK
              </button>
            </>
          }
        >
          <p>{request.text}</p>
        </Modal>
      );
    case "variable":
      return <VariableDialog r={request} done={done} />;
    case "procedure":
      return <ProcedureDialog r={request} done={done} />;
  }
}

function PromptDialog({ r, done }: { r: Extract<DialogRequest, { kind: "prompt" }>; done: () => void }) {
  const [value, setValue] = useState(r.value);
  const ok = () => {
    r.resolve(value.trim() ? value.trim() : null);
    done();
  };
  return (
    <Modal
      title={r.title}
      onClose={() => (r.resolve(null), done())}
      footer={
        <>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => (r.resolve(null), done())}>
            {t("Cancel")}
          </button>
          <button className="btn btn-primary" disabled={!value.trim()} onClick={ok}>
            OK
          </button>
        </>
      }
    >
      <Field label={r.label}>
        <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && value.trim() && ok()} />
      </Field>
    </Modal>
  );
}

function VariableDialog({ r, done }: { r: Extract<DialogRequest, { kind: "variable" }>; done: () => void }) {
  const [name, setName] = useState("");
  const [global, setGlobal] = useState(true);
  const clash = r.taken.some((x) => x.toLowerCase() === name.trim().toLowerCase());
  const ok = () => {
    if (!name.trim() || clash) return;
    r.resolve({ name: name.trim(), global: r.stage || global });
    done();
  };
  return (
    <Modal
      title={r.list ? t("New list") : t("New memory box")}
      onClose={() => (r.resolve(null), done())}
      footer={
        <>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => (r.resolve(null), done())}>
            {t("Cancel")}
          </button>
          <button className="btn btn-primary" disabled={!name.trim() || clash} onClick={ok}>
            OK
          </button>
        </>
      }
    >
      <Field label={r.list ? t("List name") : t("Box name")}>
        <input autoFocus value={name} aria-invalid={clash} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ok()} />
      </Field>
      {clash && <p className="form-error">{t("That name is already used.")}</p>}
      {!r.stage && (
        <div className="seg" role="radiogroup" aria-label={t("Who can use it")}>
          <button className={global ? "on" : ""} aria-pressed={global} onClick={() => setGlobal(true)}>
            {t("Every character")}
          </button>
          <button className={!global ? "on" : ""} aria-pressed={!global} onClick={() => setGlobal(false)}>
            {t("Only this character")}
          </button>
        </div>
      )}
    </Modal>
  );
}

function ProcedureDialog({ r, done }: { r: Extract<DialogRequest, { kind: "procedure" }>; done: () => void }) {
  const [parts, setParts] = useState<ProcPart[]>(r.proc?.parts ?? [{ type: "label", text: t("trick name") }]);
  const [warp, setWarp] = useState(r.proc?.warp ?? false);
  const [reporter, setReporter] = useState(r.proc?.reporter ?? false);
  const set = (i: number, p: ProcPart) => setParts(parts.map((x, j) => (j === i ? p : x)));
  const add = (type: ProcPart["type"]) =>
    setParts([...parts, type === "label" ? { type, text: t("label text") } : { type, id: uid(), name: type === "bool" ? t("yes or no") : t("number or words") }]);
  const valid = parts.some((p) => (p.type === "label" ? p.text?.trim() : p.name?.trim()));
  const ok = () => {
    const clean = parts.filter((p) => (p.type === "label" ? p.text?.trim() : p.name?.trim()));
    r.resolve({ id: r.proc?.id ?? uid(), parts: clean, warp, reporter });
    done();
  };
  const preview: ReactNode[] = parts.map((p, i) =>
    p.type === "label" ? <span key={i}>{p.text}</span> : <span key={i} className={p.type === "bool" ? "pv-bool" : "pv-arg"}>{p.name}</span>,
  );
  return (
    <Modal
      title={r.proc ? t("Change trick") : t("New trick")}
      wide
      onClose={() => (r.resolve(null), done())}
      footer={
        <>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => (r.resolve(null), done())}>
            {t("Cancel")}
          </button>
          <button className="btn btn-primary" disabled={!valid} onClick={ok}>
            OK
          </button>
        </>
      }
    >
      <div className={`proc-preview${reporter ? " is-reporter" : ""}`} aria-hidden>
        {preview}
      </div>
      <ol className="proc-parts">
        {parts.map((p, i) => (
          <li key={i} className="proc-part">
            <span className={`pill proc-kind proc-${p.type}`}>{p.type === "label" ? t("words") : p.type === "bool" ? t("yes or no") : t("number or words")}</span>
            <input
              value={p.type === "label" ? p.text : p.name}
              aria-label={p.type === "label" ? t("Label text") : t("Input name")}
              onChange={(e) => set(i, p.type === "label" ? { ...p, text: e.target.value } : { ...p, name: e.target.value })}
            />
            <button className="icon-btn icon-btn-sm" disabled={parts.length < 2} aria-label={t("Remove")} onClick={() => setParts(parts.filter((_, j) => j !== i))}>
              <Icon name="trash" size={18} />
            </button>
          </li>
        ))}
      </ol>
      <div className="toolbar">
        <button className="chip-btn" onClick={() => add("num")}>
          <Icon name="plus" size={16} /> {t("Gap for a number or words")}
        </button>
        <button className="chip-btn" onClick={() => add("bool")}>
          <Icon name="plus" size={16} /> {t("Gap for yes or no")}
        </button>
        <button className="chip-btn" onClick={() => add("label")}>
          <Icon name="plus" size={16} /> {t("Words")}
        </button>
      </div>
      <label className="check">
        <input type="checkbox" checked={warp} onChange={(e) => setWarp(e.target.checked)} />
        {t("Do it all in one go")}
      </label>
      <label className="check">
        <input type="checkbox" checked={reporter} onChange={(e) => setReporter(e.target.checked)} />
        {t("Works something out (finish with “give back”)")}
      </label>
    </Modal>
  );
}
