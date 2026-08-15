export type Category = "logic" | "memory" | "algorithms" | "tinkering";

export interface GameMeta {
  slug: string;
  title: string;
  category: Category;
  blurb: string;
  status: "play" | "soon";
  /** Short line shown only on "coming soon" cards, describing the idea. */
  concept?: string;
}

export const categories: Record<Category, { label: string; ghost: string; color: string }> = {
  logic: { label: "Logic", ghost: "Inky", color: "var(--logic)" },
  memory: { label: "Memory", ghost: "Pinky", color: "var(--memory)" },
  algorithms: { label: "Algorithms", ghost: "Clyde", color: "var(--algorithms)" },
  tinkering: { label: "Tinkering", ghost: "Blinky", color: "var(--tinkering)" },
};

export const games: GameMeta[] = [
  {
    slug: "tangram",
    title: "Tangram",
    category: "tinkering",
    status: "play",
    blurb: "Break apart a 7-piece square. Arrange the 7 pieces into a different shape.",
  },
  {
    slug: "sliding-puzzle",
    title: "Sliding Puzzle",
    category: "logic",
    status: "play",
    blurb: "Slide numbered tiles into order. Pick any grid size from 3×3 up to what fits your screen.",
  },
  {
    slug: "memory-match",
    title: "Memory Match",
    category: "memory",
    status: "play",
    blurb: "Flip two cards at a time, find every pair, beat your best move count.",
  },
  {
    slug: "simon-sequence",
    title: "Simon Sequence",
    category: "memory",
    status: "play",
    blurb: "Watch the tiles light up, then repeat the pattern. It grows by one every round.",
  },
  {
    slug: "robozzle",
    title: "Robozzle",
    category: "algorithms",
    status: "play",
    blurb: "Program a robot to collect every star. The robot has 3 moves and up to 5 functions it can call. These are the original RoboZZle levels, numbered the same as robozzle.com.",
  },
];

export const gamesByCategory = (category: Category) =>
  games.filter((g) => g.category === category);
