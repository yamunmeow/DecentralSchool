import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Game } from "../shared/types";
import { games as table, persist } from "./db";

interface Toast {
  id: number;
  text: string;
  tone: "ok" | "error";
}

interface Ctx {
  games: Game[];
  ready: boolean;
  byId: (id: string) => Game | undefined;
  save: (game: Game) => Promise<void>;
  remove: (id: string) => Promise<void>;
  toast: (text: string, tone?: Toast["tone"]) => void;
}

const AppContext = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp outside provider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    persist();
    table
      .all()
      .then((list) => setGames(list.sort((a, b) => b.updated - a.updated)))
      .catch(() => setGames([]))
      .finally(() => setReady(true));
  }, []);

  const toast = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6000 : 2800);
  }, []);

  const save = useCallback(
    async (game: Game) => {
      const stamped = { ...game, updated: Date.now() };
      setGames((list) => [stamped, ...list.filter((g) => g.id !== game.id)]);
      try {
        await table.put(stamped);
      } catch {
        toast("Couldn't save in this browser. Is it in private mode?", "error");
      }
    },
    [toast],
  );

  const remove = useCallback(async (id: string) => {
    setGames((list) => list.filter((g) => g.id !== id));
    await table.remove(id);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ games, ready, byId: (id) => games.find((g) => g.id === id), save, remove, toast }),
    [games, ready, save, remove, toast],
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast${t.tone === "error" ? " toast-error" : ""}`}>
            {t.text}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

/** Hash routes: #/, #/new, #/game/<id>/<tab>, #/assistant, #/settings. */
export function useRoute(): string[] {
  const read = () => window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export const go = (path: string) => {
  window.location.hash = `#/${path}`;
};
