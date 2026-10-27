import type { CodeProject } from "../code/types";
import type { LearnProject } from "../learn/types";
import type { Challenge, HandIn } from "./class/model";
import type { Game } from "../shared/types";

/** Everything the studio keeps lives in this browser's IndexedDB. There is no server. */

const NAME = "decentralschool";
let opening: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  return (opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, 4);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains("games")) d.createObjectStore("games", { keyPath: "id" });
      if (!d.objectStoreNames.contains("kv")) d.createObjectStore("kv");
      if (!d.objectStoreNames.contains("projects")) d.createObjectStore("projects", { keyPath: "id" });
      if (!d.objectStoreNames.contains("models")) d.createObjectStore("models", { keyPath: "id" });
      if (!d.objectStoreNames.contains("challenges")) d.createObjectStore("challenges", { keyPath: "id" });
      if (!d.objectStoreNames.contains("handins")) d.createObjectStore("handins", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function run<T>(store: "games" | "kv" | "projects" | "models" | "challenges" | "handins", mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const tx = d.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => resolve(req.result as T);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

export const games = {
  all: () => run<Game[]>("games", "readonly", (s) => s.getAll()),
  put: (g: Game) => run<IDBValidKey>("games", "readwrite", (s) => s.put(g)),
  remove: (id: string) => run<undefined>("games", "readwrite", (s) => s.delete(id)),
};

export const projects = {
  all: () => run<CodeProject[]>("projects", "readonly", (s) => s.getAll()),
  get: (id: string) => run<CodeProject | undefined>("projects", "readonly", (s) => s.get(id)),
  put: (p: CodeProject) => run<IDBValidKey>("projects", "readwrite", (s) => s.put(p)),
  remove: (id: string) => run<undefined>("projects", "readwrite", (s) => s.delete(id)),
};

/** Zo Wants to Learn projects. */
export const models = {
  all: () => run<LearnProject[]>("models", "readonly", (s) => s.getAll()),
  get: (id: string) => run<LearnProject | undefined>("models", "readonly", (s) => s.get(id)),
  put: (p: LearnProject) => run<IDBValidKey>("models", "readwrite", (s) => s.put(p)),
  remove: (id: string) => run<undefined>("models", "readwrite", (s) => s.delete(id)),
};

/** Teacher side: challenges made here, and hand-ins received. */
export const challenges = {
  all: () => run<Challenge[]>("challenges", "readonly", (s) => s.getAll()),
  get: (id: string) => run<Challenge | undefined>("challenges", "readonly", (s) => s.get(id)),
  put: (c: Challenge) => run<IDBValidKey>("challenges", "readwrite", (s) => s.put(c)),
  remove: (id: string) => run<undefined>("challenges", "readwrite", (s) => s.delete(id)),
};

export const handins = {
  all: () => run<HandIn[]>("handins", "readonly", (s) => s.getAll()),
  put: (h: HandIn) => run<IDBValidKey>("handins", "readwrite", (s) => s.put(h)),
  remove: (id: string) => run<undefined>("handins", "readwrite", (s) => s.delete(id)),
};

export const kv = {
  get: <T>(key: string) => run<T | undefined>("kv", "readonly", (s) => s.get(key)),
  set: (key: string, value: unknown) => run<IDBValidKey>("kv", "readwrite", (s) => s.put(value, key)),
  remove: (key: string) => run<undefined>("kv", "readwrite", (s) => s.delete(key)),
};

/** Ask the browser not to clear our data when space runs low. */
export function persist() {
  navigator.storage?.persist?.().catch(() => undefined);
}
