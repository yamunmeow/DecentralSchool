import type { ReactNode } from "react";
import { PALETTE } from "./palette";
import type { Color, CritterKind } from "./palette";

export type Mood = "happy" | "joy" | "sleepy" | "worried" | "wink" | "surprised" | "blep";

const INK = "#3a3350";
const BLUSH = "#f4a7b9";
const BEAK = "#f2a65a";

interface Props {
  kind: CritterKind;
  color: Color;
  mood?: Mood;
  size?: number;
  wave?: boolean;
  title?: string;
  className?: string;
}

function Eyes({ mood, y = 37, gap = 7, r = 2.6 }: { mood: Mood; y?: number; gap?: number; r?: number }) {
  const xs = [32 - gap, 32 + gap];
  if (mood === "joy")
    return (
      <g stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round">
        {xs.map((x) => <path key={x} d={`M${x - 2.6} ${y + 1} q2.6 -3.2 5.2 0`} />)}
      </g>
    );
  if (mood === "sleepy")
    return (
      <g stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round">
        {xs.map((x) => <path key={x} d={`M${x - 2.6} ${y - 0.5} q2.6 2.8 5.2 0`} />)}
      </g>
    );
  if (mood === "wink")
    return (
      <g>
        <path d={`M${xs[0] - 2.6} ${y + 1} q2.6 -3.2 5.2 0`} stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        <circle cx={xs[1]} cy={y} r={r} fill={INK} />
        <circle cx={xs[1] + r * 0.35} cy={y - r * 0.4} r={r * 0.32} fill="#fff" />
      </g>
    );
  if (mood === "surprised")
    return (
      <g>
        {xs.map((x) => (
          <g key={x}>
            <circle cx={x} cy={y} r={r + 0.9} fill={INK} />
            <circle cx={x + r * 0.4} cy={y - r * 0.45} r={r * 0.42} fill="#fff" />
          </g>
        ))}
      </g>
    );
  return (
    <g>
      {xs.map((x) => (
        <g key={x}>
          <circle cx={x} cy={y} r={r} fill={INK} />
          <circle cx={x + r * 0.35} cy={y - r * 0.4} r={r * 0.32} fill="#fff" />
        </g>
      ))}
      {mood === "worried" && (
        <g stroke={INK} strokeWidth={1.6} strokeLinecap="round">
          <path d={`M${xs[0] - 3} ${y - 4.6} l5 -1.8`} />
          <path d={`M${xs[1] + 3} ${y - 4.6} l-5 -1.8`} />
        </g>
      )}
    </g>
  );
}

function Mouth({ mood, y = 42 }: { mood: Mood; y?: number }) {
  if (mood === "joy") return <path d={`M28.6 ${y - 0.5} q3.4 5 6.8 0 z`} fill="#e57e93" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />;
  if (mood === "sleepy") return <path d={`M30.5 ${y + 0.6} h3`} stroke={INK} strokeWidth={1.8} strokeLinecap="round" />;
  if (mood === "worried") return <path d={`M29.2 ${y + 2} q2.8 -2.6 5.6 0`} stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />;
  if (mood === "wink") return <path d={`M28.8 ${y - 0.4} q3.2 3.6 6.4 0`} stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />;
  if (mood === "surprised") return <ellipse cx={32} cy={y + 1.2} rx={2.1} ry={2.6} fill="#e57e93" stroke={INK} strokeWidth={1.5} />;
  if (mood === "blep")
    return (
      <g>
        <path d={`M30.4 ${y + 0.8} h3.2 v2.2 a1.6 1.6 0 0 1 -3.2 0 z`} fill="#e57e93" />
        <path d={`M29.4 ${y} q1.3 1.8 2.6 0 q1.3 1.8 2.6 0`} stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  return <path d={`M29.4 ${y} q1.3 1.8 2.6 0 q1.3 1.8 2.6 0`} stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
}

const Blush = ({ y = 42.5, spread = 11.5 }: { y?: number; spread?: number }) => (
  <g fill={BLUSH} opacity={0.65}>
    <ellipse cx={32 - spread} cy={y} rx={3.4} ry={2} />
    <ellipse cx={32 + spread} cy={y} rx={3.4} ry={2} />
  </g>
);

function spikes(cx: number, cy: number, rx: number, ry: number, n: number) {
  const pts: string[] = [];
  for (let i = 0; i <= n * 2; i++) {
    const a = Math.PI + (i / (n * 2)) * Math.PI * 1.15 - 0.08;
    const k = i % 2 ? 1.28 : 1;
    pts.push(`${cx + Math.cos(a) * rx * k},${cy + Math.sin(a) * ry * k}`);
  }
  return pts.join(" ");
}

function star(cx: number, cy: number, outer: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
  }
  return pts.join(" ");
}

export function Critter({ kind, color, mood = "happy", size = 48, wave, title, className }: Props) {
  const p = PALETTE[color];
  let body = p.soft;
  const stroke = p.deep;
  let back: ReactNode = null;
  let front: ReactNode = null;
  let face: ReactNode = (
    <>
      <Eyes mood={mood} />
      <Blush />
      <Mouth mood={mood} />
    </>
  );
  let shape: ReactNode = null;

  switch (kind) {
    case "cat":
      back = (
        <g fill={body} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round">
          <path d="M14 31 L16.5 12 Q17.5 9 20.5 11 L30 20 Z" />
          <path d="M50 31 L47.5 12 Q46.5 9 43.5 11 L34 20 Z" />
          <path d="M18 24 L19 15 L25.5 20 Z" fill={BLUSH} stroke="none" opacity={0.7} />
          <path d="M46 24 L45 15 L38.5 20 Z" fill={BLUSH} stroke="none" opacity={0.7} />
        </g>
      );
      front = (
        <g stroke={stroke} strokeWidth={1.3} strokeLinecap="round">
          <path d="M16 40 l-7 -1.5 M16 43 l-7 1" />
          <path d="M48 40 l7 -1.5 M48 43 l7 1" />
        </g>
      );
      break;
    case "bunny":
      back = (
        <g fill={body} stroke={stroke} strokeWidth={1.6}>
          <ellipse cx={24} cy={13} rx={5.5} ry={13} transform="rotate(-10 24 13)" />
          <ellipse cx={40} cy={13} rx={5.5} ry={13} transform="rotate(10 40 13)" />
          <ellipse cx={24} cy={14} rx={2.4} ry={8.5} transform="rotate(-10 24 14)" fill={BLUSH} stroke="none" opacity={0.7} />
          <ellipse cx={40} cy={14} rx={2.4} ry={8.5} transform="rotate(10 40 14)" fill={BLUSH} stroke="none" opacity={0.7} />
        </g>
      );
      break;
    case "bear":
    case "panda": {
      const ear = kind === "panda" ? INK : body;
      if (kind === "panda") body = "#fbf8f4";
      // Panda ears are near-black, so they get the pastel outline too; otherwise they vanish on dark backgrounds.
      back = (
        <g fill={ear} stroke={stroke} strokeWidth={kind === "panda" ? 2.2 : 1.6}>
          <circle cx={15} cy={22} r={7} />
          <circle cx={49} cy={22} r={7} />
          {kind === "bear" && <circle cx={15} cy={22} r={3.4} fill={stroke} stroke="none" opacity={0.6} />}
          {kind === "bear" && <circle cx={49} cy={22} r={3.4} fill={stroke} stroke="none" opacity={0.6} />}
        </g>
      );
      face = (
        <>
          {kind === "panda" && (
            <g fill={INK}>
              <ellipse cx={24.5} cy={37} rx={5} ry={6} transform="rotate(20 24.5 37)" />
              <ellipse cx={39.5} cy={37} rx={5} ry={6} transform="rotate(-20 39.5 37)" />
            </g>
          )}
          {kind === "panda" && mood !== "joy" && mood !== "sleepy" ? (
            <g fill="#fff">
              <circle cx={25} cy={36.5} r={2} />
              <circle cx={39} cy={36.5} r={2} />
            </g>
          ) : kind === "panda" ? (
            <g stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round">
              <path d="M22.4 37.5 q2.6 -3 5.2 0 M36.4 37.5 q2.6 -3 5.2 0" />
            </g>
          ) : (
            <Eyes mood={mood} />
          )}
          <Blush y={44} spread={13} />
          <ellipse cx={32} cy={44} rx={7.5} ry={5.5} fill="#fff" opacity={0.65} />
          <ellipse cx={32} cy={41.6} rx={2.4} ry={1.6} fill={INK} />
          <Mouth mood={mood} y={44.5} />
        </>
      );
      break;
    }
    case "frog":
      back = (
        <g fill={body} stroke={stroke} strokeWidth={1.6}>
          <circle cx={21} cy={24} r={8.5} />
          <circle cx={43} cy={24} r={8.5} />
        </g>
      );
      face = (
        <>
          <g fill="#fff">
            <circle cx={21} cy={24} r={5.4} />
            <circle cx={43} cy={24} r={5.4} />
          </g>
          {mood === "joy" || mood === "sleepy" ? (
            <g stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round">
              <path d={mood === "joy" ? "M18.4 25 q2.6 -3.2 5.2 0 M40.4 25 q2.6 -3.2 5.2 0" : "M18.4 23.5 q2.6 2.8 5.2 0 M40.4 23.5 q2.6 2.8 5.2 0"} />
            </g>
          ) : (
            <g fill={INK}>
              <circle cx={21.6} cy={24.6} r={2.8} />
              <circle cx={43.6} cy={24.6} r={2.8} />
            </g>
          )}
          <Blush y={41} spread={14} />
          <path
            d={mood === "worried" ? "M25 44 q7 -4 14 0" : "M24 40.5 q8 6.5 16 0"}
            stroke={INK}
            strokeWidth={1.9}
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
      break;
    case "chick":
    case "duck":
      back = (
        <path d="M30.5 20 q-1 -8 3.5 -4 q1 -6 4.5 -1" stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round" />
      );
      face = (
        <>
          <Eyes mood={mood} y={35} />
          <Blush y={41} />
          {kind === "chick" ? (
            <path d="M28.8 40 L35.2 40 L32 44.6 Z" fill={BEAK} stroke="#d98a43" strokeWidth={1.2} strokeLinejoin="round" />
          ) : (
            <ellipse cx={32} cy={42} rx={6.5} ry={3.2} fill={BEAK} stroke="#d98a43" strokeWidth={1.2} />
          )}
        </>
      );
      break;
    case "fox":
      back = (
        <g strokeLinejoin="round">
          <path d="M12 32 L13 9 L30 20 Z" fill={body} stroke={stroke} strokeWidth={1.6} />
          <path d="M52 32 L51 9 L34 20 Z" fill={body} stroke={stroke} strokeWidth={1.6} />
          <path d="M13 9 L13.6 17 L20 13.4 Z" fill={INK} opacity={0.75} />
          <path d="M51 9 L50.4 17 L44 13.4 Z" fill={INK} opacity={0.75} />
        </g>
      );
      front = (
        <>
          <path d="M14 42 Q32 34 50 42 Q46 56 32 56 Q18 56 14 42 Z" fill="#fff" opacity={0.75} />
          <ellipse cx={32} cy={42} rx={2.2} ry={1.5} fill={INK} />
        </>
      );
      face = (
        <>
          <Eyes mood={mood} y={35.5} />
          <Blush y={41} spread={12.5} />
          <Mouth mood={mood} y={44.5} />
        </>
      );
      break;
    case "owl":
      back = (
        <g fill={body} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round">
          <path d="M13 28 L15 13 L25 21 Z" />
          <path d="M51 28 L49 13 L39 21 Z" />
        </g>
      );
      face = (
        <>
          <g fill="#fff" stroke={stroke} strokeWidth={1.4}>
            <circle cx={24.5} cy={35} r={6.6} />
            <circle cx={39.5} cy={35} r={6.6} />
          </g>
          <Eyes mood={mood} y={35} gap={7.5} r={3} />
          <path d="M29.6 41 L34.4 41 L32 45.2 Z" fill={BEAK} stroke="#d98a43" strokeWidth={1.2} strokeLinejoin="round" />
          <g stroke={stroke} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.8}>
            <path d="M26 50 q2 2 4 0 M34 50 q2 2 4 0" />
          </g>
        </>
      );
      break;
    case "mouse":
      back = (
        <g fill={body} stroke={stroke} strokeWidth={1.6}>
          <circle cx={13.5} cy={23} r={10} />
          <circle cx={50.5} cy={23} r={10} />
          <circle cx={13.5} cy={23} r={5.6} fill={BLUSH} stroke="none" opacity={0.7} />
          <circle cx={50.5} cy={23} r={5.6} fill={BLUSH} stroke="none" opacity={0.7} />
        </g>
      );
      front = (
        <>
          <circle cx={32} cy={41.4} r={2} fill="#e57e93" />
          <g stroke={stroke} strokeWidth={1.2} strokeLinecap="round">
            <path d="M24 42 l-9 -2 M24 44 l-9 1.5 M40 42 l9 -2 M40 44 l9 1.5" />
          </g>
        </>
      );
      face = (
        <>
          <Eyes mood={mood} />
          <Blush y={44} spread={12.5} />
          <Mouth mood={mood} y={44.5} />
        </>
      );
      break;
    case "whale":
      back = (
        <g stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round">
          <path d="M32 19 v-6" />
          <path d="M32 13 q-4 -5 -8.5 -2.5" />
          <path d="M32 13 q4 -5 8.5 -2.5" />
        </g>
      );
      front = <path d="M15 46 Q32 58 49 46 Q46 56 32 57 Q18 56 15 46 Z" fill="#fff" opacity={0.6} />;
      break;
    case "turtle":
      back = (
        <g>
          <circle cx={32} cy={36} r={27.5} fill={stroke} />
          <g fill={body} opacity={0.75}>
            <circle cx={11} cy={30} r={3.6} />
            <circle cx={53} cy={30} r={3.6} />
            <circle cx={20} cy={14} r={3.6} />
            <circle cx={44} cy={14} r={3.6} />
            <circle cx={32} cy={10} r={3.6} />
          </g>
        </g>
      );
      break;
    case "hedgehog":
      back = <polygon points={spikes(32, 38, 22, 20, 8)} fill={stroke} stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" />;
      front = <ellipse cx={32} cy={42} rx={2.4} ry={1.7} fill={INK} />;
      face = (
        <>
          <Eyes mood={mood} y={36} />
          <Blush y={42.5} />
          <Mouth mood={mood} y={45} />
        </>
      );
      break;
    case "squirrel":
      back = (
        <g>
          <path
            d="M44 54 C64 52 63 20 50 16 C41 14 39 26 47 28 C53 30 54 40 44 44 Z"
            fill={stroke}
            stroke={stroke}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <g fill={body} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round">
            <path d="M17 26 L19 15 L27 21 Z" />
            <path d="M47 26 L45 15 L37 21 Z" />
          </g>
        </g>
      );
      break;
    case "pig":
      back = (
        <g fill={body} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round">
          <path d="M14 26 L18 13 L27 21 Z" />
          <path d="M50 26 L46 13 L37 21 Z" />
        </g>
      );
      face = (
        <>
          <Eyes mood={mood} y={35} gap={8} />
          <Blush y={41} spread={13} />
          <ellipse cx={32} cy={42.5} rx={6.4} ry={4.4} fill={stroke} opacity={0.7} />
          <g fill={INK} opacity={0.75}>
            <ellipse cx={29.8} cy={42.5} rx={1.2} ry={1.6} />
            <ellipse cx={34.2} cy={42.5} rx={1.2} ry={1.6} />
          </g>
          <Mouth mood={mood} y={48.5} />
        </>
      );
      break;
    case "dog":
      front = (
        <g>
          <ellipse cx={13.5} cy={34} rx={6} ry={12} transform="rotate(18 13.5 34)" fill={stroke} />
          <ellipse cx={50.5} cy={34} rx={6} ry={12} transform="rotate(-18 50.5 34)" fill={stroke} />
          <ellipse cx={32} cy={45} rx={8} ry={6} fill="#fff" opacity={0.7} />
          <ellipse cx={32} cy={41.6} rx={2.8} ry={2} fill={INK} />
        </g>
      );
      face = (
        <>
          <Eyes mood={mood} y={35} />
          <Blush y={42} spread={13} />
          <Mouth mood={mood} y={45} />
        </>
      );
      break;
    case "koala":
      back = (
        <g fill={body} stroke={stroke} strokeWidth={1.6}>
          <circle cx={11} cy={28} r={10.5} />
          <circle cx={53} cy={28} r={10.5} />
          <circle cx={11} cy={28} r={6} fill="#fff" stroke="none" opacity={0.7} />
          <circle cx={53} cy={28} r={6} fill="#fff" stroke="none" opacity={0.7} />
        </g>
      );
      front = <ellipse cx={32} cy={42} rx={4.2} ry={5.2} fill={INK} opacity={0.85} />;
      face = (
        <>
          <Eyes mood={mood} y={35} gap={9} />
          <Blush y={43} spread={13.5} />
          {(mood === "joy" || mood === "blep" || mood === "surprised") && <Mouth mood={mood} y={48.5} />}
        </>
      );
      break;
    case "penguin":
      body = stroke;
      front = (
        <>
          <ellipse cx={32} cy={42} rx={15.5} ry={14} fill="#fffaf3" />
          <path d="M29.4 41 L34.6 41 L32 44.6 Z" fill={BEAK} stroke="#d98a43" strokeWidth={1.1} strokeLinejoin="round" />
        </>
      );
      face = (
        <>
          <Eyes mood={mood} y={37} gap={6.5} />
          <Blush y={43} spread={10} />
          {mood !== "happy" && <Mouth mood={mood} y={47} />}
        </>
      );
      break;
    case "sheep":
      back = (
        <g fill="#fffaf3" stroke={stroke} strokeWidth={1.4}>
          {[[14, 30], [18, 21], [26, 16], [38, 16], [46, 21], [50, 30], [32, 14]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={7.5} />
          ))}
          <ellipse cx={9} cy={38} rx={6} ry={3.4} fill={body} transform="rotate(20 9 38)" />
          <ellipse cx={55} cy={38} rx={6} ry={3.4} fill={body} transform="rotate(-20 55 38)" />
        </g>
      );
      front = (
        <g fill="#fffaf3">
          <circle cx={25} cy={23} r={6} />
          <circle cx={32} cy={21} r={6.5} />
          <circle cx={39} cy={23} r={6} />
        </g>
      );
      face = (
        <>
          <Eyes mood={mood} y={38} />
          <Blush y={44} />
          <Mouth mood={mood} y={45} />
        </>
      );
      break;
    case "elephant":
      back = (
        <g fill={body} stroke={stroke} strokeWidth={1.6}>
          <ellipse cx={10} cy={37} rx={10} ry={13} />
          <ellipse cx={54} cy={37} rx={10} ry={13} />
          <ellipse cx={10} cy={37} rx={5.5} ry={8} fill={BLUSH} stroke="none" opacity={0.55} />
          <ellipse cx={54} cy={37} rx={5.5} ry={8} fill={BLUSH} stroke="none" opacity={0.55} />
        </g>
      );
      front = (
        <g strokeLinecap="round" fill="none">
          <path d="M32 40 q0 9 -5 11.5" stroke={stroke} strokeWidth={8} />
          <path d="M32 40 q0 9 -5 11.5" stroke={body} strokeWidth={5} />
        </g>
      );
      face = (
        <>
          <Eyes mood={mood} y={34} gap={8} />
          <Blush y={41} spread={13} />
          {(mood === "joy" || mood === "surprised" || mood === "blep") && <Mouth mood={mood} y={46} />}
        </>
      );
      break;
    case "octopus":
      shape = (
        <g fill={body} stroke={stroke} strokeWidth={1.6}>
          {[15, 23.5, 32, 40.5, 49].map((x, i) => (
            <ellipse key={x} cx={x} cy={i % 2 ? 53 : 51.5} rx={4.6} ry={7} transform={`rotate(${(x - 32) * 0.9} ${x} 51)`} />
          ))}
          <ellipse cx={32} cy={35} rx={21} ry={18.5} />
        </g>
      );
      face = (
        <>
          <Eyes mood={mood} y={36} />
          <Blush y={42} />
          <Mouth mood={mood} y={42.5} />
        </>
      );
      break;
    case "dino":
      back = (
        <g fill={stroke} stroke={stroke} strokeWidth={2} strokeLinejoin="round">
          <path d="M20 23 L24 13 L29 20.5 Z" />
          <path d="M28 20 L32 9 L36 20 Z" />
          <path d="M35 20.5 L40 13 L44 23 Z" />
        </g>
      );
      front = (
        <g fill={INK} opacity={0.6}>
          <circle cx={29} cy={45} r={1} />
          <circle cx={35} cy={45} r={1} />
        </g>
      );
      face = (
        <>
          <Eyes mood={mood} y={35} gap={8.5} />
          <Blush y={41} spread={13} />
          <Mouth mood={mood} y={48} />
        </>
      );
      break;
    case "monkey":
      back = (
        <g fill={body} stroke={stroke} strokeWidth={1.6}>
          <circle cx={9.5} cy={39} r={7.5} />
          <circle cx={54.5} cy={39} r={7.5} />
          <circle cx={9.5} cy={39} r={4} fill="#fff" stroke="none" opacity={0.6} />
          <circle cx={54.5} cy={39} r={4} fill="#fff" stroke="none" opacity={0.6} />
        </g>
      );
      front = (
        <path
          d="M32 31 C28 25 17 27 18 37 C18.5 43 22 47 32 52 C42 47 45.5 43 46 37 C47 27 36 25 32 31 Z"
          fill="#fff"
          opacity={0.7}
        />
      );
      face = (
        <>
          <Eyes mood={mood} y={37} gap={6.5} />
          <Blush y={43} spread={10.5} />
          <Mouth mood={mood} y={45} />
        </>
      );
      break;
    case "star":
      shape = (
        <polygon
          points={star(32, 35, 27, 13.5)}
          fill={body}
          stroke={body}
          strokeWidth={7}
          strokeLinejoin="round"
        />
      );
      face = (
        <>
          <Eyes mood={mood} y={36} gap={5.5} r={2.3} />
          <Blush y={41} spread={9.5} />
          <Mouth mood={mood} y={41.5} />
        </>
      );
      break;
  }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {back}
      {shape ?? <ellipse cx={32} cy={39} rx={22} ry={19} fill={body} stroke={stroke} strokeWidth={1.6} />}
      {wave && (
        <g className="critter-wave">
          <ellipse cx={53} cy={36} rx={4.2} ry={7} fill={body} stroke={stroke} strokeWidth={1.6} transform="rotate(35 53 36)" />
        </g>
      )}
      {front}
      {face}
      {mood === "sleepy" && (
        <text x={50} y={16} fontSize={11} fontWeight={700} fill={stroke} fontFamily="inherit">z</text>
      )}
    </svg>
  );
}
