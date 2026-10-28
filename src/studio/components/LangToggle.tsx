import { LANGS, setLang, t, useLang } from "../i18n";

/** EN | FR. The whole studio (and new games) switch at once. */
export function LangToggle({ className = "" }: { className?: string }) {
  const lang = useLang();
  return (
    <div className={`lang-toggle ${className}`} role="group" aria-label={t("Language")}>
      {LANGS.map((l) => (
        <button key={l.id} type="button" lang={l.id} className={l.id === lang ? "on" : ""} aria-pressed={l.id === lang} title={l.name} aria-label={l.name} onClick={() => setLang(l.id)}>
          {l.short}
        </button>
      ))}
    </div>
  );
}
