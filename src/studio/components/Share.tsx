import { toCsv, toGift } from "../formats";
import qrcode from "qrcode-generator";
import { useEffect, useMemo, useState } from "react";
import type { Game } from "../../shared/types";
import { APP_ID_RE, defaultAppId } from "../apk/build";
import { gameApk } from "../apk/game";
import { loadStored } from "../apk/keys";
import { fingerprint } from "../apk/sign";
import { download, kb, linkFor, pageFor, slug } from "../exporting";
import { useApp } from "../store";
import { Field, Icon } from "../ui";

/** Longest link that still fits in a QR code phones can scan from a projector. */
const QR_LIMIT = 2300;

export function Share({ game, onChange }: { game: Game; onChange: (g: Game) => void }) {
  return (
    <div className="share-grid">
      <LinkCard game={game} />
      <FileCard game={game} />
      <ApkCard game={game} onChange={onChange} />
      <TeacherCard game={game} />
    </div>
  );
}

function LinkCard({ game }: { game: Game }) {
  const { toast } = useApp();
  const link = useMemo(() => linkFor(game), [game]);
  const [qr, setQr] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast("Link copied");
    } catch {
      toast("Couldn't copy. Select the link and copy it.", "error");
    }
  };
  return (
    <section className="card share-card">
      <header className="share-head">
        <span className="share-icon"><Icon name="link" size={22} /></span>
        <div>
          <h2>Link</h2>
          <p className="muted">Opens in any phone browser and keeps working offline after the first visit.</p>
        </div>
      </header>
      <input className="link-box" readOnly value={link} aria-label="Student link" onFocus={(e) => e.target.select()} />
      <div className="toolbar">
        <button className="btn btn-primary btn-sm" onClick={copy}>
          <Icon name="copy" size={16} /> Copy
        </button>
        {"share" in navigator && (
          <button className="btn btn-soft btn-sm" onClick={() => navigator.share({ title: game.title, text: `${game.emoji} ${game.title}`, url: link }).catch(() => undefined)}>
            <Icon name="share" size={16} /> Share
          </button>
        )}
        {link.length <= QR_LIMIT && (
          <button className="btn btn-ghost btn-sm" aria-pressed={qr} onClick={() => setQr(!qr)}>
            <Icon name="qr" size={16} /> QR code
          </button>
        )}
        <a className="btn btn-ghost btn-sm" href={link} target="_blank" rel="noreferrer">
          <Icon name="eye" size={16} /> Open
        </a>
      </div>
      {link.length > 8000 && <p className="note">This link is long ({Math.round(link.length / 1000)}k characters). Some chat apps cut long links; the file below always works.</p>}
      {qr && <Qr text={link} title={game.title} />}
    </section>
  );
}

function Qr({ text, title }: { text: string; title: string }) {
  const svg = useMemo(() => {
    const code = qrcode(0, "L");
    code.addData(text);
    code.make();
    const n = code.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (code.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 8} ${n + 8}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#1c1810"/></svg>`;
  }, [text]);
  return (
    <figure className="qr">
      <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={`QR code for ${title}`} />
      <figcaption>
        <button className="link-btn" onClick={() => download(`${slug(title)}-qr.svg`, svg, "image/svg+xml")}>
          Download QR
        </button>
      </figcaption>
    </figure>
  );
}

function FileCard({ game }: { game: Game }) {
  const page = useMemo(() => pageFor(game), [game]);
  return (
    <section className="card share-card">
      <header className="share-head">
        <span className="share-icon"><Icon name="file" size={22} /></span>
        <div>
          <h2>Offline file</h2>
          <p className="muted">One .html file. Send it by WhatsApp, Bluetooth or USB; it opens in the phone's browser with no internet.</p>
        </div>
      </header>
      <div className="toolbar">
        <button className="btn btn-primary btn-sm" onClick={() => download(`${slug(game.title)}.html`, page)}>
          <Icon name="download" size={16} /> Download .html
        </button>
        <span className="muted">{kb(new Blob([page]).size)}</span>
      </div>
    </section>
  );
}

function ApkCard({ game, onChange }: { game: Game; onChange: (g: Game) => void }) {
  const { toast } = useApp();
  const [name, setName] = useState(game.title);
  const [appId, setAppId] = useState(game.app?.id || defaultAppId(game));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [print, setPrint] = useState("");
  const [freshKey, setFreshKey] = useState(false);
  const next = (game.app?.versionCode || 0) + 1;
  const sameApp = game.app && game.app.id === appId;
  const validId = APP_ID_RE.test(appId);

  useEffect(() => {
    loadStored().then(async (s) => setPrint(s ? (await fingerprint(s.cert)).slice(0, 23) : ""));
  }, [busy]);

  const build = async () => {
    setBusy(true);
    setError("");
    try {
      const { blob, app, newKey } = await gameApk(game, { name, appId });
      download(`${slug(game.title)}-v${app.versionCode}.apk`, blob, "application/vnd.android.package-archive");
      onChange({ ...game, app });
      if (newKey) setFreshKey(true);
      toast(`App ready: ${kb(blob.size)}`);
    } catch (e) {
      setError((e as Error).message || "Couldn't build the app.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card share-card">
      <header className="share-head">
        <span className="share-icon"><Icon name="android" size={22} /></span>
        <div>
          <h2>Android app</h2>
          <p className="muted">A small installable app (about 100 KB) for Android 7 and newer. Students allow “install unknown apps” once.</p>
        </div>
      </header>
      <div className="form-grid">
        <Field label="App name">
          <input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="App id" hint={sameApp ? `Version ${next} updates installed copies.` : game.app ? "A new id installs as a separate app." : undefined}>
          <input value={appId} spellCheck={false} aria-invalid={!validId} onChange={(e) => setAppId(e.target.value.trim())} />
        </Field>
      </div>
      <div className="toolbar">
        <button className="btn btn-primary btn-sm" disabled={busy || !validId} onClick={build}>
          <Icon name="download" size={16} /> {busy ? "Building…" : sameApp ? `Build version ${next}` : "Build APK"}
        </button>
        {print && (
          <a className="muted key-print" href="#/settings" title="Signing key">
            <Icon name="key" size={16} /> {print}…
          </a>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
      {freshKey && (
        <p className="note">
          A signing key was made for your apps. <a href="#/settings">Back it up</a>: updates to these apps must be signed with the same key.
        </p>
      )}
    </section>
  );
}

function TeacherCard({ game }: { game: Game }) {
  const csv = toCsv(game);
  const giftText = toGift(game);
  return (
    <section className="card share-card is-quiet">
      <header className="share-head">
        <span className="share-icon"><Icon name="edit" size={22} /></span>
        <div>
          <h2>For other teachers</h2>
          <p className="muted">They can import the link or this file in their own studio and adapt it.</p>
        </div>
      </header>
      <div className="toolbar">
        <button className="btn btn-ghost btn-sm" onClick={() => download(`${slug(game.title)}.json`, JSON.stringify(game, null, 1), "application/json")}>
          <Icon name="download" size={16} /> Game file (.json)
        </button>
        {csv && (
          <button className="btn btn-ghost btn-sm" onClick={() => download(`${slug(game.title)}.csv`, csv, "text/csv")}>
            <Icon name="download" size={16} /> Spreadsheet (.csv)
          </button>
        )}
        {giftText && (
          <button className="btn btn-ghost btn-sm" onClick={() => download(`${slug(game.title)}.gift.txt`, giftText, "text/plain")} title="Moodle and other platforms that import GIFT">
            <Icon name="download" size={16} /> Moodle (GIFT)
          </button>
        )}
      </div>
    </section>
  );
}
