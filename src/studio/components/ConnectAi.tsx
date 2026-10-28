import { useState } from "react";
import { checkKey, KEYS_PAGE, setKey, signIn } from "../ai/openrouter";
import { t, tj } from "../i18n";
import { Icon } from "../ui";

/**
 * Connecting the free AI: sign in with OpenRouter, or, when their sign-in page won't
 * finish (it can stall on "Verifying your request" behind ad blockers, VPNs or strict
 * privacy settings), make a key there and paste it here.
 */
export function ConnectAi() {
  const [paste, setPaste] = useState(false);
  const [key, setKeyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const use = async () => {
    const k = key.trim();
    if (!k) return;
    setBusy(true);
    setError("");
    const r = await checkKey(k);
    setBusy(false);
    if (r === "ok") setKey(k);
    else setError(r);
  };

  return (
    <div className="connect-ai">
      <button className="btn btn-primary" onClick={() => signIn()}>
        <Icon name="sparkle" size={18} /> {t("Connect with OpenRouter")}
      </button>
      {!paste ? (
        <button className="link-btn" onClick={() => setPaste(true)}>
          {t("Stuck on “Verifying your request”? Use a key instead")}
        </button>
      ) : (
        <div className="connect-paste">
          <ol>
            <li>
              {tj("Open {page} and press {create}.", {
                page: (
                  <a href={KEYS_PAGE} target="_blank" rel="noopener">
                    openrouter.ai/settings/keys
                  </a>
                ),
                create: <strong>Create</strong>,
              })}
            </li>
            <li>{t("Copy the key and paste it here.")}</li>
          </ol>
          <form
            className="toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              void use();
            }}
          >
            <input className="grow" type="password" value={key} placeholder="sk-or-…" aria-label={t("OpenRouter key")} autoComplete="off" onChange={(e) => (setKeyText(e.target.value), setError(""))} />
            <button className="btn btn-primary btn-sm" disabled={busy || !key.trim()}>
              {busy ? t("Checking…") : t("Use key")}
            </button>
          </form>
          {error && <p className="form-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
