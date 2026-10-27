import { useEffect, useState } from "react";
import { getKey, getModel } from "./ai/openrouter";

/** Whether OpenRouter is connected, and which model is picked; follows changes made anywhere in the app. */
export function useAi() {
  const read = () => ({ connected: !!getKey(), model: getModel() });
  const [state, setState] = useState(read);
  useEffect(() => {
    const on = () => setState(read());
    window.addEventListener("openrouter", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("openrouter", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return state;
}
