import type { CustomGame } from "../../shared/types";
import { kb } from "../exporting";
import { Icon } from "../ui";
import { Section } from "./common";

export function CustomEditor({ game, onChange, onAsk }: { game: CustomGame; onChange: (g: CustomGame) => void; onAsk: () => void }) {
  return (
    <Section
      title="Game code"
      count={game.html ? kb(new Blob([game.html]).size) : undefined}
      actions={
        <button type="button" className="btn btn-soft btn-sm" onClick={onAsk}>
          <Icon name="sparkle" size={16} /> Ask the assistant
        </button>
      }
    >
      <textarea
        className="code"
        rows={24}
        spellCheck={false}
        value={game.html}
        placeholder="<!doctype html>…"
        aria-label="HTML"
        onChange={(e) => onChange({ ...game, html: e.target.value })}
      />
    </Section>
  );
}
