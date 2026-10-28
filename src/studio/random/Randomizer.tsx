import { useState } from "react";
import type { Question } from "../../shared/types";
import { useApp } from "../store";
import { getLang, t, tc, tn } from "../i18n";
import { Field, Icon, Modal } from "../ui";
import { COUNTRY_TOPICS, describe, fetchQuestions, REGIONS, TRIVIA_CATEGORIES, WORD_TOPICS, type CountryTopic, type Source } from "./sources";

const KEY = (id: string) => `ds-random-${id}`;

export const DEFAULT_SOURCE: Source = { kind: "countries", topic: "mixed", region: "" };

export function savedSource(gameId: string): Source | null {
  try {
    return JSON.parse(localStorage.getItem(KEY(gameId)) || "null");
  } catch {
    return null;
  }
}

function remember(gameId: string, src: Source) {
  try {
    localStorage.setItem(KEY(gameId), JSON.stringify(src));
  } catch {
    /* private mode */
  }
}

/** Where questions come from: trivia, countries or words, and the choices for each. */
export function SourcePicker({ value, onChange }: { value: Source; onChange: (s: Source) => void }) {
  return (
    <div className="source-picker">
      <div className="seg seg-small" role="radiogroup" aria-label={t("Kind of questions")}>
        {(
          [
            ["countries", "Countries", { kind: "countries", topic: "mixed", region: "" }],
            ["trivia", "Trivia", { kind: "trivia", category: 9, difficulty: "easy" }],
            ["words", "Words", { kind: "words", topic: "animals" }],
          ] as const
        ).map(([kind, label, fresh]) => (
          <button key={kind} type="button" className={value.kind === kind ? "on" : ""} aria-pressed={value.kind === kind} onClick={() => value.kind !== kind && onChange(fresh as Source)}>
            {t(label)}
          </button>
        ))}
      </div>
      {value.kind === "countries" && (
        <div className="form-grid">
          <Field label={t("Questions about")}>
            <select value={value.topic} onChange={(e) => onChange({ ...value, topic: e.target.value as CountryTopic })}>
              {COUNTRY_TOPICS.map(([topic, label]) => (
                <option key={topic} value={topic}>
                  {t(label)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("Part of the world")}>
            <select value={value.region} onChange={(e) => onChange({ ...value, region: e.target.value })}>
              <option value="">{t("Whole world")}</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {t(r)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
      {value.kind !== "countries" && getLang() === "fr" && <p className="muted">{t("These questions come in English.")}</p>}
      {value.kind === "trivia" && (
        <div className="form-grid">
          <Field label={t("Subject")}>
            <select value={value.category} onChange={(e) => onChange({ ...value, category: Number(e.target.value) })}>
              {TRIVIA_CATEGORIES.map(([id, label]) => (
                <option key={id} value={id}>
                  {t(label)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("Level")}>
            <select value={value.difficulty} onChange={(e) => onChange({ ...value, difficulty: e.target.value as typeof value.difficulty })}>
              <option value="easy">{t("easy")}</option>
              <option value="medium">{t("medium")}</option>
              <option value="hard">{t("hard")}</option>
              <option value="">{t("Any")}</option>
            </select>
          </Field>
        </div>
      )}
      {value.kind === "words" && (
        <Field label={tc("words", "Topic")}>
          <input list="word-topics" value={value.topic} onChange={(e) => onChange({ ...value, topic: e.target.value })} />
          <datalist id="word-topics">
            {WORD_TOPICS.map((topic) => (
              <option key={topic} value={topic} />
            ))}
          </datalist>
        </Field>
      )}
    </div>
  );
}

/**
 * "Randomizer" and "New set" for a question list. New set swaps the questions for a
 * fresh batch from the same source; the modal picks the source and whether to add or replace.
 */
export function RandomizerButtons({ gameId, questions, onChange }: { gameId: string; questions: Question[]; onChange: (q: Question[]) => void }) {
  const { toast } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const last = savedSource(gameId);

  const newSet = async () => {
    if (!last) return setOpen(true);
    setBusy(true);
    try {
      const got = await fetchQuestions(last, Math.max(10, Math.min(50, questions.length || 20)));
      onChange(got.questions);
      toast(got.offline ? t("No internet: made a set from saved words") : tn(got.questions.length, "New set: {n} question", "New set: {n} questions"));
    } catch (e) {
      toast(e instanceof Error && e.message !== "Failed to fetch" ? e.message : t("Couldn't reach the question service. Countries work offline."), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="btn btn-soft btn-sm" onClick={() => setOpen(true)}>
        <Icon name="dice" size={16} /> {t("Randomizer")}
      </button>
      {last && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={newSet} disabled={busy} title={describe(last)}>
          <Icon name="shuffle" size={16} /> {busy ? t("Getting…") : t("New set")}
        </button>
      )}
      {open && (
        <RandomizerModal
          gameId={gameId}
          onClose={() => setOpen(false)}
          onResult={(got, mode) => {
            onChange(mode === "add" ? [...questions, ...got] : got);
            toast(mode === "add" ? tn(got.length, "Added {n} question", "Added {n} questions") : tn(got.length, "New set: {n} question", "New set: {n} questions"));
          }}
        />
      )}
    </>
  );
}

function RandomizerModal({ gameId, onClose, onResult }: { gameId: string; onClose: () => void; onResult: (q: Question[], mode: "add" | "replace") => void }) {
  const [src, setSrc] = useState<Source>(() => savedSource(gameId) || DEFAULT_SOURCE);
  const [count, setCount] = useState(20);
  const [mode, setMode] = useState<"add" | "replace">("replace");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ questions: Question[]; credit: string; offline?: boolean } | null>(null);

  const get = async () => {
    setBusy(true);
    setError("");
    try {
      setPreview(await fetchQuestions(src, count));
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : t("Couldn't reach the question service. Countries work offline."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t("Randomizer")}
      wide
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={get} disabled={busy || (src.kind === "words" && !src.topic.trim())}>
            <Icon name="shuffle" size={18} /> {busy ? t("Getting…") : preview ? t("Another set") : t("Get questions")}
          </button>
          <span className="spacer" />
          <button
            type="button"
            className="btn btn-primary"
            disabled={!preview?.questions.length}
            onClick={() => {
              remember(gameId, src);
              onResult(preview!.questions, mode);
              onClose();
            }}
          >
            {mode === "add" ? t("Add") : t("Use this set")}
          </button>
        </>
      }
    >
      <SourcePicker value={src} onChange={(s) => (setSrc(s), setPreview(null))} />
      <div className="form-grid">
        <Field label={t("How many")}>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[10, 20, 30, 50].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </Field>
        <Field label={t("Your questions")}>
          <select value={mode} onChange={(e) => setMode(e.target.value as "add" | "replace")}>
            <option value="replace">{t("Replace them")}</option>
            <option value="add">{t("Keep them, add these")}</option>
          </select>
        </Field>
      </div>
      {error && <p className="form-error">{error}</p>}
      {preview && (
        <div className="random-preview">
          <ol>
            {preview.questions.slice(0, 6).map((q, i) => (
              <li key={i}>
                <strong>{q.q}</strong>
                <small>{q.type === "mcq" ? q.options[q.answer] : q.type === "tf" ? (q.answer ? t("True") : t("False")) : ""}</small>
              </li>
            ))}
          </ol>
          <p className="muted">
            {tn(preview.questions.length, "{n} question", "{n} questions")} · {preview.credit}
          </p>
        </div>
      )}
    </Modal>
  );
}
