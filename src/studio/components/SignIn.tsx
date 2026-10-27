import { useState } from "react";
import { signIn, useAccount, type Provider } from "../account";
import { ZoPic } from "../learn/Zo";
import { useApp } from "../store";

// Microsoft works too once its secrets are set on the Worker; add it back here then.
const PROVIDERS: { id: Provider; label: string }[] = [{ id: "google", label: "Continue with Google" }];

/** Google's and Microsoft's own marks, as their sign-in guidelines ask. */
function ProviderMark({ id }: { id: Provider }) {
  if (id === "google")
    return (
      <svg viewBox="0 0 48 48" width={20} height={20} aria-hidden>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 21 21" width={19} height={19} aria-hidden>
      <path fill="#F25022" d="M0 0h10v10H0z" />
      <path fill="#7FBA00" d="M11 0h10v10H11z" />
      <path fill="#00A4EF" d="M0 11h10v10H0z" />
      <path fill="#FFB900" d="M11 11h10v10H11z" />
    </svg>
  );
}

/** One button per provider. `back` is the studio page to come back to afterwards. */
export function SignInButtons({ back = "#/" }: { back?: string }) {
  const { toast } = useApp();
  const [busy, setBusy] = useState<Provider | null>(null);
  return (
    <div className="provider-buttons">
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          className="btn btn-ghost provider-btn"
          disabled={busy !== null}
          aria-busy={busy === p.id || undefined}
          onClick={() => {
            setBusy(p.id);
            signIn(p.id, back).catch((e: Error) => {
              setBusy(null);
              toast(e.message, "error");
            });
          }}
        >
          <ProviderMark id={p.id} />
          {p.label}
        </button>
      ))}
    </div>
  );
}

export function SignInPage() {
  const account = useAccount();
  return (
    <div className="page signin-page">
      <section className="card signin-card">
        <ZoPic outfit="zo" pose="wave" size={88} />
        {account ? (
          <>
            <h1>You're signed in</h1>
            <p className="muted">{account.email}</p>
            <div className="toolbar">
              <a className="btn btn-primary" href="#/">
                Start making
              </a>
              <a className="btn btn-ghost" href="#/settings">
                Account settings
              </a>
            </div>
          </>
        ) : (
          <>
            <h1>Sign in or create a free account</h1>
            <SignInButtons />
            <p className="signin-small">
              We keep your name and email, nothing else. <a href="#/privacy">Privacy</a> · <a href="#/terms">Terms</a>
            </p>
          </>
        )}
      </section>
    </div>
  );
}
