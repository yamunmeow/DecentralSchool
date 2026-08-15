import type { RobozzleLevel } from "./levels";

export type Op = "F" | "L" | "R" | "1" | "2" | "3" | "4" | "5";
export type TileColor = "R" | "G" | "B";
export type Condition = TileColor | null;

export interface Instr {
  op: Op;
  color: Condition;
}

export type Program = (Instr | null)[][]; // Program[funcIndex][slotIndex]

const DIR_DELTA: [number, number][] = [
  [-1, 0], // 0 up
  [0, 1], // 1 right
  [1, 0], // 2 down
  [0, -1], // 3 left
];

export type RunStatus = "running" | "won" | "crashed" | "stuck" | "looping";

export interface RunState {
  row: number;
  col: number;
  dir: number;
  items: string[][];
  colors: string[][];
  starsLeft: number;
  stack: { func: number; pc: number }[];
  status: RunStatus;
  steps: number;
  lastPos: [number, number] | null;
}

const MAX_STEPS = 5000;
const MAX_STACK = 60;

export function emptyProgram(subLengths: number[]): Program {
  return subLengths.map((len) => Array(len).fill(null));
}

export function initState(level: RobozzleLevel): RunState {
  const items = level.items.map((row) => row.split(""));
  const colors = level.colors.map((row) => row.split(""));
  const starsLeft = items.flat().filter((c) => c === "*").length;
  return {
    row: level.robotRow,
    col: level.robotCol,
    dir: level.robotDir,
    items,
    colors,
    starsLeft,
    stack: [{ func: 0, pc: 0 }],
    status: starsLeft === 0 ? "won" : "running",
    steps: 0,
    lastPos: null,
  };
}

/** Advance the interpreter by exactly one instruction (or one function return). */
export function step(state: RunState, program: Program): RunState {
  if (state.status !== "running") return state;

  if (state.stack.length === 0) {
    return { ...state, status: state.starsLeft === 0 ? "won" : "stuck" };
  }
  if (state.stack.length > MAX_STACK) {
    return { ...state, status: "looping" };
  }
  if (state.steps > MAX_STEPS) {
    return { ...state, status: "looping" };
  }

  const frame = state.stack[state.stack.length - 1];
  const func = program[frame.func];
  const instr = frame.pc < func.length ? func[frame.pc] : null;

  if (instr === null) {
    // ran off the end of a function, or hit an empty slot: return to caller
    const newStack = state.stack.slice(0, -1);
    if (newStack.length === 0) {
      return { ...state, stack: newStack, status: state.starsLeft === 0 ? "won" : "stuck" };
    }
    return { ...state, stack: newStack, steps: state.steps + 1 };
  }

  // consume this slot before executing, so a recursive call resumes correctly
  const newStack = state.stack.slice(0, -1).concat([{ func: frame.func, pc: frame.pc + 1 }]);
  const tileColor = state.colors[state.row]?.[state.col] as TileColor | undefined;

  if (instr.color !== null && instr.color !== tileColor) {
    // condition doesn't match this tile: skip, do nothing else
    return { ...state, stack: newStack, steps: state.steps + 1 };
  }

  const next: RunState = { ...state, stack: newStack, steps: state.steps + 1 };

  if (instr.op === "F") {
    const [dr, dc] = DIR_DELTA[state.dir];
    const nr = state.row + dr;
    const nc = state.col + dc;
    const row = state.items[nr];
    const tile = row ? row[nc] : undefined;
    if (tile === undefined || tile === "#") {
      return { ...next, status: "crashed", lastPos: [state.row, state.col] };
    }
    next.row = nr;
    next.col = nc;
    if (tile === "*") {
      const newItems = state.items.map((r) => [...r]);
      newItems[nr][nc] = ".";
      next.items = newItems;
      next.starsLeft = state.starsLeft - 1;
      if (next.starsLeft === 0) next.status = "won";
    }
  } else if (instr.op === "L") {
    next.dir = (state.dir + 3) % 4;
  } else if (instr.op === "R") {
    next.dir = (state.dir + 1) % 4;
  } else {
    const funcIdx = Number(instr.op) - 1;
    if (program[funcIdx] && program[funcIdx].length > 0) {
      next.stack = [...next.stack, { func: funcIdx, pc: 0 }];
    }
  }

  return next;
}

export function runToCompletion(level: RobozzleLevel, program: Program, maxSteps = MAX_STEPS) {
  let state = initState(level);
  let guard = 0;
  while (state.status === "running" && guard < maxSteps) {
    state = step(state, program);
    guard++;
  }
  return state;
}
