import type { Tint } from "../shared/types";

export type Color = Tint;
export type CritterKind =
  | "cat" | "bunny" | "bear" | "frog" | "chick" | "fox" | "owl" | "mouse"
  | "whale" | "turtle" | "hedgehog" | "squirrel" | "pig" | "panda" | "duck" | "star"
  | "dog" | "koala" | "penguin" | "sheep" | "elephant" | "octopus" | "dino" | "monkey";

/**
 * tint = card wash, soft = illustration fill, deep = accents, ink = text on tint.
 * tint and ink are theme tokens (light and dark live in styles.css); soft and deep
 * colour the illustrations and look the same in both themes.
 */
export const PALETTE: Record<Color, { tint: string; soft: string; deep: string; ink: string }> = {
  lilac: { tint: "var(--t-lilac)", soft: "#dcd0f7", deep: "#a693de", ink: "var(--i-lilac)" },
  sky: { tint: "var(--t-sky)", soft: "#c6e2f6", deep: "#80b6dd", ink: "var(--i-sky)" },
  peach: { tint: "var(--t-peach)", soft: "#fbd7c0", deep: "#eba57f", ink: "var(--i-peach)" },
  mint: { tint: "var(--t-mint)", soft: "#c2ebdb", deep: "#70c4a2", ink: "var(--i-mint)" },
  lemon: { tint: "var(--t-lemon)", soft: "#f8e7a8", deep: "#e3c45d", ink: "var(--i-lemon)" },
  sage: { tint: "var(--t-sage)", soft: "#d1e5c7", deep: "#92bf80", ink: "var(--i-sage)" },
  rose: { tint: "var(--t-rose)", soft: "#f8ced8", deep: "#e693a8", ink: "var(--i-rose)" },
  sand: { tint: "var(--t-sand)", soft: "#eadfcf", deep: "#c6b090", ink: "var(--i-sand)" },
};

/** Light-theme hex values, for things drawn outside the page (APK icons). */
export const ICON_BG: Record<Color, string> = {
  lilac: "#ece4fb", sky: "#dcedf9", peach: "#fde5d4", mint: "#d9f2e7", lemon: "#fbf0c4", sage: "#e1eed9", rose: "#fbdde5", sand: "#f1e8db",
};

/** Critter shown for each kind of game. */
export const TEMPLATE_CRITTER: Record<string, CritterKind> = {
  quiz: "owl", math: "fox", grammar: "cat", vocab: "bunny", reading: "turtle", custom: "octopus",
};
