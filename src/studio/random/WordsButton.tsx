import { useState } from "react";
import type { Word } from "../../shared/types";
import { useApp } from "../store";
import { t, tc, tn } from "../i18n";
import { Field, Icon, Modal } from "../ui";
import { fetchWords, WORD_TOPICS } from "./sources";

/** Adds common words on a topic, with meanings, from an open dictionary service. */
export function WordsButton({ onAdd }: { onAdd: (w: Word[]) => void }) {
  const { toast } = useApp();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("animals");
  const [count, setCount] = useState(12);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Word[] | null>(null);
  const [error, setError] = useState("");

  const get = async () => {
    setBusy(true);
    setError("");
    try {
      const w = await fetchWords(topic.trim(), count);
      if (!w.length) throw new Error(t("No common words found for that topic. Try a simpler one."));
      setFound(w);
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : t("Couldn't reach the word service. Check the internet connection."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        <Icon name="dice" size={16} /> {t("Random words")}
      </button>
      {open && (
        <Modal
          title={tc("words", "Random words")}
          onClose={() => setOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={get} disabled={busy || !topic.trim()}>
                <Icon name="shuffle" size={18} /> {busy ? t("Getting…") : found ? t("Other words") : t("Get words")}
              </button>
              <span className="spacer" />
              <button
                type="button"
                className="btn btn-primary"
                disabled={!found?.length}
                onClick={() => {
                  onAdd(found!);
                  toast(tn(found!.length, "Added {n} word", "Added {n} words"));
                  setOpen(false);
                }}
              >
                {found?.length ? tn(found.length, "Add {n} word", "Add {n} words") : t("Add words")}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <Field label={tc("words", "Topic")}>
              <input list="word-topics-v" value={topic} onChange={(e) => (setTopic(e.target.value), setFound(null))} />
              <datalist id="word-topics-v">
                {WORD_TOPICS.map((topic) => (
                  <option key={topic} value={topic} />
                ))}
              </datalist>
            </Field>
            <Field label={t("How many")}>
              <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[8, 12, 20, 30].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </Field>
          </div>
          {error && <p className="form-error">{error}</p>}
          {found && (
            <div className="random-preview">
              <ol>
                {found.map((w) => (
                  <li key={w.word}>
                    <strong>{w.word}</strong>
                    <small>{w.meaning}</small>
                  </li>
                ))}
              </ol>
              <p className="muted">{t("From Datamuse; meanings from Wiktionary and WordNet. Check them before class.")}</p>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
