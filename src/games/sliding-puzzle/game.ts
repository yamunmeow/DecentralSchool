const MIN_N = 3;
const MAX_N = 12;

function solvedBoard(n: number): number[] {
  return [...Array(n * n - 1).keys()].map((i) => i + 1).concat(0);
}

function shuffleBoard(n: number, shuffleFactor = 25): number[] {
  const board = solvedBoard(n);
  let blank = n * n - 1;
  let lastDelta = 0;
  for (let i = 0; i < n * n * shuffleFactor; i++) {
    const r = Math.floor(blank / n);
    const c = blank % n;
    const options: number[] = [];
    const candidates: [number, number, number][] = [
      [-1, 0, -n],
      [1, 0, n],
      [0, -1, -1],
      [0, 1, 1],
    ];
    for (const [dr, dc, delta] of candidates) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && delta !== -lastDelta) {
        options.push(delta);
      }
    }
    const delta = options[Math.floor(Math.random() * options.length)];
    const target = blank + delta;
    [board[blank], board[target]] = [board[target], board[blank]];
    blank = target;
    lastDelta = delta;
  }
  return board;
}

export function mountSlidingPuzzle(root: HTMLElement) {
  root.innerHTML = `
    <div class="sp-wrap">
      <div class="sp-menu" id="sp-menu">
        <p class="sp-label">Grid size</p>
        <div class="sp-size-row">
          <button class="pixel-btn secondary" id="sp-minus">-</button>
          <span class="sp-size" id="sp-size">4 × 4</span>
          <button class="pixel-btn secondary" id="sp-plus">+</button>
        </div>
        <p class="sp-range">min ${MIN_N}×${MIN_N} &nbsp;·&nbsp; max ${MAX_N}×${MAX_N}</p>
        <button class="pixel-btn" id="sp-start">Start</button>
      </div>

      <div class="sp-game" id="sp-game" hidden>
        <div class="sp-bar">
          <span id="sp-moves">Moves: 0</span>
          <div class="sp-bar-actions">
            <button class="pixel-btn secondary" id="sp-shuffle">Shuffle</button>
            <button class="pixel-btn secondary" id="sp-menu-btn">Menu</button>
          </div>
        </div>
        <p class="sp-hint">Click any tile in the blank's row/column to slide that whole line, or use arrow keys.</p>
        <div class="sp-board" id="sp-board"></div>
        <p class="sp-solved" id="sp-solved" hidden>Solved! 🎉</p>
      </div>
    </div>
  `;

  const menuEl = root.querySelector<HTMLElement>("#sp-menu")!;
  const gameEl = root.querySelector<HTMLElement>("#sp-game")!;
  const sizeLabel = root.querySelector<HTMLElement>("#sp-size")!;
  const minusBtn = root.querySelector<HTMLButtonElement>("#sp-minus")!;
  const plusBtn = root.querySelector<HTMLButtonElement>("#sp-plus")!;
  const startBtn = root.querySelector<HTMLButtonElement>("#sp-start")!;
  const boardEl = root.querySelector<HTMLElement>("#sp-board")!;
  const movesEl = root.querySelector<HTMLElement>("#sp-moves")!;
  const solvedEl = root.querySelector<HTMLElement>("#sp-solved")!;
  const shuffleBtn = root.querySelector<HTMLButtonElement>("#sp-shuffle")!;
  const menuBtn = root.querySelector<HTMLButtonElement>("#sp-menu-btn")!;

  let n = 4;
  let board: number[] = [];
  let blank = 0;
  let moves = 0;
  let solved = false;
  let playing = false;

  minusBtn.addEventListener("click", () => {
    n = Math.max(MIN_N, n - 1);
    sizeLabel.textContent = `${n} × ${n}`;
  });
  plusBtn.addEventListener("click", () => {
    n = Math.min(MAX_N, n + 1);
    sizeLabel.textContent = `${n} × ${n}`;
  });

  function startGame() {
    board = shuffleBoard(n);
    blank = board.indexOf(0);
    moves = 0;
    solved = false;
    playing = true;
    menuEl.hidden = true;
    gameEl.hidden = false;
    solvedEl.hidden = true;
    renderBoard();
  }

  startBtn.addEventListener("click", startGame);
  shuffleBtn.addEventListener("click", startGame);
  menuBtn.addEventListener("click", () => {
    playing = false;
    menuEl.hidden = false;
    gameEl.hidden = true;
  });

  function renderBoard() {
    boardEl.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    boardEl.innerHTML = "";
    board.forEach((value, idx) => {
      const cell = document.createElement("button");
      cell.className = "sp-tile";
      if (value === 0) {
        cell.classList.add("sp-blank");
        cell.disabled = true;
      } else {
        cell.textContent = String(value);
        if (value === idx + 1) cell.classList.add("sp-correct");
        cell.addEventListener("click", () => slideToBlank(idx));
      }
      boardEl.appendChild(cell);
    });
    movesEl.textContent = `Moves: ${moves}`;
    solvedEl.hidden = !solved;
  }

  function slideToBlank(idx: number) {
    if (solved || idx === blank) return;
    const r = Math.floor(idx / n);
    const c = idx % n;
    const br = Math.floor(blank / n);
    const bc = blank % n;
    if (r !== br && c !== bc) return;

    let pos = blank;
    if (r === br) {
      const step = c > bc ? 1 : -1;
      for (let col = bc; col !== c; col += step) {
        const src = r * n + col + step;
        board[pos] = board[src];
        pos = src;
      }
    } else {
      const step = r > br ? 1 : -1;
      for (let row = br; row !== r; row += step) {
        const src = (row + step) * n + c;
        board[pos] = board[src];
        pos = src;
      }
    }
    board[idx] = 0;
    blank = idx;
    moves += 1;
    solved = board.every((v, i) => (i === n * n - 1 ? v === 0 : v === i + 1));
    renderBoard();
  }

  document.addEventListener("keydown", (e) => {
    if (!playing || solved) return;
    const r = Math.floor(blank / n);
    const c = blank % n;
    let target: [number, number] | null = null;
    if (e.key === "ArrowUp" && r > 0) target = [r - 1, c];
    else if (e.key === "ArrowDown" && r < n - 1) target = [r + 1, c];
    else if (e.key === "ArrowLeft" && c > 0) target = [r, c - 1];
    else if (e.key === "ArrowRight" && c < n - 1) target = [r, c + 1];
    if (target) {
      e.preventDefault();
      slideToBlank(target[0] * n + target[1]);
    }
  });
}
