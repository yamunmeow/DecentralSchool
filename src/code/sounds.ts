/**
 * Built-in sounds, synthesised into small WAV files on demand, so projects carry no
 * audio files and work offline.
 */

const RATE = 22050;

interface Voice {
  name: string;
  secs: number;
  sample: (t: number, i: number) => number;
}

const env = (t: number, attack: number, decay: number) => (t < attack ? t / attack : Math.exp(-(t - attack) / decay));
const sin = (f: number, t: number) => Math.sin(2 * Math.PI * f * t);
const sq = (f: number, t: number) => (sin(f, t) > 0 ? 1 : -1);
let seed = 7;
const noise = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed / 2147483647) * 2 - 1;
};
const note = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export const SOUNDS: Record<string, Voice> = {
  pop: { name: "Pop", secs: 0.15, sample: (t) => sin(900 - t * 4000, t) * env(t, 0.003, 0.03) },
  boing: { name: "Boing", secs: 0.6, sample: (t) => sin(180 + 120 * Math.sin(t * 30) * Math.exp(-t * 3), t) * env(t, 0.01, 0.25) },
  chime: { name: "Chime", secs: 1.2, sample: (t) => (sin(1046, t) * 0.6 + sin(1568, t) * 0.3 + sin(2093, t) * 0.15) * env(t, 0.005, 0.4) },
  coin: { name: "Coin", secs: 0.35, sample: (t) => sq(t < 0.08 ? 988 : 1319, t) * 0.35 * env(t, 0.002, 0.15) },
  jump: { name: "Jump", secs: 0.3, sample: (t) => sq(300 + t * 1400, t) * 0.3 * env(t, 0.005, 0.12) },
  laser: { name: "Laser", secs: 0.35, sample: (t) => sq(1600 * Math.exp(-t * 9) + 200, t) * 0.3 * env(t, 0.002, 0.15) },
  drum: { name: "Drum", secs: 0.4, sample: (t) => (sin(110 * Math.exp(-t * 6) + 50, t) * 0.9 + noise() * 0.15 * Math.exp(-t * 30)) * env(t, 0.002, 0.12) },
  clap: { name: "Clap", secs: 0.25, sample: (t) => noise() * env(t, 0.002, 0.05) * (t < 0.02 || (t > 0.03 && t < 0.05) || t > 0.06 ? 1 : 0.2) },
  bell: { name: "Bell", secs: 1.5, sample: (t) => (sin(880, t) + sin(880 * 2.76, t) * 0.4 + sin(880 * 5.4, t) * 0.2) * 0.5 * env(t, 0.002, 0.5) },
  whoosh: { name: "Whoosh", secs: 0.6, sample: (t) => noise() * Math.sin(Math.PI * (t / 0.6)) * 0.5 },
  win: { name: "Win", secs: 1.0, sample: (t) => sq(note([72, 76, 79, 84][Math.min(3, Math.floor(t / 0.15))]), t) * 0.25 * (t < 0.6 ? 1 : env(t - 0.6, 0.001, 0.15)) },
  lose: { name: "Lose", secs: 1.0, sample: (t) => sq(note([67, 64, 60, 55][Math.min(3, Math.floor(t / 0.2))]), t) * 0.25 * (t < 0.8 ? 1 : env(t - 0.8, 0.001, 0.1)) },
  click: { name: "Click", secs: 0.05, sample: (t) => noise() * env(t, 0.0005, 0.006) },
  beep: { name: "Beep", secs: 0.25, sample: (t) => sin(880, t) * 0.5 * (t < 0.2 ? 1 : 0) },
  buzz: { name: "Buzz", secs: 0.4, sample: (t) => sq(110, t) * 0.25 * (t < 0.35 ? 1 : 0) },
  meow: { name: "Squeak", secs: 0.4, sample: (t) => sin(700 + 500 * Math.sin(t * 8), t) * 0.5 * env(t, 0.03, 0.15) },
  trumpet: { name: "Trumpet (Zo)", secs: 0.9, sample: (t) => (sq(233 + Math.sin(t * 30) * 4, t) * 0.5 + sin(466, t) * 0.3) * 0.5 * env(t, 0.05, 0.4) },
  ...Object.fromEntries(
    ["C", "D", "E", "F", "G", "A", "B", "C2"].map((n, i) => [
      `piano-${n}`,
      { name: `Piano ${n}`, secs: 1.0, sample: (t: number) => { const f = note(60 + [0, 2, 4, 5, 7, 9, 11, 12][i]); return (sin(f, t) * 0.6 + sin(f * 2, t) * 0.25 + sin(f * 3, t) * 0.1) * env(t, 0.004, 0.35); } },
    ]),
  ),
};

export const SOUND_IDS = Object.keys(SOUNDS);

/** 16-bit mono PCM WAV. */
export function soundWav(id: string): Uint8Array {
  const v = SOUNDS[id] || SOUNDS.pop;
  seed = 7;
  const n = Math.floor(v.secs * RATE);
  const buf = new ArrayBuffer(44 + n * 2);
  const d = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  d.setUint32(4, 36 + n * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  d.setUint32(16, 16, true);
  d.setUint16(20, 1, true);
  d.setUint16(22, 1, true);
  d.setUint32(24, RATE, true);
  d.setUint32(28, RATE * 2, true);
  d.setUint16(32, 2, true);
  d.setUint16(34, 16, true);
  str(36, "data");
  d.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, v.sample(i / RATE, i) * 0.8));
    d.setInt16(44 + i * 2, s * 32767, true);
  }
  return new Uint8Array(buf);
}

const urls = new Map<string, string>();
/** A blob: URL for the sound (cached). */
export function soundUrl(id: string): string {
  let url = urls.get(id);
  if (!url) {
    url = URL.createObjectURL(new Blob([soundWav(id) as BlobPart], { type: "audio/wav" }));
    urls.set(id, url);
  }
  return url;
}
