import { useEffect, useRef, useState } from "react";
import { deleteAccount, signOut, useAccount } from "../account";
import { DEFAULT_MODEL, listModels, setKey, setModel, type Model } from "../ai/openrouter";
import { ConnectAi } from "../components/ConnectAi";
import { SignInButtons } from "../components/SignIn";
import { exportKeyFile, importKeyFile, loadStored, newSigningKey } from "../apk/keys";
import { fingerprint } from "../apk/sign";
import { download } from "../exporting";
import { backup, forImport, gamesFromText } from "../gameio";
import { setName, setRole, useRole } from "../role";
import { useApp } from "../store";
import { Field, Icon, Modal } from "../ui";
import { useAi } from "../useAi";

export function Settings() {
  const { role } = useRole();
  return (
    <div className="page settings-page">
      <div className="page-head">
        <h1>Settings</h1>
      </div>
      <AccountCard />
      <YouCard />
      {role === "teacher" && <AiCard />}
      <KeyCard />
      <DataCard />
    </div>
  );
}

function AccountCard() {
  const account = useAccount();
  const { toast } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const act = (fn: () => Promise<void>, done: string) => {
    setBusy(true);
    fn().then(
      () => {
        setConfirm(false);
        toast(done);
      },
      (e: Error) => toast(e.message, "error"),
    ).finally(() => setBusy(false));
  };

  return (
    <section className="card" id="account">
      <div className="section-bar">
        <h2 className="section-title">Account</h2>
        <span className={`status-chip${account ? " on" : ""}`}>{account ? "Signed in" : "Not signed in"}</span>
      </div>
      {account ? (
        <>
          <p className="account-who">
            <strong>{account.name}</strong>
            <span className="muted">{account.email}</span>
          </p>
          <div className="toolbar">
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act(signOut, "Signed out")}>
              Sign out
            </button>
            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => setConfirm(true)}>
              <Icon name="trash" size={16} /> Delete account
            </button>
            <a className="btn btn-ghost btn-sm" href="#/privacy">
              Privacy
            </a>
          </div>
        </>
      ) : (
        <SignInButtons back="#/settings" />
      )}
      {confirm && (
        <Modal
          title="Delete your account?"
          onClose={() => setConfirm(false)}
          footer={
            <>
              <span className="spacer" />
              <button className="btn btn-ghost" onClick={() => setConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" disabled={busy} onClick={() => act(deleteAccount, "Account deleted")}>
                Delete account
              </button>
            </>
          }
        >
          <p>Your name and email are removed from our server. Games and class work on this device stay.</p>
        </Modal>
      )}
    </section>
  );
}

function YouCard() {
  const { role, name } = useRole();
  const [text, setText] = useState(name);
  // Signing in can fill the name in after this card has opened.
  useEffect(() => setText(name), [name]);
  return (
    <section className="card">
      <h2 className="section-title">You</h2>
      <div className="seg" role="radiogroup" aria-label="I'm a">
        <button className={role === "student" ? "on" : ""} aria-pressed={role === "student"} onClick={() => setRole("student")}>
          Student
        </button>
        <button className={role === "teacher" ? "on" : ""} aria-pressed={role === "teacher"} onClick={() => setRole("teacher")}>
          Teacher
        </button>
      </div>
      <Field label="Name on hand-ins and feedback">
        <input value={text} onChange={(e) => setText(e.target.value)} onBlur={() => setName(text)} />
      </Field>
    </section>
  );
}

function AiCard() {
  const ai = useAi();
  const [models, setModels] = useState<Model[] | null>(null);
  const [freeOnly, setFreeOnly] = useState(true);

  useEffect(() => {
    listModels().then(setModels, () => setModels([]));
  }, []);

  const shown = (models || []).filter((m) => m.chat && (!freeOnly || m.free || m.id === ai.model));
  return (
    <section className="card">
      <div className="section-bar">
        <h2 className="section-title">AI assistant</h2>
        <span className={`status-chip${ai.connected ? " on" : ""}`}>{ai.connected ? "Connected" : "Not connected"}</span>
      </div>
      {ai.connected ? (
        <>
          <div className="form-grid">
            <Field label="Model">
              <select value={ai.model} onChange={(e) => setModel(e.target.value)}>
                <option value={DEFAULT_MODEL}>Best free models, picked for you (recommended)</option>
                {models === null && <option>Loading…</option>}
                {shown.map((m) => (
                  <option key={m.id} value={m.id}>
                    {`${m.name}${m.free ? " · free" : ""}`}
                  </option>
                ))}
              </select>
            </Field>
            <label className="check field-check">
              <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
              Free models only
            </label>
          </div>
          <div className="toolbar">
            <a className="btn btn-ghost btn-sm" href="https://openrouter.ai/settings/keys" target="_blank" rel="noreferrer">
              OpenRouter account
            </a>
            <button className="btn btn-danger btn-sm" onClick={() => setKey(null)}>
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="muted">Sign in with OpenRouter. Free models are used by default, and your key stays in this browser.</p>
          <ConnectAi />
        </>
      )}
    </section>
  );
}

function KeyCard() {
  const { toast } = useApp();
  const [print, setPrint] = useState<string | null>(null);
  const [created, setCreated] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const refresh = () =>
    loadStored().then(async (s) => {
      setPrint(s ? await fingerprint(s.cert) : "");
      setCreated(s?.created || 0);
    });
  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="card">
      <div className="section-bar">
        <h2 className="section-title">App signing key</h2>
      </div>
      {print === null ? null : print ? (
        <>
          <p className="muted">Phones only accept an update to an app if it is signed with the same key. Keep a backup somewhere safe.</p>
          <p className="fingerprint" title="SHA-256 fingerprint">
            <Icon name="key" size={18} /> <code>{print}</code>
          </p>
          {created > 0 && <p className="muted">Made {new Date(created).toLocaleDateString()}</p>}
        </>
      ) : (
        <p className="muted">Made automatically when you build your first app.</p>
      )}
      <div className="toolbar">
        {print && (
          <button
            className="btn btn-primary btn-sm"
            onClick={async () => {
              const blob = await exportKeyFile();
              if (blob) download("decentralschool-signing-key.json", blob, "application/json");
            }}
          >
            <Icon name="download" size={16} /> Back up key
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => file.current?.click()}>
          <Icon name="upload" size={16} /> Restore from backup
        </button>
        {print && (
          <button className="btn btn-danger btn-sm" onClick={() => setConfirm(true)}>
            New key
          </button>
        )}
        <input
          ref={file}
          type="file"
          accept=".json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              await importKeyFile(f);
              toast("Signing key restored");
              refresh();
            } catch (err) {
              toast((err as Error).message, "error");
            }
          }}
        />
      </div>
      {confirm && (
        <Modal
          title="Make a new key?"
          onClose={() => setConfirm(false)}
          footer={
            <>
              <span className="spacer" />
              <button className="btn btn-ghost" onClick={() => setConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  await newSigningKey();
                  setConfirm(false);
                  refresh();
                  toast("New signing key made");
                }}
              >
                Make a new key
              </button>
            </>
          }
        >
          <p>Apps already on students' phones can't be updated with a new key; they would have to uninstall them first.</p>
        </Modal>
      )}
    </section>
  );
}

function DataCard() {
  const { games, save, byId, toast } = useApp();
  const file = useRef<HTMLInputElement>(null);
  return (
    <section className="card">
      <div className="section-bar">
        <h2 className="section-title">Your games</h2>
        <span className="pill">{games.length}</span>
      </div>
      <p className="muted">Games are saved in this browser only. Back them up to move to another computer.</p>
      <div className="toolbar">
        <button className="btn btn-primary btn-sm" disabled={!games.length} onClick={() => download(`decentralschool-${new Date().toISOString().slice(0, 10)}.json`, backup(games), "application/json")}>
          <Icon name="download" size={16} /> Back up all games
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => file.current?.click()}>
          <Icon name="upload" size={16} /> Restore
        </button>
        <input
          ref={file}
          type="file"
          accept=".json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              const found = gamesFromText(await f.text());
              for (const g of found) await save(byId(g.id) ? { ...g, updated: Date.now() } : forImport(g, () => false));
              toast(`Restored ${found.length} game${found.length === 1 ? "" : "s"}`);
            } catch {
              toast("That file isn't a games backup.", "error");
            }
          }}
        />
      </div>
    </section>
  );
}
