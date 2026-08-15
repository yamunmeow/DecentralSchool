import { levels, type RobozzleLevel } from "./levels";
import { beginnerLevels } from "./beginner-levels";

const allLevels = [...beginnerLevels, ...levels];
import { emptyProgram, initState, step, type Instr, type Op, type Condition, type Program, type RunState } from "./engine";
import { sizeCanvas } from "../shared/canvas";

const TILE_COLORS: Record<string, string> = {
  R: "#c8524f",
  G: "#4f9d63",
  B: "#3f6fb0",
};

const DIR_ANGLE = [270, 0, 90, 180]; // degrees, up/right/down/left, 0deg = pointing right

const OP_LABEL: Record<Op, string> = {
  F: "↑",
  L: "←",
  R: "→",
  "1": "F1",
  "2": "F2",
  "3": "F3",
  "4": "F4",
  "5": "F5",
};

const COND_LABEL: Record<string, string> = { none: "Any tile", R: "Red tile", G: "Green tile", B: "Blue tile" };

export function mountRobozzle(root: HTMLElement) {
  root.innerHTML = `
    <div class="rz-wrap">
      <div id="rz-select"></div>
      <div id="rz-player" hidden></div>
    </div>
  `;

  const selectEl = root.querySelector<HTMLElement>("#rz-select")!;
  const playerEl = root.querySelector<HTMLElement>("#rz-player")!;

  let level: RobozzleLevel;
  let program: Program;
  let run: RunState;
  let tool: { op: Op; color: Condition } | "clear" = { op: "F", color: null };
  let timer: ReturnType<typeof setInterval> | null = null;

  function renderSelect() {
    selectEl.hidden = false;
    playerEl.hidden = true;
    selectEl.innerHTML = `
      <section class="rz-level-section">
        <h2 class="rz-section-title">Beginner</h2>
        <p class="rz-hint">4 short levels made for this site, to learn the controls. Not from the original game.</p>
        <div class="rz-level-grid">
          ${beginnerLevels
            .map(
              (l) => `<button class="rz-level-btn rz-level-btn-beginner" data-id="${l.id}">
                <span class="rz-level-num">Beginner ${l.id}</span>
                <span class="rz-level-title">${escapeHtml(l.title)}</span>
              </button>`
            )
            .join("")}
        </div>
      </section>

      <section class="rz-level-section">
        <h2 class="rz-section-title">Original RoboZZle levels</h2>
        <p class="rz-hint">Numbered exactly as they were on the original site.</p>
        <div class="rz-level-grid">
          ${levels
            .map(
              (l) => `<button class="rz-level-btn" data-id="${l.id}">
                <span class="rz-level-num">${l.id}</span>
                <span class="rz-level-title">${escapeHtml(l.title)}</span>
              </button>`
            )
            .join("")}
        </div>
      </section>
    `;
    selectEl.querySelectorAll<HTMLButtonElement>(".rz-level-btn").forEach((btn) => {
      btn.addEventListener("click", () => loadLevel(Number(btn.dataset.id)));
    });
  }

  function loadLevel(id: number) {
    level = allLevels.find((l) => l.id === id)!;
    program = emptyProgram(level.subLengths);
    run = initState(level);
    tool = { op: "F", color: null };
    stopTimer();
    selectEl.hidden = true;
    playerEl.hidden = false;
    renderPlayer();
  }

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function renderPlayer() {
    const funcCount = level.subLengths.filter((n) => n > 0).length;
    playerEl.innerHTML = `
      <button class="pixel-btn secondary rz-back">← All levels</button>
      <div class="rz-title-row">
        <h2>Level ${level.id}: ${escapeHtml(level.title)}</h2>
        <span class="rz-author">${level.author ? `by ${escapeHtml(level.author)}` : "community level"}</span>
      </div>
      ${level.about ? `<p class="rz-about">${escapeHtml(level.about)}</p>` : ""}

      <div class="rz-layout">
        <div class="rz-board-col">
          <canvas id="rz-canvas"></canvas>
          <p class="rz-status" id="rz-status"></p>
          <div class="rz-controls">
            <button class="pixel-btn" id="rz-run">Run</button>
            <button class="pixel-btn secondary" id="rz-step">Step</button>
            <button class="pixel-btn secondary" id="rz-reset">Reset</button>
          </div>
        </div>

        <div class="rz-editor-col">
          <p class="rz-editor-label">Program</p>
          <div id="rz-functions"></div>

          <p class="rz-editor-label">Place</p>
          <div class="rz-palette" id="rz-palette-ops">
            ${(["F", "L", "R"] as Op[])
              .map((op) => `<button class="rz-tool" data-op="${op}" title="${opTitle(op)}">${OP_LABEL[op]}</button>`)
              .join("")}
            ${(["1", "2", "3", "4", "5"] as Op[])
              .filter((op) => level.subLengths[Number(op) - 1] > 0)
              .map((op) => `<button class="rz-tool" data-op="${op}" title="Call ${OP_LABEL[op]}">${OP_LABEL[op]}</button>`)
              .join("")}
            <button class="rz-tool rz-tool-clear" data-op="clear" title="Clear a slot">✕</button>
          </div>

          <p class="rz-editor-label">When standing on…</p>
          <div class="rz-palette" id="rz-palette-colors">
            <button class="rz-color-tool active" data-color="none" title="${COND_LABEL.none}"></button>
            <button class="rz-color-tool" data-color="R" style="--c: ${TILE_COLORS.R}" title="${COND_LABEL.R}"></button>
            <button class="rz-color-tool" data-color="G" style="--c: ${TILE_COLORS.G}" title="${COND_LABEL.G}"></button>
            <button class="rz-color-tool" data-color="B" style="--c: ${TILE_COLORS.B}" title="${COND_LABEL.B}"></button>
          </div>
          <p class="rz-note">${funcCount} function${funcCount === 1 ? "" : "s"} unlocked for this level.</p>
        </div>
      </div>
    `;

    playerEl.querySelector<HTMLButtonElement>(".rz-back")!.addEventListener("click", () => {
      stopTimer();
      renderSelect();
    });

    const canvas = playerEl.querySelector<HTMLCanvasElement>("#rz-canvas")!;
    const ctx = setupCanvas(canvas, level);

    renderFunctions();
    bindPalette();
    bindControls(ctx);
    draw(ctx);
    updateStatus();
  }

  function opTitle(op: Op) {
    if (op === "F") return "Move forward";
    if (op === "L") return "Turn left";
    return "Turn right";
  }

  function renderFunctions() {
    const el = playerEl.querySelector<HTMLElement>("#rz-functions")!;
    el.innerHTML = level.subLengths
      .map((len, fi) => {
        if (len === 0) return "";
        const slots = program[fi]
          .map((instr, si) => slotHtml(instr, fi, si))
          .join("");
        return `<div class="rz-func-row"><span class="rz-func-label">F${fi + 1}</span><div class="rz-slots">${slots}</div></div>`;
      })
      .join("");

    el.querySelectorAll<HTMLElement>(".rz-slot").forEach((slotEl) => {
      slotEl.addEventListener("click", () => {
        const fi = Number(slotEl.dataset.fi);
        const si = Number(slotEl.dataset.si);
        if (tool === "clear") {
          program[fi][si] = null;
        } else {
          program[fi][si] = { op: tool.op, color: tool.color };
        }
        renderFunctions();
      });
    });
  }

  function slotHtml(instr: Instr | null, fi: number, si: number) {
    if (!instr) {
      return `<button class="rz-slot rz-slot-empty" data-fi="${fi}" data-si="${si}"></button>`;
    }
    const bg = instr.color ? TILE_COLORS[instr.color] : "var(--panel-raised)";
    return `<button class="rz-slot" data-fi="${fi}" data-si="${si}" data-op="${instr.op}" style="--slot-bg:${bg}">${OP_LABEL[instr.op]}</button>`;
  }

  function bindPalette() {
    const opButtons = playerEl.querySelectorAll<HTMLButtonElement>("#rz-palette-ops .rz-tool");
    opButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        opButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if (btn.dataset.op === "clear") {
          tool = "clear";
        } else {
          const currentColor = tool === "clear" ? null : tool.color;
          tool = { op: btn.dataset.op as Op, color: currentColor };
        }
      });
    });
    opButtons[0]?.classList.add("active");

    const colorButtons = playerEl.querySelectorAll<HTMLButtonElement>("#rz-palette-colors .rz-color-tool");
    colorButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        colorButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const c = btn.dataset.color === "none" ? null : (btn.dataset.color as Condition);
        if (tool !== "clear") tool = { op: tool.op, color: c };
      });
    });
  }

  function bindControls(ctx: CanvasRenderingContext2D) {
    const runBtn = playerEl.querySelector<HTMLButtonElement>("#rz-run")!;
    const stepBtn = playerEl.querySelector<HTMLButtonElement>("#rz-step")!;
    const resetBtn = playerEl.querySelector<HTMLButtonElement>("#rz-reset")!;

    runBtn.addEventListener("click", () => {
      if (run.status !== "running") run = initState(level);
      stopTimer();
      timer = setInterval(() => {
        run = step(run, program);
        draw(ctx);
        updateStatus();
        if (run.status !== "running") stopTimer();
      }, 260);
    });

    stepBtn.addEventListener("click", () => {
      if (run.status !== "running") run = initState(level);
      run = step(run, program);
      draw(ctx);
      updateStatus();
    });

    resetBtn.addEventListener("click", () => {
      stopTimer();
      run = initState(level);
      draw(ctx);
      updateStatus();
    });
  }

  function updateStatus() {
    const el = playerEl.querySelector<HTMLElement>("#rz-status")!;
    const messages: Record<RunState["status"], string> = {
      running: `${run.starsLeft} star${run.starsLeft === 1 ? "" : "s"} left`,
      won: "Solved! ⭐ All stars collected.",
      crashed: "The robot walked off the grid. Reset and try again.",
      stuck: `Program ended with ${run.starsLeft} star${run.starsLeft === 1 ? "" : "s"} still left.`,
      looping: "That program loops forever without solving it — check your recursion.",
    };
    el.textContent = messages[run.status];
    el.className = "rz-status rz-status-" + run.status;
  }

  // ---------- grid rendering ----------

  function setupCanvas(canvas: HTMLCanvasElement, lvl: RobozzleLevel) {
    const rows = lvl.items.length;
    const cols = lvl.items[0].length;
    const tile = Math.max(24, Math.min(52, Math.floor(Math.min(560 / cols, 420 / rows))));
    const w = cols * tile;
    const h = rows * tile;
    canvas.style.width = "100%";
    canvas.style.maxWidth = `${w}px`;
    canvas.style.aspectRatio = `${w} / ${h}`;
    return sizeCanvas(canvas, w, h);
  }

  function draw(ctx: CanvasRenderingContext2D) {
    const rows = level.items.length;
    const cols = level.items[0].length;
    const tile = Math.max(24, Math.min(52, Math.floor(Math.min(560 / cols, 420 / rows))));
    ctx.clearRect(0, 0, cols * tile, rows * tile);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = run.items[r][c];
        if (cell === "#") continue;
        const color = run.colors[r][c];
        ctx.fillStyle = TILE_COLORS[color] || "#333";
        ctx.fillRect(c * tile, r * tile, tile - 2, tile - 2);

        if (cell === "*") {
          ctx.fillStyle = "#fff3a0";
          drawStar(ctx, c * tile + tile / 2, r * tile + tile / 2, tile * 0.22);
        }
      }
    }

    // robot
    const cx = run.col * tile + tile / 2;
    const cy = run.row * tile + tile / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((DIR_ANGLE[run.dir] * Math.PI) / 180);
    ctx.beginPath();
    const s = tile * 0.32;
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.7, s * 0.75);
    ctx.lineTo(-s * 0.7, -s * 0.75);
    ctx.closePath();
    ctx.fillStyle = "#ffd400";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1a1a1a";
    ctx.stroke();
    ctx.restore();
  }

  function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? r : r * 0.45;
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  renderSelect();
}

function escapeHtml(s: string) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
