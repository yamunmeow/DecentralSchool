import { useEffect, useMemo, useState } from "react";
import { previewPage, WEB_JS } from "../../code/web/package";
import { slug, type WebFiles, type WebTranslation } from "../../code/web/translate";
import type { CodeProject, WebState } from "../../code/types";
import { t } from "../i18n";
import { Icon } from "../ui";
import { CodeView, type Language } from "./CodeView";

/**
 * The project as a web page: index.html, style.css and script.js side by side with
 * the page running. The files are made from the blocks until the student changes
 * one; then they are the student's own (and can be made again from the blocks).
 */

type FileKey = "html" | "css" | "js" | "lib";
const FILES: { key: FileKey; name: string; lang: Language }[] = [
  { key: "html", name: "index.html", lang: "html" },
  { key: "css", name: "style.css", lang: "css" },
  { key: "js", name: "script.js", lang: "js" },
  { key: "lib", name: "web.js", lang: "js" },
];

export interface Dot {
  id: string;
  text: string;
  check: (files: WebFiles, base: WebFiles, linked: boolean) => boolean;
}

/** Everything the stylesheet says for a selector, later rules last (they win in CSS). */
const ruleOf = (css: string, selector: string) =>
  [...css.matchAll(new RegExp(`${selector.replace(/[#.]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "g"))].map((m) => m[1]).join(";");
const lastPx = (rule: string, prop: string) => {
  const all = [...rule.matchAll(new RegExp(`(?:^|[;\\s])${prop}\\s*:\\s*([\\d.]+)px`, "g"))];
  return all.length ? Number(all[all.length - 1][1]) : NaN;
};
const numbers = (js: string) => (js.match(/\b\d+(\.\d+)?\b/g) || []).join(",");
const says = (js: string) => new Set([...js.matchAll(/\.(say|sayFor|think|thinkFor)\(\s*("[^"]*"|'[^']*'|`[^`]*`)/g)].map((m) => m[2]));

export function dotsFor(project: CodeProject, translation: WebTranslation): Dot[] {
  const first = project.sprites[0];
  const name = first?.name || t("a character");
  const id = first ? slug(translation.names.get(first.id) || "sprite") : "";
  return [
    { id: "link", text: t("On the Blocks tab, open JavaScript, then click a block and find its line."), check: (_f, _b, linked) => linked },
    { id: "bigger", text: t("In style.css, make {name} twice as wide.", { name }), check: (f, b) => lastPx(ruleOf(f.css, `#${id}`), "width") >= 1.8 * lastPx(ruleOf(b.css, `#${id}`), "width") },
    { id: "move", text: t("In style.css, change where {name} starts (its left or top).", { name }), check: (f, b) => { const r = ruleOf(f.css, `#${id}`); const o = ruleOf(b.css, `#${id}`); return lastPx(r, "left") !== lastPx(o, "left") || lastPx(r, "top") !== lastPx(o, "top"); } },
    { id: "colour", text: t("In style.css, give the page a new background colour ({rule}).", { rule: "body { background: … }" }), check: (f, b) => ruleOf(f.css, "body").match(/background[^;]*/)?.[0] !== ruleOf(b.css, "body").match(/background[^;]*/)?.[0] },
    { id: "heading", text: t("In index.html, add a line of text under the stage with <p>…</p>."), check: (f) => /<p[\s>]/.test(f.html) },
    { id: "hidden", text: t("In index.html, hide a character by adding hidden to its <img>."), check: (f, b) => (f.html.match(/<img[^>]*\shidden/g) || []).length > (b.html.match(/<img[^>]*\shidden/g) || []).length },
    { id: "number", text: t("In script.js, change a number, then watch the page change."), check: (f, b) => numbers(f.js) !== numbers(b.js) },
    { id: "say", text: t("In script.js, make a character say something new: {code}.", { code: 'me.say("…")' }), check: (f, b) => [...says(f.js)].some((s) => !says(b.js).has(s)) },
  ];
}

export function WebTab({
  project,
  translation,
  dark,
  linked,
  onWeb,
  onDots,
  onRemake,
}: {
  project: CodeProject;
  translation: WebTranslation;
  dark: boolean;
  linked: boolean;
  onWeb: (web: WebState) => void;
  onDots: (done: string[]) => void;
  onRemake: () => void;
}) {
  const [file, setFile] = useState<FileKey>("js");
  const [run, setRun] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const files: WebFiles = project.web ? { html: project.web.html, css: project.web.css, js: project.web.js } : translation.files;
  const base: WebFiles = project.web?.base ?? translation.files;

  // Rebuild the preview a moment after typing stops.
  const [shown, setShown] = useState(files);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(files), 700);
    return () => window.clearTimeout(t);
  }, [files.html, files.css, files.js]);
  const page = useMemo(() => previewPage(shown, translation.assets), [shown, translation.assets]);
  useEffect(() => setErrors([]), [page, run]);

  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.data && typeof e.data.webError === "string") setErrors((x) => (x.includes(e.data.webError) ? x : [...x.slice(-3), e.data.webError]));
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);

  const dots = useMemo(() => dotsFor(project, translation), [project.sprites, translation.names]);
  const done = project.dots || [];
  useEffect(() => {
    const now = dots.filter((d) => !done.includes(d.id) && d.check(files, base, linked)).map((d) => d.id);
    if (now.length) onDots([...done, ...now]);
  }, [files.html, files.css, files.js, linked]);

  const edit = (key: FileKey, text: string) => {
    if (key === "lib") return;
    const current = project.web ?? { ...translation.files, base: translation.files };
    onWeb({ ...current, [key]: text });
  };

  const meta = FILES.find((f) => f.key === file)!;
  const value = file === "lib" ? WEB_JS : files[file];

  return (
    <div className="web-tab">
      <section className="web-files" aria-label={t("Files")}>
        <div className="web-bar">
          <nav className="seg seg-small" aria-label={t("File")}>
            {FILES.map((f) => (
              <button key={f.key} className={file === f.key ? "on" : ""} aria-pressed={file === f.key} onClick={() => setFile(f.key)}>
                {f.name}
              </button>
            ))}
          </nav>
          <span className="spacer" />
          {project.web ? (
            <span className="web-state is-edited">
              {t("Changed by you")}
              <button className="link-btn" onClick={onRemake}>
                {t("Make again from blocks")}
              </button>
            </span>
          ) : (
            <span className="web-state">{t("Made from your blocks")}</span>
          )}
        </div>
        <div className="web-editor">
          <CodeView key={file} value={value} language={meta.lang} readOnly={file === "lib"} dark={dark} label={meta.name} onChange={(text) => edit(file, text)} />
        </div>
      </section>

      <section className="web-side" aria-label={t("Web page")}>
        <div className="web-bar">
          <strong>{t("Web page")}</strong>
          <span className="spacer" />
          <button className="btn btn-soft btn-sm" onClick={() => (setShown(files), setRun((n) => n + 1))}>
            <Icon name="play" size={16} /> {t("Run")}
          </button>
        </div>
        <iframe key={run} className="web-preview" title={t("Web page preview")} sandbox="allow-scripts" srcDoc={page} />
        {errors.length > 0 && (
          <div className="ce-errors" role="alert">
            {errors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}
        <details className="dots" open>
          <summary>
            {t("Connect the dots")} <span className="pill">{done.filter((d) => dots.some((x) => x.id === d)).length} / {dots.length}</span>
          </summary>
          <ol>
            {dots.map((d) => (
              <li key={d.id} className={done.includes(d.id) ? "is-done" : ""}>
                <span className="dot-mark" aria-hidden>
                  {done.includes(d.id) ? "✓" : ""}
                </span>
                <span>{d.text}</span>
                {done.includes(d.id) && <span className="sr-only">{t("(done)")}</span>}
              </li>
            ))}
          </ol>
        </details>
        {translation.warnings.length > 0 && (
          <details className="web-warnings">
            <summary>{t("Not in the web version ({n})", { n: translation.warnings.length })}</summary>
            <ul>
              {translation.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}
