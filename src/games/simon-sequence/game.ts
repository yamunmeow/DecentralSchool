import { beep, isMuted, toggleMuted } from "../shared/audio";

const TILES = [
  { key: "cyan", color: "var(--ghost-cyan)", freq: 329.63 }, // E4
  { key: "pink", color: "var(--ghost-pink)", freq: 261.63 }, // C4
  { key: "orange", color: "var(--ghost-orange)", freq: 220.0 }, // A3
  { key: "red", color: "var(--ghost-red)", freq: 164.81 }, // E3
];

const STEP_MS = 550;
const MIN_LEVEL = 1;
const MAX_LEVEL = 50;

export function mountSimonSequence(root: HTMLElement) {
  root.innerHTML = `
    <div class="sq-wrap">
      <div class="sq-bar">
        <span id="sq-level">Level: 0</span>
        <span id="sq-status">Press Start</span>
        <button class="sq-mute" id="sq-mute" type="button" aria-pressed="false">Sound: On</button>
      </div>
      <div class="sq-board" id="sq-board">
        ${TILES.map((t) => `<button class="sq-tile" data-key="${t.key}" style="--tile-color:${t.color}"></button>`).join("")}
      </div>
      <div class="sq-start-row">
        <button class="pixel-btn secondary" id="sq-minus">-</button>
        <span class="sq-start-level">Start at level <span id="sq-start-level-num">1</span></span>
        <button class="pixel-btn secondary" id="sq-plus">+</button>
      </div>
      <button class="pixel-btn" id="sq-start">Start</button>
      <p class="sq-over" id="sq-over" hidden></p>
    </div>
  `;

  const levelEl = root.querySelector<HTMLElement>("#sq-level")!;
  const statusEl = root.querySelector<HTMLElement>("#sq-status")!;
  const startBtn = root.querySelector<HTMLButtonElement>("#sq-start")!;
  const overEl = root.querySelector<HTMLElement>("#sq-over")!;
  const tileEls = Array.from(root.querySelectorAll<HTMLButtonElement>(".sq-tile"));
  const minusBtn = root.querySelector<HTMLButtonElement>("#sq-minus")!;
  const plusBtn = root.querySelector<HTMLButtonElement>("#sq-plus")!;
  const startLevelNumEl = root.querySelector<HTMLElement>("#sq-start-level-num")!;
  const startRowEl = root.querySelector<HTMLElement>(".sq-start-row")!;
  const muteBtn = root.querySelector<HTMLButtonElement>("#sq-mute")!;

  function renderMuteBtn() {
    const muted = isMuted();
    muteBtn.textContent = muted ? "Sound: Off" : "Sound: On";
    muteBtn.setAttribute("aria-pressed", String(muted));
  }
  renderMuteBtn();
  muteBtn.addEventListener("click", () => {
    toggleMuted();
    renderMuteBtn();
  });

  let sequence: number[] = [];
  let playerStep = 0;
  let accepting = false;
  let best = 0;
  let startLevel = 1;

  // Bumped every time a game (re)starts, so async playback/click chains from
  // a previous game can notice they're stale and stop instead of running
  // alongside a new one.
  let session = 0;
  const isCurrent = (token: number) => token === session;

  minusBtn.addEventListener("click", () => {
    startLevel = Math.max(MIN_LEVEL, startLevel - 1);
    startLevelNumEl.textContent = String(startLevel);
  });
  plusBtn.addEventListener("click", () => {
    startLevel = Math.min(MAX_LEVEL, startLevel + 1);
    startLevelNumEl.textContent = String(startLevel);
  });

  function setTilesEnabled(enabled: boolean) {
    tileEls.forEach((el) => (el.disabled = !enabled));
  }

  async function flash(idx: number, token: number, duration = 350) {
    if (!isCurrent(token)) return;
    const el = tileEls[idx];
    el.classList.add("sq-lit");
    beep(TILES[idx].freq, duration / 1000);
    await new Promise((r) => setTimeout(r, duration));
    if (!isCurrent(token)) return;
    el.classList.remove("sq-lit");
  }

  async function playSequence(token: number) {
    if (!isCurrent(token)) return;
    accepting = false;
    setTilesEnabled(false);
    statusEl.textContent = "Watch…";
    await new Promise((r) => setTimeout(r, 500));
    for (const idx of sequence) {
      if (!isCurrent(token)) return;
      await flash(idx, token);
      if (!isCurrent(token)) return;
      await new Promise((r) => setTimeout(r, STEP_MS - 350));
    }
    if (!isCurrent(token)) return;
    playerStep = 0;
    accepting = true;
    setTilesEnabled(true);
    statusEl.textContent = "Your turn";
  }

  function nextRound(token: number) {
    sequence.push(Math.floor(Math.random() * TILES.length));
    levelEl.textContent = `Level: ${sequence.length}`;
    playSequence(token);
  }

  function gameOver() {
    accepting = false;
    setTilesEnabled(false);
    tileEls.forEach((el) => el.classList.add("sq-ended"));
    beep(110, 0.5, "sawtooth");
    best = Math.max(best, sequence.length - 1);
    overEl.hidden = false;
    overEl.textContent = `Game over — you reached level ${sequence.length - 1}. Best: ${best}.`;
    statusEl.textContent = "Press Try Again to play again";
    startBtn.textContent = "Try again";
    startRowEl.classList.remove("sq-hidden");
  }

  tileEls.forEach((el, idx) => {
    el.addEventListener("click", async () => {
      if (!accepting) return;
      const token = session;
      await flash(idx, token, 200);
      if (!isCurrent(token)) return;
      if (sequence[playerStep] !== idx) {
        gameOver();
        return;
      }
      playerStep += 1;
      if (playerStep === sequence.length) {
        accepting = false;
        setTilesEnabled(false);
        statusEl.textContent = "Nice! Next round…";
        setTimeout(() => {
          if (isCurrent(token)) nextRound(token);
        }, 700);
      }
    });
  });

  startBtn.addEventListener("click", () => {
    session += 1;
    const token = session;
    sequence = Array.from({ length: startLevel - 1 }, () => Math.floor(Math.random() * TILES.length));
    overEl.hidden = true;
    startRowEl.classList.add("sq-hidden");
    startBtn.textContent = "Restart";
    tileEls.forEach((el) => el.classList.remove("sq-ended"));
    nextRound(token);
  });
}
