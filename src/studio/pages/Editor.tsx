import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Game } from "../../shared/types";
import { Chat } from "../components/Chat";
import { GameSettings } from "../components/GameSettings";
import { PhonePreview } from "../components/PhonePreview";
import { Share } from "../components/Share";
import { Critter } from "../Critter";
import { CustomEditor } from "../editors/CustomEditor";
import { GrammarEditor } from "../editors/GrammarEditor";
import { MathEditor } from "../editors/MathEditor";
import { QuizEditor } from "../editors/QuizEditor";
import { ReadingEditor } from "../editors/ReadingEditor";
import { VocabEditor } from "../editors/VocabEditor";
import { PALETTE } from "../palette";
import { useApp } from "../store";
import { templateInfo } from "../templates";
import { Empty, Icon } from "../ui";

const TABS = [
  ["edit", "Content", "edit"],
  ["settings", "Settings", "gear"],
  ["play", "Play", "play"],
  ["share", "Share", "share"],
] as const;

type Tab = (typeof TABS)[number][0];

const EMOJI = "🎲 ❓ 🧠 ➗ ✖️ 🔢 📐 🍕 ✏️ 📝 🔤 📖 📚 🐦‍⬛ 🦁 🐘 🌍 🪐 🔬 🧪 🌱 🌧️ ⚡ 🏛️ 🗺️ 🎨 🎵 ⚽ 🏆 ⭐ 🚀 🧩 💡 🕵️ 🎈 🍎 🥭 🐟 🦋 ❤️".split(" ");

export function Editor({ id, tab }: { id: string; tab?: string }) {
  const { byId, save } = useApp();
  const stored = byId(id);
  const [game, setGame] = useState(stored);
  const [chatOpen, setChatOpen] = useState(false);
  const pending = useRef<Game | null>(null);
  const timer = useRef<number>(0);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    if (pending.current) save(pending.current);
    pending.current = null;
  }, [save]);

  useEffect(() => () => flush(), [flush]);
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [flush]);

  const update = useCallback(
    (next: Game) => {
      setGame(next);
      pending.current = next;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 400);
    },
    [flush],
  );

  if (!game)
    return (
      <div className="page">
        <Empty critter={<Critter kind="owl" color="lilac" size={84} mood="worried" />}>This game isn't in this browser.</Empty>
        <a className="btn btn-primary" href="#/games" style={{ alignSelf: "center" }}>
          Quick games
        </a>
      </div>
    );

  const current: Tab = TABS.some(([t]) => t === tab) ? (tab as Tab) : "edit";
  const p = PALETTE[game.tint];
  const info = templateInfo(game.template);

  let body: ReactNode;
  if (current === "settings") body = <GameSettings game={game} onChange={update} />;
  else if (current === "play")
    body = (
      <div className="play-tab">
        <PhonePreview game={game} />
      </div>
    );
  else if (current === "share") body = <Share game={game} onChange={update} />;
  else
    switch (game.template) {
      case "quiz": body = <QuizEditor game={game} onChange={update} />; break;
      case "math": body = <MathEditor game={game} onChange={update} />; break;
      case "grammar": body = <GrammarEditor game={game} onChange={update} />; break;
      case "vocab": body = <VocabEditor game={game} onChange={update} />; break;
      case "reading": body = <ReadingEditor game={game} onChange={update} />; break;
      case "custom": body = <CustomEditor game={game} onChange={update} onAsk={() => setChatOpen(true)} />; break;
    }

  return (
    <div className={`page editor${chatOpen ? " has-chat" : ""}`} style={{ "--tint": p.tint, "--deep": p.deep, "--ink-t": p.ink } as CSSProperties}>
      <header className="editor-head">
        <EmojiPicker value={game.emoji} onChange={(emoji) => update({ ...game, emoji })} />
        <div className="grow editor-title">
          <input className="title-input" value={game.title} aria-label="Title" onChange={(e) => update({ ...game, title: e.target.value })} onBlur={() => !game.title.trim() && update({ ...game, title: "Untitled game" })} />
          <span className="pill">
            {info.emoji} {info.name}
          </span>
        </div>
        <button className={`btn btn-sm ${chatOpen ? "btn-primary" : "btn-soft"}`} aria-pressed={chatOpen} onClick={() => setChatOpen(!chatOpen)}>
          <Icon name="sparkle" size={18} /> Assistant
        </button>
      </header>

      <nav className="seg seg-tabs editor-tabs" aria-label="Sections">
        {TABS.map(([t, label, icon]) => (
          <a key={t} href={`#/game/${game.id}${t === "edit" ? "" : `/${t}`}`} className={current === t ? "on" : ""} aria-current={current === t ? "page" : undefined}>
            <Icon name={icon} size={18} /> {label}
          </a>
        ))}
      </nav>

      <div className="editor-layout">
        <div className="editor-main">{body}</div>
        {chatOpen && (
          <aside className="side-chat" aria-label="Assistant">
            <div className="side-chat-head">
              <Icon name="sparkle" />
              <strong>Assistant</strong>
              <span className="spacer" />
              <button className="icon-btn icon-btn-sm" aria-label="Close assistant" onClick={() => setChatOpen(false)}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <Chat
              game={game}
              onGame={(g) => {
                update(g);
                flush();
              }}
              storageKey={`chat:${game.id}`}
              suggestions={game.template === "custom" ? ["Make it easier for younger students", "Add a timer and a high score"] : ["Add 10 more questions", "Make it harder", "Translate it into Hindi", "Turn this into a custom game with a race"]}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  return (
    <div className="menu-wrap">
      <button className="emoji-btn" aria-label="Change emoji" aria-expanded={open} onClick={() => setOpen(!open)}>
        {value}
      </button>
      {open && (
        <>
          <div className="menu-catch" onClick={() => setOpen(false)} />
          <div className="menu emoji-menu">
            <div className="emoji-grid">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  aria-label={e}
                  onClick={() => {
                    onChange(e);
                    setOpen(false);
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              value={custom}
              placeholder="Any emoji"
              aria-label="Any emoji"
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && custom.trim()) {
                  onChange(Array.from(custom.trim()).slice(0, 2).join(""));
                  setOpen(false);
                }
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
