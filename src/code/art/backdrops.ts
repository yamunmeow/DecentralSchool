/** Stage backdrops, 480 × 360 like Scratch's stage. */

export interface Backdrop {
  name: string;
  body: string;
}

const W = 480;
const H = 360;
const L = `stroke="#262b45" stroke-width="3" stroke-linejoin="round"`;
const sky = (top: string, bottom: string, id: string) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})"/>`;
const stars = (n: number, seed: number) =>
  Array.from({ length: n }, (_, i) => {
    const x = (i * 97 + seed * 31) % W;
    const y = (i * 53 + seed * 17) % (H - 60);
    return `<circle cx="${x}" cy="${y}" r="${1 + (i % 3) * 0.7}" fill="#fff" opacity="${0.5 + (i % 4) * 0.12}"/>`;
  }).join("");

export const BACKDROPS: Record<string, Backdrop> = {
  white: { name: "White", body: `<rect width="${W}" height="${H}" fill="#ffffff"/>` },
  paper: { name: "Paper", body: `<rect width="${W}" height="${H}" fill="#fbf6ee"/>${Array.from({ length: 11 }, (_, i) => `<path d="M0 ${40 + i * 30} h${W}" stroke="#d6e4f0" stroke-width="2"/>`).join("")}<path d="M60 0 v${H}" stroke="#f3b6b6" stroke-width="2"/>` },
  grid: {
    name: "XY grid",
    body: `<rect width="${W}" height="${H}" fill="#ffffff"/>${Array.from({ length: 25 }, (_, i) => `<path d="M${i * 20} 0 v${H}" stroke="#e6ecf5" stroke-width="1"/>`).join("")}${Array.from({ length: 19 }, (_, i) => `<path d="M0 ${i * 20} h${W}" stroke="#e6ecf5" stroke-width="1"/>`).join("")}${Array.from({ length: 5 }, (_, i) => `<path d="M${i * 100 + 40} 0 v${H}" stroke="#c5d3e8" stroke-width="1.5"/><text x="${i * 100 + 43}" y="${H / 2 - 4}" font-family="Arial" font-size="11" fill="#7f8fa6">${i * 100 - 200}</text>`).join("")}${[-100, 100].map((y) => `<text x="${W / 2 + 4}" y="${H / 2 - y + 4}" font-family="Arial" font-size="11" fill="#7f8fa6">${y}</text>`).join("")}<path d="M0 ${H / 2} h${W} M${W / 2} 0 v${H}" stroke="#7f8fa6" stroke-width="2"/><text x="${W - 14}" y="${H / 2 - 6}" font-family="Arial" font-size="13" fill="#4c5a70">x</text><text x="${W / 2 + 6}" y="14" font-family="Arial" font-size="13" fill="#4c5a70">y</text>`,
  },
  classroom: {
    name: "Classroom",
    body: `<rect width="${W}" height="${H}" fill="#f5e6c8"/><rect y="250" width="${W}" height="110" fill="#c9a26b"/><rect x="90" y="40" width="300" height="150" rx="6" fill="#2f5d4a" ${L}/><rect x="80" y="186" width="320" height="10" fill="#8a5a32"/><path d="M120 80 h80 M120 110 h140 M120 140 h60" stroke="#e8f0e8" stroke-width="4" stroke-linecap="round" opacity="0.8"/><text x="300" y="120" font-family="Arial" font-size="28" fill="#e8f0e8" opacity="0.85">2+3=5</text><circle cx="430" cy="60" r="26" fill="#fff" ${L}/><path d="M430 60 v-16 M430 60 h12" stroke="#262b45" stroke-width="3"/><rect x="40" y="270" width="110" height="14" fill="#8a5a32" ${L}/><rect x="330" y="270" width="110" height="14" fill="#8a5a32" ${L}/>`,
  },
  park: {
    name: "Park",
    body: `${sky("#9fd3ff", "#e3f4ff", "pk")}<circle cx="400" cy="60" r="34" fill="#f6c343"/><path d="M0 250 q120 -40 240 0 q120 40 240 -10 v120 h-480 z" fill="#7ec46d"/><path d="M0 290 q140 -20 260 10 q120 26 220 0 v60 h-480 z" fill="#5fae55"/><rect x="70" y="170" width="16" height="80" fill="#8a5a32"/><circle cx="78" cy="150" r="44" fill="#4f9a4a"/><rect x="380" y="190" width="14" height="70" fill="#8a5a32"/><circle cx="387" cy="172" r="36" fill="#4f9a4a"/><path d="M60 110 q20 -14 40 0 q20 -14 40 0" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="0.9"/>`,
  },
  space: {
    name: "Space",
    body: `${sky("#0b1030", "#2a1d5c", "sp")}${stars(80, 3)}<circle cx="380" cy="90" r="46" fill="#e8833a"/><ellipse cx="380" cy="90" rx="74" ry="14" fill="none" stroke="#f6c343" stroke-width="5" transform="rotate(-18 380 90)"/><circle cx="90" cy="300" r="120" fill="#8d9fd8" opacity="0.9"/><circle cx="60" cy="270" r="14" fill="#7586c2"/><circle cx="130" cy="320" r="20" fill="#7586c2"/>`,
  },
  underwater: {
    name: "Underwater",
    body: `${sky("#3fa7d6", "#0b4f75", "uw")}${Array.from({ length: 14 }, (_, i) => `<circle cx="${(i * 71) % W}" cy="${(i * 113) % 300}" r="${3 + (i % 4) * 2}" fill="none" stroke="#bfe9ff" stroke-width="2" opacity="0.7"/>`).join("")}<path d="M0 320 q60 -20 120 0 q80 20 160 -6 q100 -24 200 6 v40 h-480 z" fill="#e9d29a"/>${[40, 140, 400, 440].map((x) => `<path d="M${x} 330 q-14 -40 4 -80 q14 -30 -2 -60" fill="none" stroke="#2e8b57" stroke-width="8" stroke-linecap="round"/>`).join("")}`,
  },
  city: {
    name: "City",
    body: `${sky("#ffd29d", "#ffeedd", "ct")}${[
      [10, 140, 70, "#5d6d8a"], [86, 90, 60, "#7586c2"], [152, 170, 80, "#4c5a7a"], [238, 120, 66, "#8d9fd8"], [310, 60, 74, "#5d6d8a"], [390, 150, 80, "#6c5fcf"],
    ].map(([x, y, w, c]) => `<rect x="${x}" y="${y}" width="${w}" height="${300 - (y as number)}" fill="${c}"/>${Array.from({ length: 6 }, (_, k) => `<rect x="${(x as number) + 10 + (k % 2) * ((w as number) / 2 - 4)}" y="${(y as number) + 14 + Math.floor(k / 2) * 30}" width="12" height="16" fill="#ffe9a8"/>`).join("")}`).join("")}<rect y="300" width="${W}" height="60" fill="#4a4a5a"/><path d="M0 330 h${W}" stroke="#f6c343" stroke-width="5" stroke-dasharray="30 20"/>`,
  },
  village: {
    name: "Village",
    body: `${sky("#b8e1ff", "#f2f9ff", "vg")}<path d="M0 220 l90 -110 70 70 80 -100 110 120 80 -60 50 40 v120 h-480 z" fill="#a9b7d6"/><rect y="230" width="${W}" height="130" fill="#9ccc65"/>${[60, 240, 380].map((x) => `<rect x="${x}" y="200" width="70" height="56" fill="#e6c89a" ${L}/><path d="M${x - 10} 204 l45 -40 45 40 z" fill="#c0832f" ${L}/><rect x="${x + 26}" y="226" width="18" height="30" fill="#8a5a32" ${L}/>`).join("")}`,
  },
  desert: {
    name: "Desert",
    body: `${sky("#ffcf8a", "#fff1d6", "ds")}<circle cx="110" cy="80" r="40" fill="#fff3b0"/><path d="M0 250 q120 -50 260 -10 q120 30 220 -20 v140 h-480 z" fill="#f2c46d"/><path d="M0 300 q160 -30 300 0 q100 20 180 -6 v66 h-480 z" fill="#e8b257"/><path d="M380 250 v-60 q0 -10 10 -10 q10 0 10 10 v60 M380 220 h-14 v-20 M400 210 h14 v-16" fill="none" stroke="#3f8f4a" stroke-width="12" stroke-linecap="round"/>`,
  },
  jungle: {
    name: "Jungle",
    body: `${sky("#5cbf7a", "#d9f2c4", "jg")}${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 60} 360 q-30 -140 ${20 + (i % 3) * 10} -260" fill="none" stroke="#2e7d32" stroke-width="${10 + (i % 3) * 4}" stroke-linecap="round"/><ellipse cx="${i * 60 + 20}" cy="${100 + (i % 3) * 20}" rx="50" ry="26" fill="#388e3c"/>`).join("")}<rect y="320" width="${W}" height="40" fill="#5d4037"/>`,
  },
  night: {
    name: "Night",
    body: `${sky("#141b3f", "#3a3f78", "nt")}${stars(60, 7)}<circle cx="400" cy="70" r="30" fill="#f7f1c8"/><path d="M0 280 q100 -40 200 0 q140 40 280 -10 v90 h-480 z" fill="#1e2a4a"/>`,
  },
  pitch: {
    name: "Football pitch",
    body: `<rect width="${W}" height="${H}" fill="#4caf50"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${i * 60}" width="30" height="${H}" fill="#43a047"/>`).join("")}<rect x="20" y="20" width="440" height="320" fill="none" stroke="#fff" stroke-width="4"/><path d="M240 20 v320" stroke="#fff" stroke-width="4"/><circle cx="240" cy="180" r="44" fill="none" stroke="#fff" stroke-width="4"/><rect x="20" y="120" width="50" height="120" fill="none" stroke="#fff" stroke-width="4"/><rect x="410" y="120" width="50" height="120" fill="none" stroke="#fff" stroke-width="4"/>`,
  },
  theatre: {
    name: "Theatre",
    body: `<rect width="${W}" height="${H}" fill="#2a1d3c"/><rect y="270" width="${W}" height="90" fill="#8a5a32"/><path d="M0 0 h120 q-20 160 0 290 h-120 z M480 0 h-120 q20 160 0 290 h120 z" fill="#b0283f"/><path d="M0 0 h${W} v40 q-240 30 -480 0 z" fill="#c0392b"/><ellipse cx="240" cy="280" rx="140" ry="14" fill="#f6e3a1" opacity="0.4"/>`,
  },
};

export const BACKDROP_IDS = Object.keys(BACKDROPS);

export function backdropSvg(id: string): string {
  const b = BACKDROPS[id] || BACKDROPS.white;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${b.body}</svg>`;
}

export function preview(): Record<string, string> {
  return Object.fromEntries(BACKDROP_IDS.map((id) => [id, backdropSvg(id)]));
}
