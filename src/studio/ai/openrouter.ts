/**
 * OpenRouter, straight from the browser. Teachers sign in with OpenRouter's OAuth
 * (PKCE) and get their own key, kept only in this browser; requests go from here to
 * OpenRouter with no server of ours in between. By default the studio picks the
 * best free chat models itself (see bestFree) and lets OpenRouter fall back between
 * them; "openrouter/free" isn't used because it can land on models that don't chat,
 * such as safety classifiers ("User Safety: safe").
 */

const API = "https://openrouter.ai/api/v1";
const KEY = "ds-openrouter-key";
const MODEL = "ds-openrouter-model";
const VERIFIER = "ds-openrouter-verifier";
const RETURN = "ds-openrouter-return";
const STATE = "ds-openrouter-state";
export const DEFAULT_MODEL = "auto:free";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Model {
  id: string;
  name: string;
  free: boolean;
  context: number;
  /** A model that answers in conversation (not a classifier, music or embedding model). */
  chat: boolean;
}

/** What a model is called on screen. */
export const modelName = (id: string) => (id === DEFAULT_MODEL ? "best free models" : id.replace(/:free$/, "").replace(/^[^/]+\//, ""));

const local = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string | null) => {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* private mode */
    }
  },
};

export const getKey = () => local.get(KEY);
export const setKey = (key: string | null) => {
  local.set(KEY, key);
  window.dispatchEvent(new Event("openrouter"));
};
export const getModel = () => {
  const m = local.get(MODEL);
  return !m || m === "openrouter/free" ? DEFAULT_MODEL : m;
};
export const setModel = (id: string) => {
  local.set(MODEL, id);
  window.dispatchEvent(new Event("openrouter"));
};

const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function signIn() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  const state = base64url(crypto.getRandomValues(new Uint8Array(16)));
  sessionStorage.setItem(VERIFIER, verifier);
  sessionStorage.setItem(STATE, state);
  sessionStorage.setItem(RETURN, window.location.hash);
  const callback = window.location.origin + window.location.pathname;
  const url = new URL("https://openrouter.ai/auth");
  url.searchParams.set("callback_url", callback);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("key_label", "DecentralSchool");
  // Comes back unchanged: a sign-in this browser didn't start is refused.
  url.searchParams.set("state", state);
  // The studio sends no referrer anywhere else; this one hop names the site (origin only),
  // as a normal link would, so OpenRouter's request checks see where the visit came from.
  const a = document.createElement("a");
  a.href = url.href;
  a.referrerPolicy = "origin";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** The page where a teacher makes a key by hand (the fallback when sign-in won't finish). */
export const KEYS_PAGE = "https://openrouter.ai/settings/keys";

/** Checks a pasted key with OpenRouter before keeping it. */
export async function checkKey(key: string): Promise<"ok" | string> {
  try {
    const res = await fetch(`${API}/key`, { headers: { Authorization: `Bearer ${key}` } });
    if (res.status === 401 || res.status === 403) return "OpenRouter doesn't know that key. Copy it again from the keys page.";
    if (!res.ok) return `OpenRouter answered ${res.status}. Try again in a moment.`;
    return "ok";
  } catch {
    return "Couldn't reach OpenRouter. Check your connection.";
  }
}

/** Called on load: finishes a sign-in if OpenRouter just sent us back with ?code=. */
export async function finishSignIn(): Promise<"none" | "ok" | string> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) return "none";
  const verifier = sessionStorage.getItem(VERIFIER);
  const state = sessionStorage.getItem(STATE);
  const back = sessionStorage.getItem(RETURN) || "#/settings";
  sessionStorage.removeItem(VERIFIER);
  sessionStorage.removeItem(STATE);
  sessionStorage.removeItem(RETURN);
  window.history.replaceState(null, "", window.location.pathname + back);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  if (!verifier) return "The sign-in expired. Please try again.";
  if (params.get("state") !== state) return "That sign-in didn't start here. Please try again.";
  try {
    const res = await fetch(`${API}/auth/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: "S256" }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || typeof body.key !== "string") return body?.error?.message || "OpenRouter didn't accept the sign-in. Please try again.";
    setKey(body.key);
    return "ok";
  } catch {
    return "Couldn't reach OpenRouter. Check your connection.";
  }
}

let modelCache: Promise<Model[]> | null = null;
export function listModels(): Promise<Model[]> {
  return (modelCache ??= fetch(`${API}/models`)
    .then((r) => r.json())
    .then((body: { data?: { id: string; name: string; description?: string; context_length?: number; pricing?: { prompt?: string; completion?: string }; architecture?: { output_modalities?: string[] } }[] }) =>
      (body.data || [])
        .filter((m) => !m.architecture?.output_modalities || m.architecture.output_modalities.includes("text"))
        .map((m) => ({
          id: m.id,
          name: m.name,
          context: m.context_length || 0,
          free: m.pricing?.prompt === "0" && m.pricing?.completion === "0",
          chat:
            m.id !== "openrouter/free" &&
            !NOT_CHAT.test(`${m.id} ${m.name}`) &&
            !/content safety|safety classifier|moderation model/i.test(m.description || "") &&
            (m.architecture?.output_modalities || ["text"]).every((o) => o === "text"),
        }))
        .sort((a, b) => Number(b.free) - Number(a.free) || a.name.localeCompare(b.name)),
    )
    .catch((e) => {
      modelCache = null;
      throw e;
    }));
}

const NOT_CHAT = /safety|guard|moderat|classif|lyria|embed|rerank|whisper|tts|speech|image-gen/i;

/** Size in billions of parameters from a name like "gemma-4-31b" (0 if not given). */
const size = (id: string) => Number(id.match(/(\d+(?:\.\d+)?)b(?![a-z])/i)?.[1] || 0);

/**
 * The free chat models worth trying first for writing whole games: big general models,
 * then the rest; tiny ones last. OpenRouter moves to the next if one is busy or down.
 */
let bestCache: Promise<string[]> | null = null;
export function bestFree(): Promise<string[]> {
  return (bestCache ??= listModels()
    .then((all) => {
      const score = (m: Model) =>
        (/gemma|nemotron-3-ultra|inkling(?!-small)|flint|dots|deepseek|qwen|llama|mistral|glm|kimi/i.test(m.id) ? 100 : 0) +
        (/code|coder/i.test(m.id) ? -15 : 0) +
        (/mini|small|nano|lightning|\bxs\b/i.test(m.id) || (size(m.id) > 0 && size(m.id) < 8) ? -60 : 0) +
        Math.min(30, m.context / 32000);
      const picks = all.filter((m) => m.free && m.chat && m.context >= 32000).sort((a, b) => score(b) - score(a));
      return picks.length ? picks.slice(0, 3).map((m) => m.id) : ["openrouter/free"];
    })
    .catch(() => {
      bestCache = null;
      return ["openrouter/free"];
    }));
}

/** A safety classifier's verdict instead of an answer. */
const verdict = (text: string) => /^\s*(user|response|prompt) safety\s*:/im.test(text) && text.length < 200;

export class AiError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
  }
}

async function modelFields(): Promise<{ model: string; models?: string[] }> {
  const picked = getModel();
  if (picked !== DEFAULT_MODEL) return { model: picked };
  const list = await bestFree();
  return list.length > 1 ? { model: list[0], models: list } : { model: list[0] };
}

const SAFETY_ONLY = "That model only checks messages for safety and can't write games. Pick another model in Settings, or use “best free models”.";

/** Streams the reply; onText gets the whole text so far. Resolves with the final text. */
export async function chat(messages: Message[], onText: (text: string) => void, signal?: AbortSignal): Promise<string> {
  const key = getKey();
  if (!key) throw new AiError("Connect OpenRouter in Settings first.", 401);
  let res: Response;
  try {
    res = await fetch(`${API}/chat/completions`, {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "DecentralSchool",
      },
      body: JSON.stringify({ ...(await modelFields()), messages, stream: true, temperature: 0.7 }),
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new AiError("Couldn't reach OpenRouter. Check your connection.");
  }
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.error?.message as string | undefined;
    if (res.status === 401) {
      setKey(null);
      throw new AiError("Your OpenRouter sign-in has ended. Connect again in Settings.", 401);
    }
    if (res.status === 402) throw new AiError("This model needs credits on your OpenRouter account. Pick a free model in Settings.", 402);
    if (res.status === 429) throw new AiError("The free models are busy right now. Wait a minute and try again, or pick another model.", 429);
    throw new AiError(msg || `OpenRouter error ${res.status}`, res.status);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") {
        if (verdict(text)) throw new AiError(SAFETY_ONLY);
        return text;
      }
      try {
        const json = JSON.parse(data);
        if (json.error) throw new AiError(json.error.message || "The model stopped with an error.");
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          text += delta;
          onText(text);
        }
      } catch (e) {
        if (e instanceof AiError) throw e;
      }
    }
  }
  if (verdict(text)) throw new AiError(SAFETY_ONLY);
  return text;
}
