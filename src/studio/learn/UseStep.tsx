import learnRuntime from "virtual:learn-runtime";
import { useMemo, useState } from "react";
import { zoSvg } from "../../code/art/zo";
import { BADGES } from "../../learn/concepts";
import { stale, usableRows } from "../../learn/project";
import type { LearnApp, LearnProject } from "../../learn/types";
import { buildLearnPage } from "../../shared/page";
import { APP_ID_RE, buildApk, makeIconFromSvg } from "../apk/build";
import { getSigningKey } from "../apk/keys";
import { download, kb, slug } from "../exporting";
import { useApp } from "../store";
import { Icon } from "../ui";
import type { StepProps } from "./LearnPage";
import { ZoGuide, ZoPic } from "./Zo";

type Result = { value: number; text: string; pass: boolean } | null;

const SCORE_NAME = { sort: "Right on the test", reply: "Right on the test", predict: "Spread explained", write: "Less surprised than blind guessing" };

export function appOf(p: LearnProject, result: Result): LearnApp | null {
  if (!p.model) return null;
  return {
    kind: "learn-app",
    title: p.title,
    mode: p.mode,
    model: p.model,
    card: p.card,
    columns: p.columns,
    facts: { examples: p.trainedOn?.rows ?? usableRows(p.rows, p.mode).length, score: result?.text, scoreName: SCORE_NAME[p.mode], pass: !!result?.pass, trained: p.runs[0]?.at ?? Date.now() },
  };
}

export function UseStep({ project, update, award, result }: StepProps & { result: Result }) {
  const { toast } = useApp();
  const [busy, setBusy] = useState(false);
  const app = useMemo(() => appOf(project, result), [project.model, project.card, project.title, result]);
  const page = useMemo(() => (app ? buildLearnPage(learnRuntime, app) : ""), [app]);
  const set = (k: keyof LearnProject["card"], v: string) => update((p) => ({ ...p, card: { ...p.card, [k]: v } }));
  const appId = `org.decentralschool.zo.m${project.id.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;

  const apk = async () => {
    setBusy(true);
    try {
      if (!APP_ID_RE.test(appId)) throw new Error("Bad app id");
      const key = `ds-apk-${project.id}`;
      const versionCode = Number(localStorage.getItem(key) || 0) + 1;
      const icon = await makeIconFromSvg(zoSvg(result?.pass ? "graduate" : "robot", "wave"));
      const blob = await buildApk(icon, page, { id: appId, name: project.title.slice(0, 30) || "Zo", version: `1.${versionCode}`, versionCode }, await getSigningKey());
      download(`${slug(project.title)}-v${versionCode}.apk`, blob, "application/vnd.android.package-archive");
      localStorage.setItem(key, String(versionCode));
      award("shipped");
      toast(`App ready: ${kb(blob.size)}`);
    } catch (e) {
      toast((e as Error).message || "Couldn't build the app.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ZoGuide outfit={result?.pass ? "graduate" : "robot"} pose="wave">
        {!project.model
          ? "Train me first, then I can go out into the world."
          : result?.pass
            ? "I graduated! Fill in my card so people know what I'm good at, then save me as an app."
            : "I'm not great yet, but you can still share me. Be honest on my card about what I get wrong."}
      </ZoGuide>

      <section className="card model-card">
        <h2 className="card-title">Model card</h2>
        <label className="field">
          <span className="field-label">Made by</span>
          <input value={project.card.by} onChange={(e) => set("by", e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Good at</span>
          <textarea rows={2} value={project.card.goodAt} onChange={(e) => set("goodAt", e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Not good at</span>
          <textarea rows={2} value={project.card.badAt} onChange={(e) => set("badAt", e.target.value)} />
        </label>
        <dl className="card-facts">
          <dt>Learned from</dt>
          <dd>{app?.facts.examples ?? usableRows(project.rows, project.mode).length} examples</dd>
          {result && (
            <>
              <dt>{SCORE_NAME[project.mode]}</dt>
              <dd>{result.text}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="card">
        <h2 className="card-title">Save Zo</h2>
        {stale(project) && <p className="notice">The data changed since Zo was trained. The app has the last trained Zo.</p>}
        <div className="share-rows">
          <section className="share-row">
            <Icon name="file" size={22} />
            <div className="grow">
              <strong>App file (.html)</strong>
              <p className="muted">Works offline in any browser.</p>
            </div>
            <button className="btn btn-primary btn-sm" disabled={!app} onClick={() => (download(`${slug(project.title)}.html`, page), award("shipped"))}>
              <Icon name="download" size={16} /> {app ? kb(new Blob([page]).size) : "Train first"}
            </button>
          </section>
          <section className="share-row">
            <Icon name="android" size={22} />
            <div className="grow">
              <strong>Android app (.apk)</strong>
            </div>
            <button className="btn btn-soft btn-sm" disabled={!app || busy} onClick={apk}>
              <Icon name="download" size={16} /> {busy ? "Building…" : "APK"}
            </button>
          </section>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">
          Badges <span className="pill">{project.badges.length} / {BADGES.length}</span>
        </h2>
        <ul className="badges">
          {BADGES.map((b) => {
            const got = project.badges.includes(b.id);
            return (
              <li key={b.id} className={got ? "is-got" : ""}>
                <ZoPic outfit={b.zo} pose={got ? "cheer" : "stand"} size={52} />
                <strong>{b.name}</strong>
                <small>{got ? "Earned" : b.how}</small>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
