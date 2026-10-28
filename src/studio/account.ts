import { createAuthClient } from "better-auth/client";
import { useEffect, useState } from "react";
import { getLang, t } from "./i18n";
import { getName, setName } from "./role";

/**
 * The signed-in account (Google or Microsoft), from the Worker at /api/auth. The name and
 * email are also kept on this device, so the studio still knows who's here offline.
 */

export type Provider = "google" | "microsoft";
export type Account = { name: string; email: string };

const client = createAuthClient();
const KEY = "ds-account";
/** Set while away at Google or Microsoft, so the check on return knows to ask. */
const PENDING = "ds-account-pending";

const read = (): Account | null => {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "null");
    return a && typeof a.email === "string" ? { name: String(a.name || ""), email: a.email } : null;
  } catch {
    return null;
  }
};
const write = (a: Account | null) => {
  try {
    if (a) localStorage.setItem(KEY, JSON.stringify(a));
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode: it lasts until the tab closes */
  }
  window.dispatchEvent(new Event("accountchange"));
};

const pending = (on?: boolean) => {
  try {
    if (on === undefined) return sessionStorage.getItem(PENDING) === "1";
    if (on) sessionStorage.setItem(PENDING, "1");
    else sessionStorage.removeItem(PENDING);
  } catch {
    return true;
  }
  return on;
};

/**
 * Asks the server who's signed in, only on a device that is signed in or just came back
 * from signing in: everyone else's visits never reach the Worker. Offline (or the server
 * is down), the device's copy stands.
 */
let checking: Promise<void> | null = null;
export const refreshAccount = () => {
  if (!read() && !pending()) return Promise.resolve();
  return (checking ??= client
    .getSession()
    .then(({ data, error }) => {
      if (error) return;
      const u = data?.user;
      write(u ? { name: u.name, email: u.email } : null);
      if (u && !getName()) setName(u.name);
    })
    .catch(() => undefined)
    .finally(() => {
      checking = null;
      pending(false);
    }));
};

export const signIn = (provider: Provider, back = "#/") => {
  pending(true);
  return client.signIn.social({ provider, callbackURL: `/${back}`, errorCallbackURL: "/#/signin" }).then(({ error }) => {
    if (!error) return;
    pending(false);
    throw new Error(why(error.message, "Couldn't reach the sign-in server. Check your connection."));
  });
};

export const signOut = async () => {
  const { error } = await client.signOut();
  if (error && error.status) throw new Error(why(error.message, "Couldn't sign out."));
  write(null);
};

export const deleteAccount = async () => {
  const { error } = await client.deleteUser();
  if (error) throw new Error(why(error.message, "Couldn't delete the account. Sign in again, then try once more."));
  write(null);
};

/** The server's own message reads well in English; otherwise the translated fallback. */
const why = (message: string | undefined, fallback: string) => (message && getLang() === "en" ? message : t(fallback));

const MESSAGES: Record<string, string> = {
  access_denied: "Sign-in was cancelled.",
  account_not_linked: "That email already has an account through the other sign-in. Use that one.",
  email_not_found: "That account didn't share an email address. Try another account.",
};

/** After a failed sign-in the server comes back to /?error=…#/signin. Returns the message once, and tidies the address. */
export function takeSignInError(): string | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("error");
  if (!code) return null;
  history.replaceState(null, "", window.location.pathname + window.location.hash);
  return t(MESSAGES[code] || "Sign-in didn't work. Please try again.");
}

export function useAccount(): Account | null {
  const [account, setAccount] = useState(read);
  useEffect(() => {
    const on = () => setAccount(read());
    window.addEventListener("accountchange", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("accountchange", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return account;
}
