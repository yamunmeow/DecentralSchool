import { pointerPos, sizeCanvas } from "../shared/canvas";

const WIDTH = 720;
const HEIGHT = 560;
const SCALE = 36; // pixels per grid unit
const GRID_SIZE = 8;
const ORIGIN_X = WIDTH / 2 - (GRID_SIZE * SCALE) / 2;
const ORIGIN_Y = HEIGHT / 2 - (GRID_SIZE * SCALE) / 2 + 10;
const DRAG_THRESHOLD = 6;

// Verified exact tiling of an 8x8 square -- same geometry as the original
// pygame version (areas + shared edges checked by hand).
const PIECES_DATA: { name: string; color: string; points: [number, number][] }[] = [
  { name: "Large triangle", color: "#df4f4f", points: [[0, 0], [0, 8], [4, 4]] },
  { name: "Large triangle", color: "#4f82df", points: [[0, 8], [8, 8], [4, 4]] },
  { name: "Medium triangle", color: "#e7b437", points: [[4, 0], [8, 0], [8, 4]] },
  { name: "Small triangle", color: "#56b574", points: [[2, 2], [6, 2], [4, 4]] },
  { name: "Small triangle", color: "#b061cf", points: [[8, 4], [8, 8], [6, 6]] },
  { name: "Square", color: "#eb84af", points: [[4, 4], [6, 2], [8, 4], [6, 6]] },
  { name: "Parallelogram", color: "#45bec4", points: [[0, 0], [4, 0], [6, 2], [2, 2]] },
];

class Piece {
  number: number;
  color: string;
  localPoints: [number, number][];
  homePos: [number, number];
  pos: [number, number];
  angle = 0;
  flipped = false;

  constructor(number: number, color: string, gridPoints: [number, number][]) {
    this.number = number;
    this.color = color;
    const cx = gridPoints.reduce((s, p) => s + p[0], 0) / gridPoints.length;
    const cy = gridPoints.reduce((s, p) => s + p[1], 0) / gridPoints.length;
    this.localPoints = gridPoints.map(([x, y]) => [(x - cx) * SCALE, (y - cy) * SCALE]);
    this.homePos = [ORIGIN_X + cx * SCALE, ORIGIN_Y + cy * SCALE];
    this.pos = [...this.homePos];
  }

  reset() {
    this.pos = [...this.homePos];
    this.angle = 0;
    this.flipped = false;
  }

  getPoints(): [number, number][] {
    const rad = (this.angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return this.localPoints.map(([x, y]) => {
      const fx = this.flipped ? -x : x;
      const rx = fx * cos - y * sin;
      const ry = fx * sin + y * cos;
      return [this.pos[0] + rx, this.pos[1] + ry];
    });
  }

  contains(mx: number, my: number): boolean {
    const pts = this.getPoints();
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > my !== yj > my && mx < ((xj - xi) * (my - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  draw(ctx: CanvasRenderingContext2D, selected: boolean, dragging: boolean) {
    const pts = this.getPoints();
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth = selected ? 4 : dragging ? 3 : 2;
    ctx.strokeStyle = selected ? "#ffd400" : "#1a1a1a";
    ctx.stroke();

    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#1a1a1a";
    ctx.stroke();
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(this.number), cx, cy + 1);
  }
}

function scatter(pieces: Piece[]) {
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  for (const p of pieces) {
    p.pos = [60 + Math.random() * (WIDTH - 120), 110 + Math.random() * (HEIGHT - 170)];
    p.angle = angles[Math.floor(Math.random() * angles.length)];
    p.flipped = Math.random() < 0.25;
  }
}

function reassemble(pieces: Piece[]) {
  pieces.forEach((p) => p.reset());
}

export function mountTangram(root: HTMLElement) {
  root.innerHTML = `
    <div class="tg-wrap">
      <p class="tg-hint" id="tg-hint">Tap anywhere to break the square apart!</p>
      <canvas class="tg-canvas" id="tg-canvas" width="${WIDTH}" height="${HEIGHT}"></canvas>
      <div class="tg-controls" id="tg-controls">
        <button class="pixel-btn secondary" id="tg-rotate" disabled>Rotate 45°</button>
        <button class="pixel-btn secondary" id="tg-flip" disabled>Flip</button>
        <button class="pixel-btn secondary" id="tg-reset">Reassemble</button>
        <button class="pixel-btn secondary" id="tg-shuffle">Shuffle</button>
      </div>
    </div>
  `;

  const canvas = root.querySelector<HTMLCanvasElement>("#tg-canvas")!;
  const hint = root.querySelector<HTMLElement>("#tg-hint")!;
  const rotateBtn = root.querySelector<HTMLButtonElement>("#tg-rotate")!;
  const flipBtn = root.querySelector<HTMLButtonElement>("#tg-flip")!;
  const resetBtn = root.querySelector<HTMLButtonElement>("#tg-reset")!;
  const shuffleBtn = root.querySelector<HTMLButtonElement>("#tg-shuffle")!;
  const ctx = sizeCanvas(canvas, WIDTH, HEIGHT);

  let pieces = PIECES_DATA.map((d, i) => new Piece(i + 1, d.color, d.points));
  let disassembled = false;
  let dragging: Piece | null = null;
  let dragOffset: [number, number] = [0, 0];
  let pressed: Piece | null = null;
  let pressPos: [number, number] = [0, 0];
  let selected: Piece | null = null;

  function bringToFront(p: Piece) {
    pieces = pieces.filter((x) => x !== p);
    pieces.push(p);
  }

  function select(p: Piece | null) {
    selected = p;
    if (p) bringToFront(p);
    rotateBtn.disabled = !p;
    flipBtn.disabled = !p;
  }

  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#161622";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (!disassembled) {
      ctx.strokeStyle = "#3a3a52";
      ctx.lineWidth = 2;
      ctx.strokeRect(ORIGIN_X, ORIGIN_Y, GRID_SIZE * SCALE, GRID_SIZE * SCALE);
    }

    for (const p of pieces) p.draw(ctx, p === selected, p === dragging);
    requestAnimationFrame(draw);
  }

  function pos(e: PointerEvent) {
    return pointerPos(canvas, WIDTH, HEIGHT, e);
  }

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    const [mx, my] = pos(e);

    if (!disassembled) {
      scatter(pieces);
      disassembled = true;
      hint.textContent = "Drag a piece to move it. Tap it once to select it, then use the buttons below.";
      return;
    }

    let hit: Piece | null = null;
    for (let i = pieces.length - 1; i >= 0; i--) {
      if (pieces[i].contains(mx, my)) {
        hit = pieces[i];
        break;
      }
    }
    if (hit) {
      pressed = hit;
      pressPos = [mx, my];
      bringToFront(hit);
    } else {
      select(null);
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    const [mx, my] = pos(e);
    if (dragging) {
      dragging.pos = [mx - dragOffset[0], my - dragOffset[1]];
    } else if (pressed) {
      const dx = mx - pressPos[0];
      const dy = my - pressPos[1];
      if (dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
        dragging = pressed;
        dragOffset = [mx - dragging.pos[0], my - dragging.pos[1]];
      }
    }
  });

  canvas.addEventListener("pointerup", () => {
    if (dragging) {
      select(dragging);
    } else if (pressed) {
      select(selected === pressed ? null : pressed);
    }
    dragging = null;
    pressed = null;
  });

  rotateBtn.addEventListener("click", () => {
    if (selected) selected.angle = (selected.angle + 45) % 360;
  });

  flipBtn.addEventListener("click", () => {
    if (selected) selected.flipped = !selected.flipped;
  });

  resetBtn.addEventListener("click", () => {
    reassemble(pieces);
    disassembled = false;
    select(null);
    hint.textContent = "Tap anywhere to break the square apart!";
  });

  shuffleBtn.addEventListener("click", () => {
    if (!disassembled) return;
    scatter(pieces);
    select(null);
  });

  draw();
}
