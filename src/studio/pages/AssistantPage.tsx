import { useState } from "react";
import type { Game } from "../../shared/types";
import { getKey } from "../ai/openrouter";
import { Chat } from "../components/Chat";
import { GameReady } from "../components/GameReady";
import { PhonePreview } from "../components/PhonePreview";
import { kv } from "../db";
import { useApp } from "../store";
import { Icon } from "../ui";
import { PROMPT_KEY } from "./Home";

const GAME_KEY = "ds-assistant-game";

const SUGGESTIONS = [
  "A times-tables race for class 3 with a 10 second timer",
  "Vocabulary game on fruits and vegetables, English with Hindi translations",
  "Grammar game on a/an/the for beginners",
  "A memory card game matching countries and capitals",
];

/** Talk a new game into being; it is saved as it appears and opens in the editor afterwards. */
export function AssistantPage() {
  const { byId, save } = useApp();
  const [initial] = useState(() => {
    const text = sessionStorage.getItem(PROMPT_KEY) || "";
    const draft = !!sessionStorage.getItem(`${PROMPT_KEY}-draft`);
    // Without a key the teacher is about to sign in; keep the idea for when they come back.
    if (getKey()) {
      sessionStorage.removeItem(PROMPT_KEY);
      sessionStorage.removeItem(`${PROMPT_KEY}-draft`);
    }
    // A new idea from elsewhere starts a new conversation.
    if (text) {
      sessionStorage.removeItem(GAME_KEY);
      sessionStorage.removeItem(`${GAME_KEY}-chat`);
    }
    return { text, draft };
  });
  const [gameId, setGameId] = useState(() => sessionStorage.getItem(GAME_KEY) || "");
  const [session, setSession] = useState(() => sessionStorage.getItem(`${GAME_KEY}-chat`) || String(Date.now()));
  const game = gameId ? byId(gameId) || null : null;
  sessionStorage.setItem(`${GAME_KEY}-chat`, session);

  const onGame = (g: Game) => {
    save(g);
    setGameId(g.id);
    sessionStorage.setItem(GAME_KEY, g.id);
    // Keep this conversation with the game, so the editor's assistant can continue it.
    kv.get(`chat:new:${session}`).then((m) => m && kv.set(`chat:${g.id}`, m));
  };

  const restart = () => {
    sessionStorage.removeItem(GAME_KEY);
    kv.remove(`chat:new:${session}`);
    setGameId("");
    setSession(String(Date.now()));
  };

  return (
    <div className="page assistant-page">
      <div className="page-head">
        <h1>Assistant</h1>
        <span className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={restart}>
          <Icon name="plus" size={16} /> New chat
        </button>
      </div>
      {game && <GameReady game={game} />}
      <div className={`assistant-layout${game ? " has-game" : ""}`}>
        <div className="card chat-card">
          <Chat
            key={session}
            game={game}
            onGame={onGame}
            storageKey={`chat:new:${session}`}
            initial={initial.text}
            draft={initial.draft}
            suggestions={SUGGESTIONS}
          />
        </div>
        {game && <PhonePreview game={game} />}
      </div>
    </div>
  );
}
