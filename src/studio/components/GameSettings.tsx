import type { CSSProperties } from "react";
import { TINTS } from "../../shared/normalize";
import type { Game, Settings, UiLang } from "../../shared/types";
import { PALETTE } from "../palette";
import { t } from "../i18n";
import { Field } from "../ui";

// Voice names are English; shown through t().
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
        <h2 className="section-title">{t("Look")}</h2>
        <Field label={t("Subtitle")}>
          <input value={game.subtitle || ""} placeholder={t("One line under the title")} onChange={(e) => onChange({ ...game, subtitle: e.target.value || undefined })} />
        </Field>
        <div className="field">
          <span className="field-label">{t("Colour")}</span>
          <div className="swatches" role="radiogroup" aria-label={t("Colour")}>
            {TINTS.map((tint) => (
              <button
                key={tint}
                type="button"
                role="radio"
                aria-checked={game.tint === tint}
                aria-label={t(tint)}
                className={`swatch${game.tint === tint ? " on" : ""}`}
                style={{ "--sw": PALETTE[tint].tint, "--sw-deep": PALETTE[tint].deep } as CSSProperties}
                onClick={() => onChange({ ...game, tint })}
              />
            ))}
          </div>
        </div>
      </section>

      {!custom && (
        <section className="card">
          <h2 className="section-title">{t("Rounds")}</h2>
          <div className="form-grid">
            <Field label={t("Questions per round")}>
              <input type="number" min={1} max={100} inputMode="numeric" value={s.round} onChange={(e) => set({ round: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })} />
            </Field>
            <Field label={t("Timer")}>
              <select value={s.timer} onChange={(e) => set({ timer: Number(e.target.value) })}>
                <option value={0}>{t("Off")}</option>
                {[5, 10, 15, 20, 30, 45, 60, 90, 120].map((n) => (
                  <option key={n} value={n}>
                    {t("{n} seconds", { n })}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("Hearts")}>
              <select value={s.lives} onChange={(e) => set({ lives: Number(e.target.value) })}>
                <option value={0}>{t("Unlimited")}</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {"♥".repeat(n)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("Answers shown")}>
              <select value={s.instant ? "now" : "end"} onChange={(e) => set({ instant: e.target.value === "now" })}>
                <option value="now">{t("After each question")}</option>
                <option value="end">{t("At the end")}</option>
              </select>
            </Field>
          </div>
          <label className="check">
            <input type="checkbox" checked={s.fresh} onChange={(e) => set({ fresh: e.target.checked })} />
            {t("Unseen questions first")}
          </label>
          <label className="check">
            <input type="checkbox" checked={s.sound} onChange={(e) => set({ sound: e.target.checked })} />
            {t("Sounds")}
          </label>
        </section>
      )}

      {!custom && (
        <section className="card">
          <h2 className="section-title">{t("Language")}</h2>
          <div className="form-grid">
            <Field label={t("Read-aloud voice")}>
              <select value={VOICES.some(([v]) => v === s.speech) ? s.speech : ""} onChange={(e) => set({ speech: e.target.value || s.speech })}>
                {!VOICES.some(([v]) => v === s.speech) && <option value="">{s.speech}</option>}
                {VOICES.map(([v, label]) => (
                  <option key={v} value={v}>
                    {t(label)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("Buttons")}>
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
