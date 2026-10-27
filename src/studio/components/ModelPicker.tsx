import { useEffect, useRef, useState } from "react";
import { DEFAULT_MODEL, listModels, modelName, setModel, type Model } from "../ai/openrouter";
import { Icon } from "../ui";
import { useAi } from "../useAi";

/** The model chip beside a message box: opens a searchable list upward, free models first. */
export function ModelPicker({ align = "left" }: { align?: "left" | "right" }) {
  const ai = useAi();
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<Model[] | null>(null);
  const [freeOnly, setFreeOnly] = useState(true);
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const chip = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || models) return;
    listModels().then(setModels, () => setModels([]));
  }, [open]);

  useEffect(() => {
    if (open) search.current?.focus();
    else setQuery("");
  }, [open]);

  const close = () => {
    setOpen(false);
    chip.current?.focus();
  };
  const pick = (id: string) => {
    setModel(id);
    close();
  };

  const q = query.trim().toLowerCase();
  const shown = (models || []).filter((m) => m.chat && (!freeOnly || m.free || m.id === ai.model) && (!q || `${m.name} ${m.id}`.toLowerCase().includes(q)));

  return (
    <div className="menu-wrap model-picker">
      <button
        ref={chip}
        type="button"
        className="model-chip"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Model"
        onClick={() => setOpen(!open)}
      >
        <Icon name="sparkle" size={16} />
        <span className="model-chip-name">{modelName(ai.model)}</span>
        <Icon name="down" size={14} />
      </button>
      {open && (
        <>
          <div className="menu-catch" onClick={close} />
          <div
            className={`menu model-menu${align === "left" ? " menu-left" : ""}`}
            role="menu"
            aria-label="Model"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                close();
              }
            }}
          >
            <div className="model-menu-head">
              <input ref={search} type="search" value={query} placeholder="Search models" aria-label="Search models" onChange={(e) => setQuery(e.target.value)} />
              <label className="check">
                <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
                Free only
              </label>
            </div>
            <div className="model-menu-list">
              {!q && <Option id={DEFAULT_MODEL} label="Best free models" note="recommended" on={ai.model === DEFAULT_MODEL} onPick={pick} />}
              {models === null && <p className="model-menu-note muted">Loading…</p>}
              {models !== null && !shown.length && <p className="model-menu-note muted">{models.length ? "No models match." : "Couldn't load the list."}</p>}
              {shown.map((m) => (
                <Option key={m.id} id={m.id} label={m.name.replace(/\s*\(free\)$/i, "")} note={m.free ? "free" : ""} on={ai.model === m.id} onPick={pick} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Option({ id, label, note, on, onPick }: { id: string; label: string; note: string; on: boolean; onPick: (id: string) => void }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={on} className={on ? "on" : ""} onClick={() => onPick(id)}>
      <span className="model-menu-check">{on && <Icon name="check" size={16} />}</span>
      <span className="grow">{label}</span>
      {note && <small>{note}</small>}
    </button>
  );
}
