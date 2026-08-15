const SYMBOL_SETS: Record<string, string[]> = {
  easy: ["{ }", "( )", "[ ]", "==", "&&", "//"],
  medium: ["{ }", "( )", "[ ]", "==", "&&", "//", "||", "=>"],
  hard: ["{ }", "( )", "[ ]", "==", "&&", "//", "||", "=>", "++", "!=", "::", "<>"],
};

interface Card {
  symbol: string;
  matched: boolean;
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function mountMemoryMatch(root: HTMLElement) {
  root.innerHTML = `
    <div class="mm-wrap">
      <div class="mm-menu" id="mm-menu">
        <p class="mm-label">Choose a difficulty</p>
        <div class="mm-diff-row">
          <button class="pixel-btn secondary" data-diff="easy">Easy · 6 pairs</button>
          <button class="pixel-btn secondary" data-diff="medium">Medium · 8 pairs</button>
          <button class="pixel-btn secondary" data-diff="hard">Hard · 12 pairs</button>
        </div>
      </div>

      <div class="mm-game" id="mm-game" hidden>
        <div class="mm-bar">
          <span id="mm-tries">Tries: 0</span>
          <div class="mm-bar-actions">
            <button class="pixel-btn secondary" id="mm-restart">Restart</button>
            <button class="pixel-btn secondary" id="mm-menu-btn">Menu</button>
          </div>
        </div>
        <div class="mm-board" id="mm-board"></div>
        <p class="mm-solved" id="mm-solved" hidden></p>
      </div>
    </div>
  `;

  const menuEl = root.querySelector<HTMLElement>("#mm-menu")!;
  const gameEl = root.querySelector<HTMLElement>("#mm-game")!;
  const boardEl = root.querySelector<HTMLElement>("#mm-board")!;
  const triesEl = root.querySelector<HTMLElement>("#mm-tries")!;
  const solvedEl = root.querySelector<HTMLElement>("#mm-solved")!;
  const restartBtn = root.querySelector<HTMLButtonElement>("#mm-restart")!;
  const menuBtn = root.querySelector<HTMLButtonElement>("#mm-menu-btn")!;

  let cards: Card[] = [];
  let cols = 4;
  let flipped: number[] = [];
  let matchedCount = 0;
  let tries = 0;
  let busy = false;
  let difficulty = "easy";

  function start(diff: string) {
    difficulty = diff;
    const symbols = SYMBOL_SETS[diff];
    cols = diff === "hard" ? 6 : 4;
    cards = shuffled([...symbols, ...symbols]).map((symbol) => ({ symbol, matched: false }));
    flipped = [];
    matchedCount = 0;
    tries = 0;
    busy = false;
    menuEl.hidden = true;
    gameEl.hidden = false;
    solvedEl.hidden = true;
    render();
  }

  menuEl.querySelectorAll<HTMLButtonElement>("[data-diff]").forEach((btn) => {
    btn.addEventListener("click", () => start(btn.dataset.diff!));
  });
  restartBtn.addEventListener("click", () => start(difficulty));
  menuBtn.addEventListener("click", () => {
    menuEl.hidden = false;
    gameEl.hidden = true;
  });

  function render() {
    boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    boardEl.innerHTML = "";
    cards.forEach((card, idx) => {
      const btn = document.createElement("button");
      const isUp = card.matched || flipped.includes(idx);
      btn.className = "mm-card" + (isUp ? " mm-up" : "") + (card.matched ? " mm-matched" : "");
      btn.textContent = isUp ? card.symbol : "?";
      btn.disabled = isUp || busy;
      btn.addEventListener("click", () => flip(idx));
      boardEl.appendChild(btn);
    });
    triesEl.textContent = `Tries: ${tries}`;
  }

  function flip(idx: number) {
    if (busy || flipped.includes(idx) || cards[idx].matched) return;
    flipped.push(idx);
    render();

    if (flipped.length === 2) {
      tries += 1;
      const [a, b] = flipped;
      if (cards[a].symbol === cards[b].symbol) {
        cards[a].matched = true;
        cards[b].matched = true;
        matchedCount += 1;
        flipped = [];
        render();
        if (matchedCount === cards.length / 2) {
          solvedEl.hidden = false;
          solvedEl.textContent = `Solved in ${tries} tries! 🎉`;
        }
      } else {
        busy = true;
        render();
        setTimeout(() => {
          flipped = [];
          busy = false;
          render();
        }, 800);
      }
    }
  }
}
