import type { CSSProperties } from "react";
import { TINTS } from "../../shared/normalize";
import type { Game, Settings, UiLang } from "../../shared/types";
import { PALETTE } from "../palette";
import { Field } from "../ui";

const VOICES: [string, string][] = [
  ["en-GB", "English (UK)"],
  ["en-US", "English (US)"],
  ["en-IN", "English (India)"],
  ["hi-IN", "Hindi"],
  ["bn-IN", "Bengali"],
  ["mr-IN", "Marathi"],
  ["ta-IN", "Tamil"],
  ["te-IN", "Telugu"],
  ["gu-IN", "Gujarati"],
  ["kn-IN", "Kannada"],
  ["ur-PK", "Urdu"],
  ["fr-FR", "French"],
  ["es-ES", "Spanish"],
  ["pt-BR", "Portuguese"],
  ["de-DE", "German"],
  ["ar", "Arabic"],
  ["sw-KE", "Swahili"],
  ["zh-CN", "Chinese"],
];

const UI: [UiLang, string][] = [
  ["en", "English"],
  ["hi", "हिन्दी"],
  ["fr", "Français"],
  ["es", "Español"],
];

export function GameSettings({ game, onChange }: { game: Game; onChange: (g: Game) => void }) {
  const s = game.settings;
  const set = (patch: Partial<Settings>) => onChange({ ...game, settings: { ...s, ...patch } });
  const custom = game.template === "custom";
  return (
    <div className="settings-grid">
      <section className="card">
        <h2 className="section-title">Look</h2>
        <Field label="Subtitle">
          <input value={game.subtitle || ""} placeholder="One line under the title" onChange={(e) => onChange({ ...game, subtitle: e.target.value || undefined })} />
        </Field>
        <div className="field">
          <span className="field-label">Colour</span>
          <div className="swatches" role="radiogroup" aria-label="Colour">
            {TINTS.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={game.tint === t}
                aria-label={t}
                className={`swatch${game.tint === t ? " on" : ""}`}
                style={{ "--sw": PALETTE[t].tint, "--sw-deep": PALETTE[t].deep } as CSSProperties}
                onClick={() => onChange({ ...game, tint: t })}
              />
            ))}
          </div>
        </div>
      </section>

      {!custom && (
        <section className="card">
          <h2 className="section-title">Rounds</h2>
          <div className="form-grid">
            <Field label="Questions per round">
              <input type="number" min={1} max={100} inputMode="numeric" value={s.round} onChange={(e) => set({ round: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })} />
            </Field>
            <Field label="Timer">
              <select value={s.timer} onChange={(e) => set({ timer: Number(e.target.value) })}>
                <option value={0}>Off</option>
                {[5, 10, 15, 20, 30, 45, 60, 90, 120].map((n) => (
                  <option key={n} value={n}>
                    {n} seconds
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hearts">
              <select value={s.lives} onChange={(e) => set({ lives: Number(e.target.value) })}>
                <option value={0}>Unlimited</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {"♥".repeat(n)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Answers shown">
              <select value={s.instant ? "now" : "end"} onChange={(e) => set({ instant: e.target.value === "now" })}>
                <option value="now">After each question</option>
                <option value="end">At the end</option>
              </select>
            </Field>
          </div>
          <label className="check">
            <input type="checkbox" checked={s.fresh} onChange={(e) => set({ fresh: e.target.checked })} />
            Unseen questions first
          </label>
          <label className="check">
            <input type="checkbox" checked={s.sound} onChange={(e) => set({ sound: e.target.checked })} />
            Sounds
          </label>
        </section>
      )}

      {!custom && (
        <section className="card">
          <h2 className="section-title">Language</h2>
          <div className="form-grid">
            <Field label="Read-aloud voice">
              <select value={VOICES.some(([v]) => v === s.speech) ? s.speech : ""} onChange={(e) => set({ speech: e.target.value || s.speech })}>
                {!VOICES.some(([v]) => v === s.speech) && <option value="">{s.speech}</option>}
                {VOICES.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Buttons">
              <select value={s.ui} onChange={(e) => set({ ui: e.target.value as UiLang })}>
                {UI.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>
      )}
    </div>
  );
}
