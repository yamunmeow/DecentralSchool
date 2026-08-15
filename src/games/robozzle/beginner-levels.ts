import type { RobozzleLevel } from "./levels";

// Hand-made practice levels, not from the original RoboZZle game -- these
// exist purely to teach the controls before jumping into the real campaign
// in levels.ts. Ids 1-4 are used here since they don't collide with the
// real archive (its lowest id is 14).
export const beginnerLevels: RobozzleLevel[] = [
  {
    id: 1,
    title: "One step",
    about: "Move forward once to reach the star.",
    author: null,
    items: [".*"],
    colors: ["BB"],
    robotRow: 0,
    robotCol: 0,
    robotDir: 1,
    subLengths: [1, 0, 0, 0, 0],
  },
  {
    id: 2,
    title: "Three steps",
    about: "The same move, repeated. Place Forward in each of the 3 slots.",
    author: null,
    items: ["...*"],
    colors: ["BBBB"],
    robotRow: 0,
    robotCol: 0,
    robotDir: 1,
    subLengths: [3, 0, 0, 0, 0],
  },
  {
    id: 3,
    title: "One turn",
    about: "Move forward twice, turn right, then move forward twice more.",
    author: null,
    items: ["...", "##.", "##*"],
    colors: ["BBB", "BBB", "BBB"],
    robotRow: 0,
    robotCol: 0,
    robotDir: 1,
    subLengths: [5, 0, 0, 0, 0],
  },
  {
    id: 4,
    title: "Two stars",
    about: "Forward, repeated, picks up every star it passes over.",
    author: null,
    items: [".*.*"],
    colors: ["BBBB"],
    robotRow: 0,
    robotCol: 0,
    robotDir: 1,
    subLengths: [3, 0, 0, 0, 0],
  },
];
