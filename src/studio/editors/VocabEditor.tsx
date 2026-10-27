import { VOCAB_MODES } from "../../shared/normalize";
import type { VocabGame, VocabMode, Word } from "../../shared/types";
import { WordsButton } from "../random/WordsButton";
import { Icon } from "../ui";
import { GenerateButton, PasteButton, removeAt, replaceAt, Section, splitBars } from "./common";

const MODE_LABEL: Record<VocabMode, string> = {
  meaning: "Meaning → word",
  word: "Word → meaning",
  gap: "Complete the sentence",
  spell: "Spell it",
  listen: "Listen",
  opposite: "Opposites",
  translate: "Translation",
  pairs: "Match pairs",
};

function parseLine(line: string): Word | null {
  const parts = line.includes("|") ? splitBars(line) : line.split(/\s+[-–—:=]\s+|\t/).map((s) => s.trim());
  const [word, meaning, example, emoji] = parts;
  return word && meaning ? { word, meaning, example: example || undefined, emoji: emoji || undefined } : null;
}

const hasWord = (w: Word) => !w.example || new RegExp(`(^|[^\\p{L}])${w.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "iu").test(w.example);

export function VocabEditor({ game, onChange }: { game: VocabGame; onChange: (g: VocabGame) => void }) {
  const words = game.words;
  const set = (i: number, w: Word) => onChange({ ...game, words: replaceAt(words, i, w) });
  const toggle = (m: VocabMode) => onChange({ ...game, modes: game.modes.includes(m) ? game.modes.filter((x) => x !== m) : [...game.modes, m] });
  const missing = (m: VocabMode) => (m === "opposite" && !words.some((w) => w.opposite)) || (m === "translate" && !words.some((w) => w.translation)) || (m === "gap" && !words.some((w) => w.example));

  return (
    <>
      <Section title="Activities">
        <div className="chips">
          {VOCAB_MODES.map((m) => (
            <button key={m} type="button" className={`chip-btn${game.modes.includes(m) ? " on" : ""}`} aria-pressed={game.modes.includes(m)} onClick={() => toggle(m)} title={missing(m) ? "Add the matching column to some words" : undefined}>
              {game.modes.includes(m) && <Icon name="check" size={16} />} {MODE_LABEL[m]}
              {game.modes.includes(m) && missing(m) && <span className="warn-dot" aria-label="needs data" />}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Words" count={`${words.length}`}>
        <div className="word-table" role="table" aria-label="Words">
          <div className="word-row word-row-head" role="row">
            <span role="columnheader">Emoji</span>
            <span role="columnheader">Word</span>
            <span role="columnheader">Meaning</span>
            <span role="columnheader">Example sentence</span>
            <span role="columnheader">Opposite</span>
            <span role="columnheader">Translation</span>
            <span />
          </div>
          {words.map((w, i) => (
            <div key={i} className="word-row" role="row">
              <input className="emoji-input" value={w.emoji || ""} placeholder="🙂" aria-label="Emoji" onChange={(e) => set(i, { ...w, emoji: e.target.value || undefined })} />
              <input value={w.word} placeholder="word" aria-label="Word" onChange={(e) => set(i, { ...w, word: e.target.value })} />
              <input value={w.meaning} placeholder="meaning" aria-label="Meaning" onChange={(e) => set(i, { ...w, meaning: e.target.value })} />
              <input value={w.example || ""} placeholder="sentence using the word" aria-label="Example" aria-invalid={!hasWord(w)} title={hasWord(w) ? undefined : "The sentence should contain the word exactly"} onChange={(e) => set(i, { ...w, example: e.target.value || undefined })} />
              <input value={w.opposite || ""} placeholder="—" aria-label="Opposite" onChange={(e) => set(i, { ...w, opposite: e.target.value || undefined })} />
              <input value={w.translation || ""} placeholder="—" aria-label="Translation" onChange={(e) => set(i, { ...w, translation: e.target.value || undefined })} />
              <button type="button" className="icon-btn icon-btn-sm" aria-label={`Remove ${w.word || "word"}`} onClick={() => onChange({ ...game, words: removeAt(words, i) })}>
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))}
        </div>
        <div className="add-row">
          <button type="button" className="chip-btn" onClick={() => onChange({ ...game, words: [...words, { word: "", meaning: "" }] })}>
            <Icon name="plus" size={16} /> Word
          </button>
          <span className="spacer" />
          <WordsButton onAdd={(add) => onChange({ ...game, words: [...words, ...add.filter((a) => !words.some((w) => w.word === a.word))] })} />
          <PasteButton placeholder={"brave - not afraid of danger\ngentle | kind and calm | The nurse was gentle with the baby. | 🤲"} parse={parseLine} onAdd={(add) => onChange({ ...game, words: [...words, ...add] })} />
          <GenerateButton request={{ template: "vocab" }} onResult={(r) => onChange({ ...game, words: [...words, ...(r.words || [])] })} />
        </div>
      </Section>
    </>
  );
}
