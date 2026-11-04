declare module "virtual:player-runtime" {
  /** The compiled student player (src/player), as one script. */
  const code: string;
  export default code;
}

declare module "virtual:code-runtime" {
  /** The compiled Game Lab player (src/codeplayer), as one script. */
  const code: string;
  export default code;
}

declare module "virtual:balloon-sprites" {
  /** Balloon Blast pictures (public/p/balloon), name → data: URL. */
  const sprites: Record<string, string>;
  export default sprites;
}

declare module "*.js?raw" {
  const text: string;
  export default text;
}

declare module "virtual:learn-runtime" {
  /** The compiled Zo app player (src/learnplayer), as one script. */
  const code: string;
  export default code;
}
