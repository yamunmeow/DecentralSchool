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

/** A limb's angle from hanging straight down, in degrees; positive swings away from the body. */
type Arm = [upper: number, fore: number];

interface Limbs {
  armL: Arm;
  armR: Arm;
  legL: number;
  legR: number;
  lift: number;
  happy: boolean;
}

/** Raised hands are placed to clear the big back ear and the trunk, and legs only swing outward so they never cross. */
const POSE_LIMBS: Record<Pose, Limbs> = {
  stand: { armL: [10, 6], armR: [10, 6], legL: 0, legR: 0, lift: 0, happy: false },
  walk1: { armL: [24, 18], armR: [4, 0], legL: 4, legR: 16, lift: 2, happy: false },
  walk2: { armL: [4, 0], armR: [24, 18], legL: 16, legR: 4, lift: 2, happy: false },
  jump: { armL: [120, 135], armR: [120, 135], legL: 18, legR: 18, lift: 12, happy: true },
  wave: { armL: [10, 6], armR: [110, 170], legL: 0, legR: 0, lift: 0, happy: true },
  cheer: { armL: [100, 160], armR: [100, 160], legL: 6, legR: 6, lift: 4, happy: true },
};

const UPPER_ARM = 22;
const FOREARM = 20;

const stroke = `stroke="${LINE}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

/**
 * The crown of a hat, in head units: it clears the top of the skull (and hair) by a few units all the way round,
 * down to y = 38, just above the eyes. Front details sit at x ≈ 86, the middle of the face.
 */
const DOME = "M28 38 Q28 4 78 2 Q118 2 124 38 Z";

function hat(kind: string): string {
  switch (kind) {
    case "chef":
      return `<g ${stroke}><path d="M34 24 C14 22 14 -4 34 -2 C36 -22 64 -24 74 -12 C84 -26 112 -22 112 -4 C134 -6 136 22 118 24 Z" fill="#fff"/><path d="M58 -4 q2 12 0 24 M92 -6 q2 12 0 26" stroke="#d5dae3" stroke-width="2.5" fill="none"/><path d="M32 38 Q78 46 124 36 L120 18 Q78 26 36 20 Z" fill="#fff"/></g>`;
    case "helmet":
      return `<g><circle cx="74" cy="60" r="64" fill="#dff3ff" fill-opacity="0.3" ${stroke}/><path d="M28 34 Q40 8 68 2" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.85"/><path d="M34 112 Q74 128 114 112 L112 124 Q74 140 36 124 Z" fill="#c8d1df" ${stroke}/></g>`;
    case "cap-blue":
    case "cap-red": {
      const c = kind === "cap-blue" ? "#2c63b5" : "#c0392b";
      return `<g ${stroke}><path d="${DOME}" fill="${c}"/><path d="M84 4 Q96 18 96 36" fill="none" stroke-width="2"/><path d="M108 30 Q138 26 152 38 Q132 46 106 40 Z" fill="${c}"/><circle cx="78" cy="2" r="4" fill="${c}"/></g>`;
    }
    case "fire":
      return `<g ${stroke}><path d="M28 38 Q28 0 78 -2 Q120 0 124 38 Z" fill="#d63a2f"/><path d="M78 -2 Q94 12 92 36" fill="none" stroke="#b8302a" stroke-width="5"/><path d="M6 44 Q12 32 30 36 Q78 42 124 34 Q140 32 146 40 Q130 50 78 48 Q24 52 6 44 Z" fill="#b8302a"/><path d="M78 10 h18 l2 14 l-11 8 l-11 -8 z" fill="#f2c230"/></g>`;
    case "pilot":
      return `<g ${stroke}><path d="M20 22 Q24 -4 78 -6 Q130 -4 136 18 Q80 30 20 22 Z" fill="#1c2f5c"/><path d="M30 22 Q80 30 126 18 L124 36 Q78 44 32 38 Z" fill="#1c2f5c"/><path d="M32 31 Q78 39 125 28" fill="none" stroke="#f1c40f" stroke-width="2.5"/><path d="M102 36 Q128 32 146 42 Q122 50 100 44 Z" fill="#111a33"/><circle cx="86" cy="14" r="5" fill="#f1c40f"/></g>`;
    case "beret":
      return `<g ${stroke} transform="rotate(-8 78 16)"><ellipse cx="76" cy="16" rx="52" ry="15" fill="#c0392b"/><path d="M78 1 v-6" stroke-width="4"/></g>`;
    case "straw":
      return `<g ${stroke}><ellipse cx="78" cy="34" rx="66" ry="11" fill="#e9c46a"/><path d="M32 34 Q30 -6 78 -6 Q126 -6 124 34 Z" fill="#f2d27a"/><path d="M33 26 Q78 33 123 26" fill="none" stroke="#c0392b" stroke-width="6"/></g>`;
    case "hardhat":
      return `<g ${stroke}><path d="${DOME}" fill="#f2c230"/><path d="M78 2 Q92 14 90 36" fill="none" stroke="#d6a51a" stroke-width="6"/><path d="M18 36 Q78 46 138 34 Q142 42 134 44 Q78 54 22 44 Q14 42 18 36 Z" fill="#e3b21f"/></g>`;
    case "detective":
      return `<g ${stroke}><path d="M30 32 Q28 0 58 -2 Q70 6 84 -2 Q120 0 122 30 Z" fill="#8a6d3b"/><path d="M30 24 Q78 32 122 22 L122 30 Q78 40 30 32 Z" fill="#3b2b1b"/><path d="M12 32 Q22 24 32 30 Q78 40 122 28 Q136 24 146 32 Q134 44 78 44 Q28 44 12 32 Z" fill="#7a5a32"/></g>`;
    case "pirate":
      return `<g ${stroke}><path d="M14 38 Q22 2 46 8 Q78 -18 110 8 Q134 2 142 38 Q78 24 14 38 Z" fill="#1f1f2b"/><circle cx="86" cy="12" r="6" fill="#fff" stroke-width="2"/><path d="M79 20 l14 7 M93 20 l-14 7" stroke="#fff" stroke-width="3"/></g>`;
    case "wizard":
      return `<g ${stroke}><path d="M28 36 Q36 0 46 -26 Q100 -10 128 36 Z" fill="#4b3aa0"/><path d="M12 38 Q78 50 144 36 Q148 44 138 48 Q78 58 18 48 Q8 46 12 38 Z" fill="#3a2c86"/><path d="M86 2 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 z" fill="#f1c40f" stroke-width="1.5"/></g>`;
    case "crown":
      return `<g ${stroke}><path d="M42 28 Q80 36 116 26 L120 -4 L102 12 L80 -14 L60 12 L40 -2 Z" fill="#f1c40f"/><circle cx="80" cy="18" r="4.5" fill="#e74c3c" stroke-width="2"/><g fill="#f1c40f" stroke-width="2"><circle cx="40" cy="-4" r="3.5"/><circle cx="80" cy="-16" r="3.5"/><circle cx="120" cy="-6" r="3.5"/></g></g>`;
    case "ninja":
      return `<g ${stroke}><path d="M26 40 Q6 30 -6 40 Q8 44 22 46 Z M24 44 Q10 54 8 68 Q20 56 30 48 Z" fill="#c0392b"/><path d="M22 48 Q18 -2 78 0 Q124 2 128 44 Q100 36 78 38 Q48 40 22 48 Z" fill="#26283a"/><path d="M23 40 Q78 26 127 36" fill="none" stroke="#c0392b" stroke-width="7"/></g>`;
    case "safari":
      return `<g ${stroke}><ellipse cx="78" cy="34" rx="60" ry="10" fill="#c2a774"/><path d="M32 34 Q30 -8 78 -8 Q126 -8 124 34 Z" fill="#d4bb8a"/><path d="M33 26 Q78 34 123 26" fill="none" stroke="#7a5a32" stroke-width="5"/><circle cx="78" cy="-8" r="4" fill="#c2a774"/></g>`;
    case "mortarboard":
      return `<g ${stroke}><path d="M30 34 Q28 10 78 8 Q126 10 124 34 Q78 26 30 34 Z" fill="#1f2443"/><path d="M18 8 L78 -12 L138 8 L78 28 Z" fill="#1f2443"/><path d="M78 8 Q112 4 132 12 V32" fill="none" stroke="#f1c40f" stroke-width="3"/><circle cx="78" cy="8" r="3.5" fill="#f1c40f" stroke-width="1.5"/><path d="M127 32 h10 l2 12 h-14 z" fill="#f1c40f" stroke-width="1.5"/></g>`;
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
    ${extras.has("antenna") ? `<path d="M78 6 v-14" ${stroke} fill="none"/><circle cx="78" cy="-12" r="6" fill="#5dade2" ${stroke}/>` : ""}
    <ellipse cx="124" cy="62" rx="14" ry="20" fill="${skin}" ${stroke}/>
    <ellipse cx="124" cy="63" rx="7" ry="11" fill="${o.robot ? "#8fb8d8" : EAR_IN}"/>
    ${extras.has("mask") ? `<g ${stroke} fill="#e8423c"><path d="M46 52 Q30 44 18 50 Q30 54 34 62 Z"/><path d="M44 54 Q72 38 114 40 Q124 42 120 56 Q116 66 102 64 Q90 62 84 68 Q78 72 68 72 Q50 72 44 54 Z"/></g>` : ""}
    ${eye(70, 58, 9)}${eye(100, 52, 8)}
    ${extras.has("glasses") ? `<g fill="none" stroke="${LINE}" stroke-width="3"><circle cx="70" cy="58" r="13"/><circle cx="100" cy="52" r="12"/><path d="M83 56 l5 -2"/></g>` : ""}
    ${extras.has("goggles") ? `<g ${stroke}><path d="M26 48 L58 54" fill="none" stroke-width="5"/><circle cx="70" cy="58" r="13" fill="#a6e3f0" fill-opacity="0.55"/><circle cx="100" cy="52" r="12" fill="#a6e3f0" fill-opacity="0.55"/><path d="M83 56 l5 -2" stroke-width="4"/></g>` : ""}
    ${extras.has("patch") ? `<g><path d="M30 34 L92 48 M108 50 L122 48" stroke="#141726" stroke-width="3" stroke-linecap="round"/><ellipse cx="100" cy="52" rx="11" ry="10" fill="#141726"/></g>` : ""}
    <path d="M92 72 q24 2 26 26 q2 24 -18 34 q-10 4 -12 -4 q-1 -8 8 -10 q8 -4 6 -16 q-2 -14 -14 -14 z" fill="${skin}" ${stroke}/>
    <path d="M106 90 q6 1 8 4 M104 100 q7 0 9 4" stroke="${skinDark}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M78 84 q8 8 18 2" fill="none" stroke="${LINE}" stroke-width="3" stroke-linecap="round"/>
    ${extras.has("headphones") ? `<g ${stroke}><path d="M29 48 Q24 4 78 2 Q128 4 122 44" fill="none" stroke-width="6"/><rect x="20" y="40" width="18" height="28" rx="8" fill="#e74c3c"/><rect x="114" y="36" width="16" height="26" rx="7" fill="#e74c3c"/></g>` : ""}
    ${extras.has("snorkel") ? `<g ${stroke}><path d="M28 50 L56 52" fill="none" stroke-width="5"/><rect x="56" y="40" width="58" height="28" rx="13" fill="#9ad6f0" fill-opacity="0.6"/><path d="M120 50 V10 Q120 2 128 2 H132" fill="none" stroke-width="9"/><path d="M120 50 V10 Q120 2 128 2 H132" fill="none" stroke="#f4a261" stroke-width="4"/></g>` : ""}
    ${o.hat ? hat(o.hat) : ""}
    ${extras.has("bow") ? `<g ${stroke} fill="#ff5c8a"><path d="M56 8 l-13 -9 v18 z M56 8 l13 -9 v18 z"/><circle cx="56" cy="8" r="3.5"/></g>` : ""}
  </g>`;
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const sin = (deg: number) => Math.sin((deg * Math.PI) / 180);
const cos = (deg: number) => Math.cos((deg * Math.PI) / 180);

/** Something held in the hand, drawn with the grip at (0, 0). */
interface Held {
  svg: string;
  /** Stays level with the ground (a book, a flask) instead of pointing on from the forearm (a wand, a hammer). */
  upright?: boolean;
}

/**
 * An arm from the shoulder at (sx, sy) on `side` (-1 left, 1 right), bent at the elbow. One outlined stroke, so the
 * sleeve has no seam at the elbow; the hand is drawn last so it wraps round whatever it holds.
 */
function arm(sx: number, sy: number, side: -1 | 1, [up, fore]: Arm, sleeve: string, skin: string, held?: Held): string {
  const ex = sx + side * UPPER_ARM * sin(up), ey = sy + UPPER_ARM * cos(up);
  const hx = ex + side * FOREARM * sin(fore), hy = ey + FOREARM * cos(fore);
  const d = `M${sx} ${sy} L${r1(ex)} ${r1(ey)} L${r1(hx)} ${r1(hy)}`;
  // Tools tip forward when the arm hangs and run on from the forearm when it is raised, so they stay inside the image.
  const tilt = fore + 25 * Math.max(cos(fore), 0);
  const place = held ? `translate(${r1(hx)} ${r1(hy)})${held.upright ? ` rotate(${side * 8})` : ` rotate(${r1(-side * tilt)})`}` : "";
  return `<path d="${d}" fill="none" stroke="${LINE}" stroke-width="19" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="${sleeve}" stroke-width="13" stroke-linejoin="round" stroke-linecap="round"/>
    ${held ? `<g transform="${place}">${held.svg}</g>` : ""}
    <circle cx="${r1(hx)}" cy="${r1(hy)}" r="9" fill="${skin}" ${stroke}/>`;
}

/** A leg from the hip at (hx, hy) on `side`, swung `deg` away from the body. The shoe stays flat, so it never dips below the ground. */
function leg(hx: number, hy: number, side: -1 | 1, deg: number, pants: string, shoes: string, socks = false): string {
  return `<g transform="rotate(${-side * deg} ${hx} ${hy})">
    <path d="M${hx - 9} ${hy} v30 h18 v-30 z" fill="${pants}" ${stroke}/>
    ${socks ? `<rect x="${hx - 9}" y="${hy + 18}" width="18" height="12" fill="#ffffff" ${stroke}/>` : ""}
    <path d="M${hx - 11} ${hy + 30} h24 q8 0 8 8 v2 h-32 z" fill="${shoes}" ${stroke} transform="rotate(${side * deg} ${hx} ${hy + 30})"/>
  </g>`;
}

/** Hand props. Tools run down +y from the grip, away from the forearm; upright things hang from the grip. */
function prop(name: string): Held | undefined {
  switch (name) {
    case "spoon": return { svg: `<g ${stroke}><path d="M0 -6 v26" stroke-width="5"/><ellipse cx="0" cy="26" rx="6" ry="9" fill="#c8cdd6"/></g>` };
    case "brush": return { svg: `<g ${stroke}><path d="M0 -6 v26" stroke-width="7"/><path d="M0 -6 v26" stroke="#8a5a32" stroke-width="3"/><path d="M-4 20 h8 l-1 12 q-3 4 -6 0 z" fill="#e74c3c"/></g>` };
    case "wand": return { svg: `<g ${stroke}><path d="M0 -6 v28" stroke-width="5"/><path d="M0 22 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 z" fill="#f1c40f" stroke-width="1.5" transform="translate(0 -1)"/></g>` };
    case "hammer": return { svg: `<g ${stroke}><path d="M0 -6 v26" stroke-width="8"/><path d="M0 -6 v26" stroke="#8a5a32" stroke-width="4"/><rect x="-14" y="18" width="28" height="11" rx="2" fill="#7f8c8d"/></g>` };
    case "magnifier": return { svg: `<g ${stroke}><path d="M0 -6 v18" stroke-width="7"/><path d="M0 -6 v18" stroke="#5b3b24" stroke-width="3"/><circle cx="0" cy="22" r="11" fill="#dff3ff" fill-opacity="0.8"/></g>` };
    case "bat": return { svg: `<g ${stroke}><path d="M0 -6 v14" stroke-width="7"/><path d="M0 -6 v14" stroke="#3b2b1b" stroke-width="3"/><rect x="-6" y="7" width="12" height="38" rx="5" fill="#e8c58a"/></g>` };
    case "hose": return { svg: `<g ${stroke}><rect x="-5" y="-8" width="10" height="24" rx="3" fill="#333"/><path d="M-6 16 h12 l-2 9 h-8 z" fill="#bbb"/></g>` };
    case "flag": return { upright: true, svg: `<g ${stroke}><path d="M0 12 V-48"/><path d="M0 -48 h24 l-5 8 5 8 h-24 z" fill="#e8423c"/></g>` };
    case "book": return { upright: true, svg: `<g ${stroke}><rect x="-12" y="-6" width="28" height="34" rx="3" fill="#e0703a"/><path d="M-7 -4 v30" stroke="#f4d9b0"/></g>` };
    case "flask": return { upright: true, svg: `<g ${stroke}><path d="M-6 -8 h12 v10 l11 19 q3 7 -4 7 h-26 q-7 0 -4 -7 l11 -19 z" fill="#c8f0e6"/><path d="M-11 18 h22" stroke="#2ecc71" stroke-width="6"/></g>` };
    case "scroll": return { upright: true, svg: `<g ${stroke}><rect x="-16" y="-6" width="32" height="12" rx="6" fill="#f7efd8"/><path d="M8 -6 v12" stroke="#c0392b" stroke-width="3"/></g>` };
    case "binoculars": return { upright: true, svg: `<g ${stroke}><rect x="-12" y="0" width="11" height="18" rx="4" fill="#3a3a3a"/><rect x="1" y="0" width="11" height="18" rx="4" fill="#3a3a3a"/><path d="M-1 6 h2" stroke-width="4"/></g>` };
  }
  return undefined;
}

function body(o: Outfit, l: Limbs): string {
  const extras = new Set(o.extras || []);
  const skin = o.robot ? "#b9c3d3" : SKIN;
  const torsoTop = 112;
  const stripes = o.stripe
    ? Array.from({ length: 4 }, (_, i) => `<path d="M48 ${torsoTop + 14 + i * 11} h64" stroke="${o.stripe}" stroke-width="5"/>`).join("")
    : "";
  const held = (o.extras || []).map(prop).find(Boolean);
  const capeColor = extras.has("cape-red") ? "#e8423c" : extras.has("cape") ? "#a1283f" : "";
  return `
  ${capeColor ? `<path d="M50 ${torsoTop + 4} q-24 40 -18 76 h60 q4 -40 -10 -76 z" fill="${capeColor}" ${stroke}/>` : ""}
  ${extras.has("backpack") ? `<rect x="34" y="${torsoTop + 8}" width="22" height="40" rx="8" fill="#f39c12" ${stroke}/>` : ""}
  ${extras.has("pack") || extras.has("tank") ? `<rect x="34" y="${torsoTop + 4}" width="20" height="44" rx="8" fill="${extras.has("tank") ? "#f4a261" : "#c8d1df"}" ${stroke}/>` : ""}
  ${leg(68, torsoTop + 56, -1, l.legL, o.pants, o.shoes, extras.has("socks") || extras.has("pads"))}
  ${leg(92, torsoTop + 56, 1, l.legR, o.pants, o.shoes, extras.has("socks") || extras.has("pads"))}
  ${arm(52, torsoTop + 8, -1, l.armL, o.coat || o.shirt, skin)}
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
  ${arm(108, torsoTop + 8, 1, l.armR, o.coat || o.shirt, skin, held)}
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
