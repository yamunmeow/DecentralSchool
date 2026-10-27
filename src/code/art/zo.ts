/**
 * Zo, the DecentralSchool elephant, drawn in code so every job and pose can be made from
 * one skeleton. Colours: blue-lavender skin, navy bowl-cut hair, striped blue shirt with an orange collar.
 *
 * The drawing faces right (Scratch's direction 90). Units: a 160 × 200 box.
 */

/** Image size and rotation centre (pixels from the image's top-left). */
export const ZO_W = 200;
export const ZO_H = 250;
export const ZO_CX = 100;
export const ZO_CY = 152;

export type Pose = "stand" | "walk1" | "walk2" | "jump" | "wave" | "cheer";
export const POSES: Pose[] = ["stand", "walk1", "walk2", "jump", "wave", "cheer"];
export const POSE_NAMES: Record<Pose, string> = { stand: "stand", walk1: "walk 1", walk2: "walk 2", jump: "jump", wave: "wave", cheer: "cheer" };

const LINE = "#262b45";
const SKIN = "#8d9fd8";
const SKIN_DARK = "#7586c2";
const EAR_IN = "#b3bdea";
const HAIR = "#1f2443";

interface Outfit {
  name: string;
  shirt: string;
  /** Stripes across the shirt. */
  stripe?: string;
  collar?: string;
  pants: string;
  shoes: string;
  /** Long coat or robe over the body. */
  coat?: string;
  hat?: string;
  hair?: boolean;
  extras?: string[];
  /** A small badge or number on the chest. */
  badge?: string;
  /** Smaller and rounder: baby Zo. */
  baby?: boolean;
  /** Metal skin: robot Zo. */
  robot?: boolean;
}

export const OUTFITS: Record<string, Outfit> = {
  zo: { name: "Zo", shirt: "#2f6db3", stripe: "#d7b98b", collar: "#eaa23a", pants: "#3b4a74", shoes: "#5b3b24", hair: true },
  student: { name: "Zo Student", shirt: "#f4f6fb", collar: "#c0392b", pants: "#2d3e66", shoes: "#2b2b2b", hair: true, extras: ["tie", "backpack"] },
  teacher: { name: "Zo Teacher", shirt: "#7a4ea8", collar: "#f1e4ff", pants: "#3a3350", shoes: "#5b3b24", hair: true, extras: ["glasses", "book"] },
  chef: { name: "Zo Chef", shirt: "#ffffff", collar: "#e74c3c", pants: "#3a3a3a", shoes: "#2b2b2b", coat: "#ffffff", hat: "chef", extras: ["apron", "spoon"] },
  astronaut: { name: "Zo Astronaut", shirt: "#eef1f6", collar: "#9aa5b8", pants: "#eef1f6", shoes: "#8a94a6", hat: "helmet", extras: ["flag", "pack"] },
  footballer: { name: "Zo Footballer", shirt: "#e8423c", stripe: "#ffffff", collar: "#ffffff", pants: "#ffffff", shoes: "#1f1f1f", hair: true, badge: "10", extras: ["socks"] },
  cricketer: { name: "Zo Cricketer", shirt: "#f7f4ea", collar: "#2c63b5", pants: "#f7f4ea", shoes: "#ffffff", hat: "cap-blue", extras: ["bat", "pads"] },
  scientist: { name: "Zo Scientist", shirt: "#4aa3a2", collar: "#ffffff", pants: "#3a4157", shoes: "#2b2b2b", coat: "#fbfbfb", hair: true, extras: ["goggles", "flask"] },
  doctor: { name: "Zo Doctor", shirt: "#7fc8b7", collar: "#ffffff", pants: "#4a6a8a", shoes: "#2b2b2b", coat: "#fbfbfb", hair: true, extras: ["stethoscope"] },
  firefighter: { name: "Zo Firefighter", shirt: "#f2c230", stripe: "#d8dde6", collar: "#f2c230", pants: "#f2c230", shoes: "#2b2b2b", hat: "fire", extras: ["hose"] },
  pilot: { name: "Zo Pilot", shirt: "#ffffff", collar: "#1c2f5c", pants: "#1c2f5c", shoes: "#1f1f1f", coat: "#1c2f5c", hat: "pilot", extras: ["wings"] },
  artist: { name: "Zo Artist", shirt: "#f7efe1", collar: "#e67e22", pants: "#5b6f8f", shoes: "#5b3b24", hat: "beret", extras: ["paint", "brush"] },
  musician: { name: "Zo Musician", shirt: "#2b2b3b", collar: "#f1c40f", pants: "#3a3350", shoes: "#1f1f1f", hair: true, badge: "♪", extras: ["headphones", "guitar"] },
  farmer: { name: "Zo Farmer", shirt: "#d2493a", stripe: "#f2d0c8", collar: "#d2493a", pants: "#3c68a8", shoes: "#6b4a2b", hat: "straw", extras: ["overalls"] },
  builder: { name: "Zo Builder", shirt: "#4d6aa0", collar: "#4d6aa0", pants: "#6b5a48", shoes: "#5b3b24", hat: "hardhat", extras: ["vest", "hammer"] },
  detective: { name: "Zo Detective", shirt: "#d9c8a6", collar: "#7a5a32", pants: "#5a4a35", shoes: "#3b2b1b", coat: "#b8945e", hat: "detective", extras: ["magnifier"] },
  pirate: { name: "Zo Pirate", shirt: "#ffffff", stripe: "#c0392b", collar: "#c0392b", pants: "#2c2c3c", shoes: "#3b2b1b", hat: "pirate", extras: ["patch"] },
  wizard: { name: "Zo Wizard", shirt: "#4b3aa0", collar: "#f1c40f", pants: "#4b3aa0", shoes: "#2b2b3b", coat: "#4b3aa0", hat: "wizard", extras: ["wand", "stars"] },
  royal: { name: "Zo Royal", shirt: "#8e2c48", collar: "#f1c40f", pants: "#5a1f30", shoes: "#2b1b1b", hat: "crown", hair: true, extras: ["cape"] },
  ninja: { name: "Zo Ninja", shirt: "#26283a", collar: "#26283a", pants: "#26283a", shoes: "#1a1b26", hat: "ninja", extras: ["belt"] },
  hero: { name: "Zo Hero", shirt: "#2f6db3", collar: "#e8423c", pants: "#e8423c", shoes: "#e8423c", hair: true, badge: "★", extras: ["cape-red", "mask"] },
  diver: { name: "Zo Diver", shirt: "#1d3557", stripe: "#f4a261", collar: "#1d3557", pants: "#1d3557", shoes: "#f4a261", extras: ["snorkel", "tank"] },
  explorer: { name: "Zo Explorer", shirt: "#c2a774", collar: "#8a6d3b", pants: "#7a6a48", shoes: "#5b3b24", hat: "safari", extras: ["binoculars"] },
  dancer: { name: "Zo Dancer", shirt: "#ff8fb1", collar: "#ffd1dc", pants: "#ff8fb1", shoes: "#ff5c8a", hair: true, extras: ["tutu", "bow"] },
  postal: { name: "Zo Postie", shirt: "#e3b23c", collar: "#c0392b", pants: "#2d3e66", shoes: "#2b2b2b", hat: "cap-red", extras: ["bag"] },
  graduate: { name: "Zo Graduate", shirt: "#1f2443", collar: "#f1c40f", pants: "#1f2443", shoes: "#1f1f1f", coat: "#1f2443", hat: "mortarboard", extras: ["scroll"] },
  baby: { name: "Baby Zo", shirt: "#bfe3ff", collar: "#ffffff", pants: "#bfe3ff", shoes: "#ffffff", baby: true, extras: ["bib"] },
  robot: { name: "Robo Zo", shirt: "#c7cfdc", collar: "#5dade2", pants: "#9aa5b8", shoes: "#5f6b80", robot: true, badge: "●", extras: ["antenna"] },
};

export const OUTFIT_IDS = Object.keys(OUTFITS);

interface Limbs {
  armL: number;
  armR: number;
  legL: number;
  legR: number;
  lift: number;
  happy: boolean;
}

const POSE_LIMBS: Record<Pose, Limbs> = {
  stand: { armL: 10, armR: -10, legL: 0, legR: 0, lift: 0, happy: false },
  walk1: { armL: -22, armR: 22, legL: -18, legR: 18, lift: 2, happy: false },
  walk2: { armL: 22, armR: -22, legL: 18, legR: -18, lift: 2, happy: false },
  jump: { armL: 130, armR: -130, legL: -26, legR: 26, lift: 12, happy: true },
  wave: { armL: 10, armR: -150, legL: 0, legR: 0, lift: 0, happy: true },
  cheer: { armL: 160, armR: -160, legL: -8, legR: 8, lift: 4, happy: true },
};

const stroke = `stroke="${LINE}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

function hat(kind: string): string {
  switch (kind) {
    case "chef":
      return `<g ${stroke}><path d="M44 40 h58 v-12 h-58 z" fill="#fff"/><path d="M42 30 c-14 -4 -12 -26 4 -24 c2 -14 22 -16 28 -6 c8 -10 28 -6 26 8 c14 -2 18 18 4 22 z" fill="#fff"/></g>`;
    case "helmet":
      return `<g><circle cx="74" cy="56" r="52" fill="#dff3ff" fill-opacity="0.35" ${stroke}/><path d="M40 30 q20 -20 46 -12" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.8"/><rect x="40" y="100" width="70" height="12" rx="6" fill="#c8d1df" ${stroke}/></g>`;
    case "cap-blue":
    case "cap-red": {
      const c = kind === "cap-blue" ? "#2c63b5" : "#c0392b";
      return `<g ${stroke}><path d="M40 34 q34 -34 66 -2 z" fill="${c}"/><path d="M98 32 q22 0 30 8 q-16 4 -32 0 z" fill="${c}"/></g>`;
    }
    case "fire":
      return `<g ${stroke}><path d="M36 38 q38 -44 76 0 z" fill="#d63a2f"/><path d="M28 40 h92 q-4 8 -12 8 h-68 q-8 0 -12 -8 z" fill="#b8302a"/><rect x="66" y="12" width="14" height="18" rx="3" fill="#f2c230"/></g>`;
    case "pilot":
      return `<g ${stroke}><path d="M40 36 q34 -24 68 0 v6 h-68 z" fill="#1c2f5c"/><path d="M92 40 q20 0 26 6 h-30 z" fill="#111a33"/><circle cx="74" cy="30" r="5" fill="#f1c40f"/></g>`;
    case "beret":
      return `<g ${stroke}><ellipse cx="66" cy="28" rx="36" ry="13" fill="#c0392b" transform="rotate(-10 66 28)"/><circle cx="62" cy="14" r="4" fill="#c0392b"/></g>`;
    case "straw":
      return `<g ${stroke}><ellipse cx="72" cy="36" rx="58" ry="10" fill="#e9c46a"/><path d="M46 36 q2 -26 26 -26 q24 0 26 26 z" fill="#f2d27a"/><path d="M48 30 h48" stroke="#c0392b" stroke-width="5"/></g>`;
    case "hardhat":
      return `<g ${stroke}><path d="M38 38 q34 -46 72 0 z" fill="#f2c230"/><path d="M30 38 h88 v7 h-88 z" fill="#e3b21f"/><path d="M74 4 v34" stroke="#d6a51a" stroke-width="5"/></g>`;
    case "detective":
      return `<g ${stroke}><path d="M38 36 q36 -40 72 0 z" fill="#8a6d3b"/><path d="M28 38 q46 12 92 0 q-4 8 -12 8 h-68 q-8 0 -12 -8 z" fill="#7a5a32"/><path d="M50 22 l-12 -8 M98 22 l12 -8" /></g>`;
    case "pirate":
      return `<g ${stroke}><path d="M30 38 q44 -52 88 0 q-44 -10 -88 0 z" fill="#1f1f2b"/><circle cx="74" cy="22" r="7" fill="#fff"/><path d="M70 22 l8 0 M74 18 v8" stroke="${LINE}" stroke-width="2"/></g>`;
    case "wizard":
      return `<g ${stroke}><path d="M34 38 l40 -70 l36 70 z" fill="#4b3aa0"/><path d="M26 38 h96 q-2 8 -10 8 h-76 q-8 0 -10 -8 z" fill="#3a2c86"/><path d="M68 4 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 z" fill="#f1c40f" stroke-width="1.5"/></g>`;
    case "crown":
      return `<g ${stroke}><path d="M46 34 l-4 -26 l16 14 l16 -20 l16 20 l16 -14 l-4 26 z" fill="#f1c40f"/><circle cx="74" cy="22" r="4" fill="#e74c3c"/></g>`;
    case "ninja":
      return `<g ${stroke}><path d="M36 44 q38 -54 76 0 v16 q-38 10 -76 0 z" fill="#26283a"/><path d="M110 48 q18 6 22 22 q-12 -8 -22 -10 z" fill="#c0392b"/><path d="M38 52 h72" stroke="#c0392b" stroke-width="7"/></g>`;
    case "safari":
      return `<g ${stroke}><ellipse cx="72" cy="36" rx="54" ry="9" fill="#c2a774"/><path d="M44 36 q4 -28 28 -28 q24 0 28 28 z" fill="#d4bb8a"/><path d="M46 30 h52" stroke="#7a5a32" stroke-width="5"/></g>`;
    case "mortarboard":
      return `<g ${stroke}><path d="M30 24 l44 -16 l44 16 l-44 16 z" fill="#1f2443"/><path d="M52 32 v12 q22 10 44 0 v-12" fill="#1f2443"/><path d="M110 26 v20" stroke="#f1c40f" stroke-width="3"/><circle cx="110" cy="48" r="4" fill="#f1c40f" stroke-width="1.5"/></g>`;
  }
  return "";
}

function hair(): string {
  return `<path d="M30 52 q-2 -40 44 -46 q42 -2 50 34 q-20 -14 -48 -10 q-26 4 -46 22 z" fill="${HAIR}" ${stroke}/>`;
}

/** Head, facing right. Origin is the drawing's own (0,0). */
function head(o: Outfit, happy: boolean): string {
  const skin = o.robot ? "#b9c3d3" : SKIN;
  const skinDark = o.robot ? "#98a4b8" : SKIN_DARK;
  const eye = (cx: number, cy: number, r: number) =>
    happy
      ? `<path d="M${cx - r * 0.8} ${cy + 2} q${r * 0.8} ${-r * 1.1} ${r * 1.6} 0" fill="none" stroke="${LINE}" stroke-width="4" stroke-linecap="round"/>`
      : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f4f1e8" ${stroke}/><circle cx="${cx + 2}" cy="${cy + 1}" r="${r * 0.5}" fill="#141726"/><circle cx="${cx + 4}" cy="${cy - 2}" r="${r * 0.18}" fill="#fff"/>`;
  const extras = new Set(o.extras || []);
  return `
  <g>
    <ellipse cx="34" cy="70" rx="24" ry="28" fill="${skin}" ${stroke}/>
    <ellipse cx="36" cy="72" rx="14" ry="18" fill="${o.robot ? "#8fb8d8" : EAR_IN}"/>
    <path d="M28 46 q4 -38 50 -40 q44 2 46 44 q2 30 -10 46 q-30 18 -66 6 q-24 -14 -20 -56 z" fill="${skin}" ${stroke}/>
    ${o.hair ? hair() : ""}
    ${extras.has("antenna") ? `<path d="M74 8 v-14" ${stroke} fill="none"/><circle cx="74" cy="-8" r="6" fill="#5dade2" ${stroke}/>` : ""}
    <ellipse cx="124" cy="62" rx="14" ry="20" fill="${skin}" ${stroke}/>
    <ellipse cx="124" cy="63" rx="7" ry="11" fill="${o.robot ? "#8fb8d8" : EAR_IN}"/>
    ${eye(70, 58, 9)}${eye(100, 52, 8)}
    ${extras.has("glasses") ? `<g fill="none" stroke="${LINE}" stroke-width="3"><circle cx="70" cy="58" r="13"/><circle cx="100" cy="52" r="12"/><path d="M83 56 l5 -2"/></g>` : ""}
    ${extras.has("goggles") ? `<g ${stroke}><rect x="54" y="42" width="62" height="24" rx="12" fill="#a6e3f0" fill-opacity="0.55"/><path d="M28 50 l26 -2"/></g>` : ""}
    ${extras.has("patch") ? `<g><ellipse cx="100" cy="52" rx="11" ry="10" fill="#141726"/><path d="M60 36 l66 20" stroke="#141726" stroke-width="3"/></g>` : ""}
    ${extras.has("mask") ? `<path d="M56 50 q30 -14 60 -6 l2 14 q-30 -6 -62 6 z" fill="#e8423c" ${stroke}/>` : ""}
    <path d="M92 72 q24 2 26 26 q2 24 -18 34 q-10 4 -12 -4 q-1 -8 8 -10 q8 -4 6 -16 q-2 -14 -14 -14 z" fill="${skin}" ${stroke}/>
    <path d="M106 90 q6 1 8 4 M104 100 q7 0 9 4" stroke="${skinDark}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M78 84 q8 8 18 2" fill="none" stroke="${LINE}" stroke-width="3" stroke-linecap="round"/>
    ${extras.has("headphones") ? `<g ${stroke}><path d="M40 52 q30 -54 80 -8" fill="none" stroke-width="6"/><rect x="28" y="52" width="16" height="24" rx="7" fill="#e74c3c"/><rect x="112" y="40" width="14" height="22" rx="6" fill="#e74c3c"/></g>` : ""}
    ${extras.has("snorkel") ? `<g ${stroke}><rect x="56" y="40" width="58" height="26" rx="12" fill="#9ad6f0" fill-opacity="0.6"/><path d="M118 40 v-30 h8" fill="none" stroke="#f4a261" stroke-width="6"/></g>` : ""}
    ${o.hat ? hat(o.hat) : ""}
    ${extras.has("bow") ? `<path d="M60 14 l-12 -8 v16 z M60 14 l12 -8 v16 z" fill="#ff5c8a" ${stroke}/>` : ""}
  </g>`;
}

/** An arm hanging from the shoulder at (sx, sy), rotated by `deg` (0 = straight down). */
function arm(sx: number, sy: number, deg: number, sleeve: string, skin: string, prop = ""): string {
  return `<g transform="rotate(${deg} ${sx} ${sy})">
    <path d="M${sx - 8} ${sy} q-2 22 0 34 h16 q2 -12 0 -34 z" fill="${sleeve}" ${stroke}/>
    <circle cx="${sx}" cy="${sy + 40}" r="9" fill="${skin}" ${stroke}/>
    ${prop ? `<g transform="translate(${sx - 80} ${sy - 120})">${prop}</g>` : ""}
  </g>`;
}

function leg(hx: number, hy: number, deg: number, pants: string, shoes: string, socks = false): string {
  return `<g transform="rotate(${deg} ${hx} ${hy})">
    <path d="M${hx - 9} ${hy} v30 h18 v-30 z" fill="${pants}" ${stroke}/>
    ${socks ? `<rect x="${hx - 9}" y="${hy + 18}" width="18" height="12" fill="#ffffff" ${stroke}/>` : ""}
    <path d="M${hx - 11} ${hy + 30} h24 q8 0 8 8 v2 h-32 z" fill="${shoes}" ${stroke}/>
  </g>`;
}

function prop(name: string): string {
  switch (name) {
    case "spoon": return `<g ${stroke}><path d="M80 158 v24" stroke-width="4"/><ellipse cx="80" cy="186" rx="6" ry="9" fill="#c8cdd6"/></g>`;
    case "flask": return `<g ${stroke}><path d="M74 150 h12 v8 l10 20 q2 6 -4 6 h-24 q-6 0 -4 -6 l10 -20 z" fill="#c8f0e6"/><path d="M70 176 h20" stroke="#2ecc71" stroke-width="6"/></g>`;
    case "book": return `<g ${stroke}><rect x="66" y="150" width="30" height="36" rx="3" fill="#e0703a"/><path d="M70 152 v32" stroke="#f4d9b0"/></g>`;
    case "brush": return `<g ${stroke}><path d="M80 150 v28" stroke="#8a5a32" stroke-width="5"/><path d="M76 176 h8 l-1 12 h-6 z" fill="#e74c3c"/></g>`;
    case "wand": return `<g ${stroke}><path d="M80 150 l4 34" stroke="#3b2b1b" stroke-width="5"/><path d="M86 186 l3 6 6 1 -4 4 1 6 -6 -3 -5 3 1 -6 -4 -4 6 -1 z" fill="#f1c40f" stroke-width="1.5"/></g>`;
    case "hammer": return `<g ${stroke}><path d="M80 150 v30" stroke="#8a5a32" stroke-width="6"/><rect x="68" y="178" width="26" height="10" rx="2" fill="#7f8c8d"/></g>`;
    case "magnifier": return `<g ${stroke}><path d="M80 150 v18" stroke="#5b3b24" stroke-width="5"/><circle cx="80" cy="178" r="11" fill="#dff3ff" fill-opacity="0.7"/></g>`;
    case "flag": return `<g ${stroke}><path d="M80 120 v66" stroke-width="3"/><path d="M80 122 h26 v16 h-26 z" fill="#e8423c"/></g>`;
    case "bat": return `<g ${stroke}><path d="M80 150 v8" stroke="#3b2b1b" stroke-width="5"/><rect x="74" y="156" width="12" height="38" rx="5" fill="#e8c58a"/></g>`;
    case "scroll": return `<g ${stroke}><rect x="66" y="152" width="28" height="12" rx="6" fill="#f7efd8"/><path d="M80 152 v12" stroke="#c0392b" stroke-width="3"/></g>`;
    case "hose": return `<g ${stroke}><path d="M80 150 q10 24 -4 36" fill="none" stroke="#333" stroke-width="7"/><rect x="70" y="184" width="12" height="10" fill="#bbb"/></g>`;
    case "binoculars": return `<g ${stroke}><rect x="68" y="150" width="11" height="18" rx="4" fill="#3a3a3a"/><rect x="81" y="150" width="11" height="18" rx="4" fill="#3a3a3a"/></g>`;
  }
  return "";
}

function body(o: Outfit, l: Limbs): string {
  const extras = new Set(o.extras || []);
  const skin = o.robot ? "#b9c3d3" : SKIN;
  const torsoTop = 112;
  const stripes = o.stripe
    ? Array.from({ length: 4 }, (_, i) => `<path d="M48 ${torsoTop + 14 + i * 11} h64" stroke="${o.stripe}" stroke-width="5"/>`).join("")
    : "";
  const handProp = (o.extras || []).map(prop).find(Boolean) || "";
  const capeColor = extras.has("cape-red") ? "#e8423c" : extras.has("cape") ? "#a1283f" : "";
  return `
  ${capeColor ? `<path d="M50 ${torsoTop + 4} q-24 40 -18 76 h60 q4 -40 -10 -76 z" fill="${capeColor}" ${stroke}/>` : ""}
  ${extras.has("backpack") ? `<rect x="34" y="${torsoTop + 8}" width="22" height="40" rx="8" fill="#f39c12" ${stroke}/>` : ""}
  ${extras.has("pack") || extras.has("tank") ? `<rect x="34" y="${torsoTop + 4}" width="20" height="44" rx="8" fill="${extras.has("tank") ? "#f4a261" : "#c8d1df"}" ${stroke}/>` : ""}
  ${leg(68, torsoTop + 56, l.legL, o.pants, o.shoes, extras.has("socks") || extras.has("pads"))}
  ${leg(92, torsoTop + 56, l.legR, o.pants, o.shoes, extras.has("socks") || extras.has("pads"))}
  ${arm(52, torsoTop + 8, l.armL, o.coat || o.shirt, skin)}
  <path d="M50 ${torsoTop} q30 -10 60 0 l4 58 q-34 8 -68 0 z" fill="${o.shirt}" ${stroke}/>
  <g clip-path="url(#torso)">${stripes}</g>
  ${o.coat ? `<path d="M50 ${torsoTop} q8 -4 16 -5 l-4 64 q-8 -1 -16 -3 z M110 ${torsoTop} q-8 -4 -16 -5 l4 64 q8 -1 16 -3 z" fill="${o.coat}" ${stroke}/>` : ""}
  ${extras.has("overalls") ? `<path d="M60 ${torsoTop + 22} h40 v38 h-40 z" fill="#3c68a8" ${stroke}/><path d="M62 ${torsoTop + 22} l-6 -20 M98 ${torsoTop + 22} l6 -20" stroke="#3c68a8" stroke-width="6" stroke-linecap="round"/>` : ""}
  ${extras.has("apron") ? `<path d="M60 ${torsoTop + 16} h40 v46 q-20 6 -40 0 z" fill="#fdfdfd" ${stroke}/>` : ""}
  ${extras.has("vest") ? `<path d="M54 ${torsoTop + 2} h52 v58 h-52 z" fill="#f39c12" fill-opacity="0.95" ${stroke}/><path d="M54 ${torsoTop + 30} h52" stroke="#e8f0f8" stroke-width="6"/>` : ""}
  ${extras.has("tutu") ? `<path d="M40 ${torsoTop + 50} q40 -14 80 0 l-8 14 q-32 10 -64 0 z" fill="#ffd1dc" ${stroke}/>` : ""}
  ${extras.has("bib") ? `<path d="M64 ${torsoTop + 4} q16 -4 32 0 v18 q-16 12 -32 0 z" fill="#ffffff" ${stroke}/>` : ""}
  ${extras.has("belt") ? `<path d="M50 ${torsoTop + 44} h62" stroke="#c0392b" stroke-width="6"/>` : ""}
  ${extras.has("tie") ? `<path d="M78 ${torsoTop + 2} l6 0 l4 30 l-7 8 l-7 -8 z" fill="#c0392b" ${stroke}/>` : ""}
  ${extras.has("stethoscope") ? `<path d="M66 ${torsoTop + 2} q-4 26 14 30 q18 -4 14 -30" fill="none" stroke="#2c3e50" stroke-width="3.5"/><circle cx="80" cy="${torsoTop + 33}" r="5" fill="#bdc3c7" ${stroke}/>` : ""}
  ${extras.has("wings") ? `<path d="M68 ${torsoTop + 16} h24 l-4 5 h-16 z" fill="#f1c40f" ${stroke}/>` : ""}
  ${extras.has("bag") ? `<path d="M56 ${torsoTop} l46 46" stroke="#7a5a32" stroke-width="5"/><rect x="92" y="${torsoTop + 38}" width="26" height="20" rx="4" fill="#a0522d" ${stroke}/>` : ""}
  ${extras.has("paint") ? `<g><circle cx="66" cy="${torsoTop + 22}" r="4" fill="#e74c3c"/><circle cx="92" cy="${torsoTop + 34}" r="4" fill="#3498db"/><circle cx="76" cy="${torsoTop + 46}" r="4" fill="#f1c40f"/></g>` : ""}
  ${extras.has("guitar") ? `<g ${stroke}><path d="M66 ${torsoTop + 26} q-16 4 -12 20 q4 14 20 10 q12 -4 10 -18 q-2 -14 -18 -12 z" fill="#c97d3a"/><path d="M78 ${torsoTop + 32} l30 -30" stroke="#5b3b24" stroke-width="5"/><circle cx="70" cy="${torsoTop + 40}" r="4" fill="#3b2b1b"/></g>` : ""}
  ${o.badge ? `<text x="80" y="${torsoTop + 36}" font-family="Arial, sans-serif" font-weight="700" font-size="20" fill="${o.robot ? "#5dade2" : "#ffffff"}" stroke="${LINE}" stroke-width="1" text-anchor="middle">${o.badge}</text>` : ""}
  ${o.collar ? `<path d="M62 ${torsoTop - 2} q18 10 36 0" fill="none" stroke="${o.collar}" stroke-width="6" stroke-linecap="round"/>` : ""}
  ${arm(108, torsoTop + 8, l.armR, o.coat || o.shirt, skin, handProp)}
  ${extras.has("stars") ? `<g fill="#f1c40f"><circle cx="58" cy="${torsoTop + 26}" r="3"/><circle cx="100" cy="${torsoTop + 46}" r="3"/></g>` : ""}`;
}

/** SVG markup for Zo in an outfit and pose. */
export function zoSvg(outfitId: string, pose: Pose = "stand"): string {
  const o = OUTFITS[outfitId] || OUTFITS.zo;
  const l = POSE_LIMBS[pose] || POSE_LIMBS.stand;
  const scale = o.baby ? 0.82 : 1;
  const shift = o.baby ? `translate(14.4 36) scale(${scale})` : "";
  const torsoTop = 112;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ZO_W}" height="${ZO_H}" viewBox="-20 -40 ${ZO_W} ${ZO_H}">
<defs><clipPath id="torso"><path d="M50 ${torsoTop} q30 -10 60 0 l4 58 q-34 8 -68 0 z"/></clipPath></defs>
<g transform="translate(0 ${-l.lift}) ${shift}">
${body(o, l)}
<g transform="translate(6 ${o.baby ? 4 : 0}) scale(0.92)">${head(o, l.happy)}</g>
</g>
</svg>`;
}
