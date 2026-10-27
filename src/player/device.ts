/** Everything that touches the phone: storage, speech, sound and vibration. All of it stays on the device. */

interface Shell {
  speak(text: string, lang: string, rate?: number): void;
  stopSpeaking(): void;
}

declare global {
  interface Window {
    AndroidShell?: Shell;
    onShellBack?: () => boolean;
  }
}

export const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked: progress just isn't kept */
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export function canSpeak(): boolean {
  return !!window.AndroidShell || "speechSynthesis" in window;
}

export function speak(text: string, lang: string, rate = 0.9) {
  if (!text) return;
  if (window.AndroidShell) return window.AndroidShell.speak(text, lang, rate);
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.replace("_", "-").toLowerCase().startsWith(lang.toLowerCase()));
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (window.AndroidShell) window.AndroidShell.stopSpeaking();
  else if ("speechSynthesis" in window) speechSynthesis.cancel();
}

let audio: AudioContext | null = null;
export const sound = { on: true };

/** Short synthesised tones, so the game ships no audio files. */
export function beep(kind: "right" | "wrong" | "done" | "tap") {
  if (!sound.on) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio = audio || new Ctx();
    const notes = { right: [660, 880], wrong: [220, 175], done: [523, 659, 784, 1047], tap: [520] }[kind];
    const t0 = audio.currentTime;
    notes.forEach((f, i) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = kind === "wrong" ? "triangle" : "sine";
      osc.frequency.value = f;
      const start = t0 + i * (kind === "done" ? 0.11 : 0.09);
      const len = kind === "tap" ? 0.05 : 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(kind === "tap" ? 0.05 : 0.18, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + len);
      osc.connect(gain).connect(audio!.destination);
      osc.start(start);
      osc.stop(start + len + 0.02);
    });
  } catch {
    /* no audio on this device */
  }
  if (kind === "wrong") buzz(60);
}

export function buzz(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

/** Reads a long text sentence by sentence (browsers cut off long utterances). */
export function speakLong(text: string, lang: string, onEnd?: () => void) {
  if (window.AndroidShell) return window.AndroidShell.speak(text.slice(0, 3900), lang, 0.9);
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const parts = text.replace(/\s+/g, " ").match(/[^.!?।]+[.!?।]*/g) || [text];
  const voice = speechSynthesis.getVoices().find((v) => v.lang.replace("_", "-").toLowerCase().startsWith(lang.toLowerCase()));
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part.trim());
    u.lang = lang;
    u.rate = 0.9;
    if (voice) u.voice = voice;
    if (i === parts.length - 1 && onEnd) u.onend = onEnd;
    speechSynthesis.speak(u);
  });
}
