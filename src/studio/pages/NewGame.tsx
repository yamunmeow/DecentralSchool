import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Game, Template } from "../../shared/types";
import { modelName, signIn } from "../ai/openrouter";
import { Critter } from "../Critter";
import { ACCEPT_TEXT, textFromFile } from "../importText";
import { PALETTE, TEMPLATE_CRITTER } from "../palette";
import { fromLibrary, LIBRARY, libraryUrl } from "../play/library";
import { go, useApp } from "../store";
import { blankGame, fromStarter, TEMPLATE_INFO } from "../templates";
import { Icon } from "../ui";
import { useAi } from "../useAi";
import { normalize } from "../../shared/normalize";
import { uid } from "../../shared/random";
import { lessonGame, readLesson } from "../lesson/detect";
import { htmlGameFromFile, isGameHtml } from "../lesson/htmlGame";
import { UploadResult, type Upload } from "../lesson/UploadResult";
import { askAssistant } from "./Home";

const IDEAS = [
  "A times-tables race for class 3 with a 10 second timer",
  "English vocabulary about the market, with French translations",
  "Reading game from a short story about a clever tortoise, for age 9",
  "A matching game: African countries and their capitals",
];

const ACCEPT_UPLOAD = `${ACCEPT_TEXT},.zip`;

/** Create a game: describe it to the AI, start from a template, or from a CAEB game. */
export function NewGame({ template }: { template?: string }) {
  const { save, toast } = useApp();
  const ai = useAi();
  const [idea, setIdea] = useState("");
  const [upload, setUpload] = useState<Upload | null>(null);
  const [reading, setReading] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (template) document.getElementById(`t-${template}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [template]);

  const create = async (game: Game) => {
    await save(game);
    go(`game/${game.id}`);
  };

  const askFor = (t: Template, name: string) => askAssistant(t === "custom" ? "Make a game where " : `Make a ${name.toLowerCase()} game about `, true);

  /** No AI needed: an HTML game becomes the game as it is; a lesson is read and turned into the template it fits. */
  const take = async (f: File) => {
    setReading(true);
    try {
      const raw = /\.(html?|zip)$/i.test(f.name) ? (/\.zip$/i.test(f.name) ? "" : await f.text()) : null;
      if (raw !== null && (/\.zip$/i.test(f.name) || isGameHtml(raw))) {
        const html = await htmlGameFromFile(f);
        const game = normalize({ template: "custom", title: html.title, emoji: "🎮", tint: "sky", html: html.html }, { id: uid() });
        await save(game);
        setUpload({ kind: "html", file: f.name, game: html, id: game.id });
      } else {
        const text = (await textFromFile(f)).trim();
        if (!text) throw new Error(`Couldn't read any text from ${f.name}.`);
        const lesson = readLesson(text, f.name);
        const game = lessonGame(lesson, lesson.best);
        await save(game);
        setUpload({ kind: "lesson", file: f.name, lesson, text, id: game.id, chosen: lesson.best });
      }
    } catch (e) {
      toast((e as Error).message || `Couldn't read ${f.name}.`, "error");
    } finally {
      setReading(false);
    }
  };

  return (
    <div className="page create-page">
      <section className="hero create-hero">
        <div className="hero-text">
          <h1>Create a game</h1>
          <form
            className="create-box"
            onSubmit={(e) => {
              e.preventDefault();
              if (idea.trim()) askAssistant(idea.trim());
            }}
          >
            <label className="sr-only" htmlFor="idea">
              Describe your game
            </label>
            <textarea id="idea" rows={3} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Describe your game: the subject, the age of your students, the language…" />
            <div className="create-row">
              <button type="button" className="btn btn-ghost btn-sm upload-btn" disabled={reading} onClick={() => file.current?.click()} title="A lesson plan or worksheet (.docx, .pdf, .odt, .txt), or an HTML game (.html, or its folder as a .zip)">
                <Icon name="upload" size={16} /> {reading ? "Reading…" : "Upload your lesson file or a pre-existing HTML game file"}
              </button>
              <span className="create-ai">
                {ai.connected ? (
                  <>
                    <span className="ai-dot on" aria-hidden />
                    AI connected · {modelName(ai.model)}
                  </>
                ) : (
                  <button type="button" className="btn btn-sm btn-ai" onClick={() => signIn()}>
                    Login to OpenRouter AI for free
                  </button>
                )}
              </span>
              <span className="spacer" />
              <button className="btn btn-primary" disabled={!idea.trim()}>
                <Icon name="sparkle" size={18} /> {ai.connected ? "Create with AI" : "Connect & create"}
              </button>
            </div>
            <input ref={file} type="file" accept={ACCEPT_UPLOAD} hidden onChange={(e) => (e.target.files?.[0] && take(e.target.files[0]), (e.target.value = ""))} />
          </form>
          <div className="chips idea-chips">
            {IDEAS.map((i) => (
              <button key={i} type="button" className="chip-btn" onClick={() => setIdea(i)}>
                {i}
              </button>
            ))}
          </div>
        </div>
      </section>

      {upload && <UploadResult upload={upload} onChange={setUpload} onAgain={() => file.current?.click()} />}

      <section className="create-steps" aria-label="How it works">
        {[
          ["sparkle", "Describe or upload", "a lesson, a worksheet or an HTML game"],
          ["edit", "Check and change", "every question stays editable"],
          ["android", "Hand it out", "Android app, offline file or link"],
        ].map(([icon, title, text], i) => (
          <div key={title} className="create-step">
            <span className="step-n">{i + 1}</span>
            <Icon name={icon as "sparkle"} size={22} />
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
          </div>
        ))}
      </section>

      <div className="page-head">
        <h2 className="section-title">Or start from a template</h2>
      </div>
      <div className="template-grid">
        {TEMPLATE_INFO.map((t) => {
          const p = PALETTE[t.tint];
          return (
            <section id={`t-${t.id}`} key={t.id} className={`template-card${template === t.id ? " is-picked" : ""}`} style={{ "--tint": p.tint, "--ink-t": p.ink, "--deep": p.deep } as CSSProperties}>
              <header className="template-head">
                <span className="template-emoji">{t.emoji}</span>
                <div className="grow">
                  <h2>{t.name}</h2>
                  <p>{t.blurb}</p>
                </div>
                <Critter kind={TEMPLATE_CRITTER[t.id]} color={t.tint} size={60} />
              </header>
              <div className="template-actions">
                {t.id !== "custom" && (
                  <button className="btn btn-ghost btn-sm" onClick={() => create(blankGame(t.id))}>
                    <Icon name="plus" size={16} /> Empty
                  </button>
                )}
                {t.starters.map((s) => (
                  <button key={s.title} className="btn btn-ghost btn-sm" onClick={() => create(fromStarter(s))}>
                    <Icon name="star" size={16} /> {s.title}
                  </button>
                ))}
                <button className="btn btn-soft btn-sm" onClick={() => askFor(t.id, t.name)}>
                  <Icon name="sparkle" size={16} /> With AI
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <div className="page-head">
        <h2 className="section-title">Or start from a CAEB game</h2>
      </div>
      <div className="tile-grid">
        {LIBRARY.flatMap((g) => g.templates.map((t) => ({ g, t }))).map(({ g, t }) => (
          <button
            key={`${g.id}-${t.file}`}
            className="quiz-tile"
            onClick={() => fromLibrary(g, t.file).then(create, (e: Error) => toast(e.message, "error"))}
          >
            <img src={libraryUrl(g, "icon.png")} alt="" width={52} height={52} className="lib-icon" />
            <strong>{g.title}</strong>
            <small>{t.label}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
