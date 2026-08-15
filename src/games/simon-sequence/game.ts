const TILES = [
  { key: "cyan", color: "var(--ghost-cyan)" },
  { key: "pink", color: "var(--ghost-pink)" },
  { key: "orange", color: "var(--ghost-orange)" },
  { key: "red", color: "var(--ghost-red)" },
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

  let sequence: number[] = [];
  let playerStep = 0;
  let accepting = false;
  let best = 0;
  let startLevel = 1;

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

  async function flash(idx: number, duration = 350) {
    const el = tileEls[idx];
    el.classList.add("sq-lit");
    await new Promise((r) => setTimeout(r, duration));
    el.classList.remove("sq-lit");
  }

  async function playSequence() {
    accepting = false;
    setTilesEnabled(false);
    statusEl.textContent = "Watch…";
    await new Promise((r) => setTimeout(r, 500));
    for (const idx of sequence) {
      await flash(idx);
      await new Promise((r) => setTimeout(r, STEP_MS - 350));
    }
    playerStep = 0;
    accepting = true;
    setTilesEnabled(true);
    statusEl.textContent = "Your turn";
  }

  function nextRound() {
    sequence.push(Math.floor(Math.random() * TILES.length));
    levelEl.textContent = `Level: ${sequence.length}`;
    playSequence();
  }

  function gameOver() {
    accepting = false;
    setTilesEnabled(false);
    best = Math.max(best, sequence.length - 1);
    overEl.hidden = false;
    overEl.textContent = `Game over — you reached level ${sequence.length - 1}. Best: ${best}.`;
    statusEl.textContent = "Press Start to try again";
    startBtn.textContent = "Try again";
    startRowEl.classList.remove("sq-hidden");
  }

  tileEls.forEach((el, idx) => {
    el.addEventListener("click", async () => {
      if (!accepting) return;
      await flash(idx, 200);
      if (sequence[playerStep] !== idx) {
        gameOver();
        return;
      }
      playerStep += 1;
      if (playerStep === sequence.length) {
        accepting = false;
        setTilesEnabled(false);
        statusEl.textContent = "Nice! Next round…";
        setTimeout(nextRound, 700);
      }
    });
  });

  startBtn.addEventListener("click", () => {
    sequence = Array.from({ length: startLevel - 1 }, () => Math.floor(Math.random() * TILES.length));
    overEl.hidden = true;
    startRowEl.classList.add("sq-hidden");
    nextRound();
  });
}
