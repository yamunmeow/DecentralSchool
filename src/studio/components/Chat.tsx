import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import type { Game } from "../../shared/types";
import { AiError, chat, type Message } from "../ai/openrouter";
import { assistantSystem, readReply } from "../ai/prompts";
import { Critter } from "../Critter";
import { ConnectAi } from "./ConnectAi";
import { ModelPicker } from "./ModelPicker";
import { kv } from "../db";
import { summary } from "../gameio";
import { ACCEPT_TEXT, textFromFile } from "../importText";
import { Icon } from "../ui";
import { useAi } from "../useAi";

interface Props {
  game: Game | null;
  /** Called with each game the assistant writes. */
  onGame: (game: Game) => void;
  /** Where the conversation is kept (IndexedDB). */
  storageKey: string;
  /** Text to start with; sent straight away unless `draft`. */
  initial?: string;
  draft?: boolean;
  placeholder?: string;
  suggestions?: string[];
}

const MAX_ATTACH = 12000;

export function Chat({ game, onGame, storageKey, initial, draft, placeholder, suggestions = [] }: Props) {
  const ai = useAi();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Game[]>([]);
  const abort = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const gameRef = useRef(game);
  gameRef.current = game;
  const started = useRef(false);

  useEffect(() => {
    kv.get<Message[]>(storageKey)
      .then((m) => setMessages(m || []))
      .finally(() => setLoaded(true));
    return () => abort.current?.abort();
  }, [storageKey]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const remember = (next: Message[]) => {
    setMessages(next);
    kv.set(storageKey, next.slice(-40)).catch(() => undefined);
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || streaming !== null) return;
    setError("");
    setInput("");
    const next = [...messages, { role: "user" as const, content }];
    remember(next);
    setStreaming("");
    const ctrl = new AbortController();
    abort.current = ctrl;
    const current = gameRef.current;
    // Earlier games are dropped from the history: the current one is in the system prompt.
    const context: Message[] = [
      { role: "system", content: assistantSystem(current) },
      ...next.slice(-16).map((m) => (m.role === "assistant" ? { ...m, content: m.content.replace(/```(game|json|html)[\s\S]*?```/g, "[game written]") } : m)),
    ];
    try {
      const reply = await chat(context, (t) => setStreaming(t), ctrl.signal);
      remember([...next, { role: "assistant", content: reply }]);
      const parsed = readReply(reply, current);
      if (parsed.game) {
        if (current) setHistory((h) => [...h, current].slice(-10));
        onGame(parsed.game);
      } else if (parsed.broken) setError("The game in that reply was cut off or malformed. Ask again, or try another model.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError(e instanceof AiError ? e.message : "Something went wrong. Try again.");
      remember(next);
    } finally {
      setStreaming(null);
      abort.current = null;
    }
  };

  // An idea from the Create page goes out as soon as the AI is connected (also right after signing in).
  useEffect(() => {
    if (!loaded || started.current || !initial) return;
    if (!draft && !ai.connected) return;
    started.current = true;
    if (draft) {
      setInput(initial);
      setTimeout(() => box.current?.focus(), 50);
    } else send(initial);
  }, [loaded, ai.connected]);

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    onGame(prev);
  };

  const attach = async (f: File) => {
    try {
      const text = (await textFromFile(f)).trim();
      if (!text) throw new Error();
      const clipped = text.length > MAX_ATTACH ? `${text.slice(0, MAX_ATTACH)}…` : text;
      setInput((v) => `${v ? `${v}\n\n` : ""}Text from “${f.name}”:\n"""\n${clipped}\n"""`);
      box.current?.focus();
    } catch {
      setError(`Couldn't read text from ${f.name}.`);
    }
  };

  if (!ai.connected)
    return (
      <div className="chat chat-connect">
        <Critter kind="octopus" color="lemon" size={96} mood="happy" wave />
        <h2>Connect the free AI</h2>
        <p className="muted">Sign in or sign up for free at OpenRouter and come straight back. Free models are used, and your key stays in this browser.</p>
        <ConnectAi />
      </div>
    );

  const lastReply = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div className="chat">
      <div className="chat-list" ref={list} aria-live="polite">
        {messages.length === 0 && streaming === null && (
          <div className="chat-empty">
            <Critter kind="octopus" color="lemon" size={72} mood="joy" />
            {suggestions.length > 0 && (
              <div className="chat-suggest">
                {suggestions.map((s) => (
                  <button key={s} className="chip-btn" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="bubble bubble-user">
              {m.content.length > 600 ? `${m.content.slice(0, 600)}…` : m.content}
            </div>
          ) : (
            <AssistantBubble key={i} raw={m.content} game={game} canUndo={m === lastReply && history.length > 0} onUndo={undo} />
          ),
        )}
        {streaming !== null && <AssistantBubble raw={streaming} game={game} live />}
      </div>
      {error && (
        <p className="chat-error" role="alert">
          {error}
        </p>
      )}
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <ModelPicker />
        <button type="button" className="icon-btn icon-btn-sm" onClick={() => file.current?.click()} aria-label="Attach a text" title="Attach a text">
          <Icon name="file" size={20} />
        </button>
        <input
          ref={file}
          type="file"
          accept={ACCEPT_TEXT}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) attach(f);
            e.target.value = "";
          }}
        />
        <textarea
          ref={box}
          rows={1}
          value={input}
          placeholder={placeholder || (game ? "Ask for a change…" : "Describe your game…")}
          aria-label="Message"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        {streaming !== null ? (
          <button type="button" className="icon-btn send-btn" onClick={() => abort.current?.abort()} aria-label="Stop">
            <Icon name="stop" />
          </button>
        ) : (
          <button className="icon-btn send-btn" disabled={!input.trim()} aria-label="Send">
            <Icon name="send" />
          </button>
        )}
      </form>
    </div>
  );
}

function AssistantBubble({ raw, game, live, canUndo, onUndo }: { raw: string; game: Game | null; live?: boolean; canUndo?: boolean; onUndo?: () => void }) {
  const reply = readReply(raw, game);
  const wrote = /```(game|json|html)/.test(raw);
  return (
    <div className="bubble bubble-ai">
      {reply.text ? <Markdown text={reply.text} /> : live && !reply.writing ? <span className="typing" aria-label="Thinking"><i /><i /><i /></span> : null}
      {live && reply.writing && (
        <div className="game-chip is-writing">
          <span className="typing" aria-hidden><i /><i /><i /></span> Building the game…
        </div>
      )}
      {!live && wrote && reply.game && (
        <div className="game-chip">
          <span className="game-chip-emoji">{reply.game.emoji}</span>
          <span className="grow">
            <strong>{reply.game.title}</strong>
            <small>{summary(reply.game)}</small>
          </span>
          {canUndo && (
            <button className="btn btn-ghost btn-sm" onClick={onUndo}>
              <Icon name="undo" size={16} /> Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Paragraphs, lists, **bold** and `code`: enough for chat replies. */
function Markdown({ text }: { text: string }) {
  const inline = (s: string): ReactNode[] =>
    s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
      part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part.startsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : <Fragment key={i}>{part}</Fragment>,
    );
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l)))
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>
              ))}
            </ul>
          );
        return <p key={i}>{lines.map((l, j) => (j ? [<br key={j} />, ...inline(l.replace(/^#+\s*/, ""))] : inline(l.replace(/^#+\s*/, ""))))}</p>;
      })}
    </>
  );
}
