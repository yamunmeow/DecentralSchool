/** Objects for games: balls, fruit, coins, vehicles, buttons. Each is drawn round its centre. */

const L = `stroke="#262b45" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

export interface Thing {
  name: string;
  w: number;
  h: number;
  body: string;
}

const svg = (t: Thing) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${t.w}" height="${t.h}" viewBox="0 0 ${t.w} ${t.h}">${t.body}</svg>`;

export const THINGS: Record<string, Thing> = {
  football: { name: "Football", w: 64, h: 64, body: `<circle cx="32" cy="32" r="28" fill="#fff" ${L}/><path d="M32 18 l11 8 -4 13 h-14 l-4 -13 z" fill="#262b45"/><path d="M32 4 v14 M43 26 l15 -4 M39 39 l9 12 M25 39 l-9 12 M21 26 l-15 -4" stroke="#262b45" stroke-width="2.5"/>` },
  basketball: { name: "Basketball", w: 64, h: 64, body: `<circle cx="32" cy="32" r="28" fill="#e8833a" ${L}/><path d="M4 32 h56 M32 4 v56 M12 12 q14 20 0 40 M52 12 q-14 20 0 40" fill="none" stroke="#262b45" stroke-width="2.5"/>` },
  cricketball: { name: "Cricket ball", w: 48, h: 48, body: `<circle cx="24" cy="24" r="20" fill="#c0392b" ${L}/><path d="M10 12 q14 12 28 24 M14 9 q14 12 28 24" stroke="#f4e3c3" stroke-width="2" fill="none" stroke-dasharray="3 3"/>` },
  star: { name: "Star", w: 72, h: 70, body: `<path d="M36 4 l9 21 23 2 -17 15 5 23 -20 -12 -20 12 5 -23 -17 -15 23 -2 z" fill="#f6c343" ${L}/>` },
  heart: { name: "Heart", w: 64, h: 58, body: `<path d="M32 54 q-28 -18 -28 -36 q0 -14 14 -14 q10 0 14 10 q4 -10 14 -10 q14 0 14 14 q0 18 -28 36 z" fill="#e8546b" ${L}/>` },
  apple: { name: "Apple", w: 60, h: 66, body: `<path d="M30 18 q-24 -8 -26 18 q0 26 20 28 q6 -2 6 -2 q0 0 6 2 q20 -2 20 -28 q-2 -26 -26 -18 z" fill="#e74c3c" ${L}/><path d="M30 18 q0 -10 6 -14" fill="none" ${L}/><path d="M34 10 q10 -8 16 0 q-8 6 -16 0 z" fill="#6ab04c" ${L}/>` },
  mango: { name: "Mango", w: 64, h: 60, body: `<path d="M10 34 q0 -24 26 -26 q22 0 24 20 q2 24 -24 28 q-26 2 -26 -22 z" fill="#f5b041" ${L}/><path d="M40 8 q6 -6 14 -2 q-6 6 -14 2 z" fill="#58a55c" ${L}/>` },
  banana: { name: "Banana", w: 72, h: 50, body: `<path d="M6 12 q6 30 36 32 q22 0 28 -14 q-20 10 -36 4 q-16 -6 -22 -24 z" fill="#f7dc6f" ${L}/>` },
  coin: { name: "Coin", w: 56, h: 56, body: `<circle cx="28" cy="28" r="24" fill="#f6c343" ${L}/><circle cx="28" cy="28" r="16" fill="none" stroke="#c99a1d" stroke-width="3"/><text x="28" y="35" text-anchor="middle" font-family="Arial" font-weight="700" font-size="20" fill="#9a7414">₹</text>` },
  gem: { name: "Gem", w: 60, h: 54, body: `<path d="M14 6 h32 l12 14 -28 30 -28 -30 z" fill="#5dade2" ${L}/><path d="M2 20 h56 M22 6 l8 14 8 -14 M30 20 v30" fill="none" stroke="#262b45" stroke-width="2"/>` },
  key: { name: "Key", w: 72, h: 40, body: `<circle cx="18" cy="20" r="13" fill="#f6c343" ${L}/><circle cx="18" cy="20" r="5" fill="#fff" ${L}/><path d="M31 18 h36 v8 h-6 v-4 h-6 v4 h-6 v-4 h-18 z" fill="#f6c343" ${L}/>` },
  rocket: { name: "Rocket", w: 60, h: 100, body: `<path d="M30 4 q20 20 18 56 h-36 q-2 -36 18 -56 z" fill="#ecf0f1" ${L}/><circle cx="30" cy="34" r="9" fill="#5dade2" ${L}/><path d="M12 60 l-8 18 h14 z M48 60 l8 18 h-14 z" fill="#e74c3c" ${L}/><path d="M22 60 q8 30 16 0 z" fill="#f39c12" ${L}/>` },
  car: { name: "Car", w: 110, h: 60, body: `<path d="M8 40 v-12 q0 -4 6 -6 l14 -2 l12 -12 h30 l16 14 h12 q6 0 6 6 v12 z" fill="#e74c3c" ${L}/><path d="M44 12 h24 l12 10 h-44 z" fill="#d6eaf8" ${L}/><circle cx="30" cy="44" r="10" fill="#2c3e50" ${L}/><circle cx="82" cy="44" r="10" fill="#2c3e50" ${L}/>` },
  bus: { name: "Bus", w: 130, h: 72, body: `<rect x="6" y="6" width="118" height="48" rx="8" fill="#f4c430" ${L}/><path d="M14 14 h22 v16 h-22 z M42 14 h22 v16 h-22 z M70 14 h22 v16 h-22 z M98 14 h18 v24 h-18 z" fill="#d6eaf8" ${L}/><circle cx="30" cy="56" r="10" fill="#2c3e50" ${L}/><circle cx="100" cy="56" r="10" fill="#2c3e50" ${L}/>` },
  tree: { name: "Tree", w: 100, h: 130, body: `<rect x="42" y="78" width="16" height="48" rx="4" fill="#8a5a32" ${L}/><circle cx="50" cy="48" r="38" fill="#58a55c" ${L}/><circle cx="34" cy="40" r="6" fill="#e74c3c"/><circle cx="64" cy="56" r="6" fill="#e74c3c"/>` },
  flower: { name: "Flower", w: 60, h: 90, body: `<path d="M30 40 v46" stroke="#58a55c" stroke-width="5"/><path d="M30 64 q14 -10 18 -2 q-8 8 -18 2 z" fill="#6ab04c" ${L}/>${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="30" cy="20" rx="9" ry="14" fill="#ff8fb1" ${L} transform="rotate(${a} 30 34)"/>`).join("")}<circle cx="30" cy="34" r="8" fill="#f6c343" ${L}/>` },
  cloud: { name: "Cloud", w: 120, h: 70, body: `<path d="M24 60 q-20 0 -18 -18 q2 -16 20 -14 q4 -22 28 -20 q20 0 26 18 q20 -6 28 12 q6 22 -16 22 z" fill="#fff" ${L}/>` },
  sun: { name: "Sun", w: 100, h: 100, body: `${Array.from({ length: 12 }, (_, i) => `<path d="M50 4 v12" stroke="#f39c12" stroke-width="5" stroke-linecap="round" transform="rotate(${i * 30} 50 50)"/>`).join("")}<circle cx="50" cy="50" r="28" fill="#f6c343" ${L}/>` },
  moon: { name: "Moon", w: 70, h: 80, body: `<path d="M44 6 q-30 6 -30 36 q2 30 32 32 q-20 -12 -18 -36 q2 -20 16 -32 z" fill="#f7dc6f" ${L}/>` },
  rock: { name: "Rock", w: 80, h: 50, body: `<path d="M6 44 q0 -22 18 -30 q14 -10 30 -4 q18 6 20 34 z" fill="#95a5a6" ${L}/><path d="M30 24 l6 6 M50 20 l-4 8" stroke="#6c7a7b" stroke-width="3"/>` },
  house: { name: "House", w: 110, h: 100, body: `<path d="M10 46 l45 -40 45 40 z" fill="#c0392b" ${L}/><rect x="20" y="46" width="70" height="48" fill="#f5e6c8" ${L}/><rect x="46" y="64" width="18" height="30" fill="#8a5a32" ${L}/><rect x="26" y="56" width="14" height="14" fill="#d6eaf8" ${L}/><rect x="70" y="56" width="14" height="14" fill="#d6eaf8" ${L}/>` },
  book: { name: "Book", w: 70, h: 56, body: `<path d="M6 10 q14 -6 29 2 q15 -8 29 -2 v40 q-14 -6 -29 2 q-15 -8 -29 -2 z" fill="#fff" ${L}/><path d="M35 12 v40" stroke="#262b45" stroke-width="2"/><path d="M12 20 h16 M12 28 h16 M42 20 h16 M42 28 h16" stroke="#b0b8c8" stroke-width="2"/>` },
  pencil: { name: "Pencil", w: 100, h: 30, body: `<path d="M6 15 l16 -9 h64 v18 h-64 z" fill="#f6c343" ${L}/><path d="M6 15 l16 -9 v18 z" fill="#f5deb3" ${L}/><rect x="86" y="6" width="10" height="18" fill="#ff8fb1" ${L}/>` },
  button: { name: "Button", w: 120, h: 52, body: `<rect x="4" y="4" width="112" height="44" rx="22" fill="#6c5fcf" ${L}/><text x="60" y="34" text-anchor="middle" font-family="Arial" font-weight="700" font-size="22" fill="#fff">GO</text>` },
  arrow: { name: "Arrow", w: 90, h: 50, body: `<path d="M6 18 h50 v-12 l28 19 -28 19 v-12 h-50 z" fill="#4c97ff" ${L}/>` },
  fish: { name: "Fish", w: 90, h: 56, body: `<path d="M14 28 q20 -24 48 -12 l18 -12 v48 l-18 -12 q-28 12 -48 -12 z" fill="#f39c12" ${L}/><circle cx="30" cy="24" r="4" fill="#262b45"/>` },
  butterfly: { name: "Butterfly", w: 80, h: 64, body: `<path d="M40 32 q-30 -40 -36 -8 q2 20 36 8 z M40 32 q30 -40 36 -8 q-2 20 -36 8 z M40 32 q-24 30 -28 16 q0 -10 28 -16 z M40 32 q24 30 28 16 q0 -10 -28 -16 z" fill="#af7ac5" ${L}/><path d="M40 14 v40" stroke="#262b45" stroke-width="5" stroke-linecap="round"/>` },
  bee: { name: "Bee", w: 70, h: 56, body: `<ellipse cx="30" cy="18" rx="12" ry="10" fill="#e8f6ff" ${L}/><ellipse cx="46" cy="16" rx="10" ry="9" fill="#e8f6ff" ${L}/><ellipse cx="36" cy="34" rx="24" ry="16" fill="#f6c343" ${L}/><path d="M28 20 v28 M40 18 v32" stroke="#262b45" stroke-width="5"/><circle cx="56" cy="30" r="3" fill="#262b45"/>` },
  balloon: { name: "Balloon", w: 60, h: 100, body: `<ellipse cx="30" cy="34" rx="24" ry="30" fill="#e8546b" ${L}/><path d="M30 64 q-8 16 4 34" fill="none" stroke="#262b45" stroke-width="2"/>` },
  question: { name: "Question block", w: 64, h: 64, body: `<rect x="4" y="4" width="56" height="56" rx="8" fill="#f6c343" ${L}/><text x="32" y="45" text-anchor="middle" font-family="Arial" font-weight="900" font-size="36" fill="#262b45">?</text>` },
  paddle: { name: "Paddle", w: 120, h: 24, body: `<rect x="3" y="3" width="114" height="18" rx="9" fill="#4c97ff" ${L}/>` },
  brick: { name: "Brick", w: 80, h: 36, body: `<rect x="3" y="3" width="74" height="30" rx="4" fill="#e67e22" ${L}/><path d="M3 18 h74 M40 3 v15 M20 18 v15 M60 18 v15" stroke="#262b45" stroke-width="2"/>` },
  dot: { name: "Dot", w: 20, h: 20, body: `<circle cx="10" cy="10" r="8" fill="#262b45"/>` },
};

export const THING_IDS = Object.keys(THINGS);

export function thingSvg(id: string): string {
  return svg(THINGS[id] || THINGS.star);
}

export function preview(): Record<string, string> {
  return Object.fromEntries(THING_IDS.map((id) => [id, thingSvg(id)]));
}
