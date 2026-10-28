import { useRef, useState, type CSSProperties } from "react";
import { getKey, signIn } from "../ai/openrouter";
import type { Game } from "../../shared/types";
import { Critter } from "../Critter";
import { GameCard } from "../components/GameCard";
import { duplicate, forImport, gamesFromText, summary } from "../gameio";
import { PALETTE, TEMPLATE_CRITTER } from "../palette";
import { go, useApp } from "../store";
import { TEMPLATE_INFO, templateInfo } from "../templates";
import { Empty, Field, Icon, Modal } from "../ui";
import { useAi } from "../useAi";
import { useRole } from "../role";
import { t, tn } from "../i18n";

export const PROMPT_KEY = "ds-assistant-prompt";

/**
 * Hand an idea to the assistant. Without an AI connection yet, the teacher signs in to
 * OpenRouter first and comes straight back to the assistant with the idea waiting.
 */
export function askAssistant(idea: string, draft = false) {
  sessionStorage.setItem(PROMPT_KEY, idea);
  if (draft) sessionStorage.setItem(`${PROMPT_KEY}-draft`, "1");
  else sessionStorage.removeItem(`${PROMPT_KEY}-draft`);
  if (getKey()) return go("assistant");
  window.location.hash = "#/assistant";
  void signIn();
}

export function Home() {
  const { games } = useApp();
  const ai = useAi();
  const { role } = useRole();
  const [idea, setIdea] = useState("");
  const [importing, setImporting] = useState(false);

  const ask = () => {
    if (!idea.trim()) return;
    askAssistant(idea.trim());
  };

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-critters" aria-hidden>
          <Critter kind="owl" color="lilac" size={92} mood="joy" />
          <Critter kind="fox" color="peach" size={70} mood="wink" />
        </div>
        <div className="hero-text">
          <h1>{t("Quick games")}</h1>
          {role === "teacher" && (
          <form
            className="idea"
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
          >
            <Icon name="sparkle" />
            <input value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={t("A fractions race for class 5, in Hindi…")} aria-label={t("Describe a game")} />
            <button className="btn btn-primary" disabled={!idea.trim()}>
              {ai.connected ? t("Create") : t("Next")}
            </button>
          </form>
          )}
        </div>
      </section>

      <section className="template-row" aria-label={t("Templates")}>
        {TEMPLATE_INFO.map((tpl) => (
          <a key={tpl.id} href={`#/new/${tpl.id}`} className="template-tile" style={{ "--tint": PALETTE[tpl.tint].tint, "--ink-t": PALETTE[tpl.tint].ink } as CSSProperties}>
            <span className="template-emoji">{tpl.emoji}</span>
            <strong>{t(tpl.name)}</strong>
          </a>
        ))}
      </section>

      <div className="page-head">
        <h2 className="section-title">{t("My quick games")}</h2>
        <span className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={() => setImporting(true)}>
          <Icon name="upload" size={18} /> {t("Import")}
        </button>
      </div>

      {games.length ? (
        <div className="play-grid">
          {games.map((g) => (
            <MyGameCard key={g.id} game={g} />
          ))}
        </div>
      ) : (
        <div className="card is-quiet">
          <Empty critter={<Critter kind="turtle" color="sage" size={84} mood="sleepy" />}>{t("No games yet. Pick a template above, or describe one.")}</Empty>
        </div>
      )}

      {importing && <ImportModal onClose={() => setImporting(false)} />}
    </div>
  );
}

function MyGameCard({ game }: { game: Game }) {
  const { save, remove, toast } = useApp();
  const [menu, setMenu] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const info = templateInfo(game.template);
  return (
    <>
      <GameCard
        title={game.title}
        blurb={summary(game)}
        tags={[t(info.name)]}
        cover={{ emoji: game.emoji }}
        tint={game.tint}
        coverExtra={<Critter kind={TEMPLATE_CRITTER[game.template]} color={game.tint} size={56} className="play-critter" />}
        href={`#/game/${game.id}`}
        badge={{ label: t("Edit"), icon: "edit" }}
        actions={
          <>
            <a className="btn btn-soft btn-sm" href={`#/game/${game.id}/play`}>
              <Icon name="play" size={16} /> {t("Play")}
            </a>
            <a className="btn btn-ghost btn-sm" href={`#/game/${game.id}/share`}>
              <Icon name="share" size={16} /> {t("Share")}
            </a>
            <span className="spacer" />
            <div className="menu-wrap">
              <button className="icon-btn icon-btn-sm" aria-label={t("More for {title}", { title: game.title })} aria-expanded={menu} onClick={() => setMenu(!menu)}>
                <Icon name="dots" />
              </button>
              {menu && (
                <>
                  <div className="menu-catch" onClick={() => setMenu(false)} />
                  <div className="menu" role="menu">
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMenu(false);
                        save(duplicate(game)).then(() => toast(t("Copy made")));
                      }}
                    >
                      <Icon name="copy" size={18} /> {t("Make a copy")}
                    </button>
                    <button
                      role="menuitem"
                      className="danger"
                      onClick={() => {
                        setMenu(false);
                        setConfirming(true);
                      }}
                    >
                      <Icon name="trash" size={18} /> {t("Delete")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        }
      />
      {confirming && (
        <Modal
          title={t("Delete “{title}”?", { title: game.title })}
          onClose={() => setConfirming(false)}
          footer={
            <>
              <span className="spacer" />
              <button className="btn btn-ghost" onClick={() => setConfirming(false)}>
                {t("Keep it")}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  setConfirming(false);
                  remove(game.id).then(() => toast(t("Deleted")));
                }}
              >
                {t("Delete")}
              </button>
            </>
          }
        >
          <p>{t("Links, files and apps you already sent keep working. It's only removed from this studio.")}</p>
        </Modal>
      )}
    </>
  );
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const { save, byId, toast } = useApp();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const take = async (raw: string) => {
    try {
      const found = gamesFromText(raw);
      if (!found.length) throw new Error();
      const added = found.map((g) => forImport(g, (id) => !!byId(id)));
      for (const g of added) await save(g);
      toast(added.length === 1 ? t("Imported “{title}”", { title: added[0].title }) : tn(added.length, "Imported {n} game", "Imported {n} games"));
      onClose();
      if (added.length === 1) go(`game/${added[0].id}`);
    } catch {
      setError(t("That isn't a game link, game file or backup."));
    }
  };

  return (
    <Modal
      title={t("Import a game")}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => file.current?.click()}>
            <Icon name="file" size={18} /> {t("Choose file")}
          </button>
          <span className="spacer" />
          <button className="btn btn-primary" disabled={!text.trim()} onClick={() => take(text)}>
            {t("Import")}
          </button>
        </>
      }
    >
      <Field label={t("Game link")}>
        <textarea rows={3} value={text} onChange={(e) => (setText(e.target.value), setError(""))} placeholder="https://…/p/#g1.…" />
      </Field>
      <input
        ref={file}
        type="file"
        accept=".html,.htm,.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await take(await f.text());
          e.target.value = "";
        }}
      />
      {error && <p className="form-error">{error}</p>}
    </Modal>
  );
}
