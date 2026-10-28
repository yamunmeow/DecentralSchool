import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { t, tn } from "../i18n";

/**
 * Charts for Zo Wants to Learn, drawn at the size they are shown (not scaled), so
 * text stays readable on a phone. Colours: --viz-1 practice, --viz-2 test (validated
 * as a pair for both themes); text always in ink colours.
 */

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Round numbers for the axis: 0, 0.5, 1, … */
function ticks(lo: number, hi: number, n = 4): number[] {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw) || raw;
  const out: number[] = [];
  // Start at or below lo and end at or above hi, so every point sits inside the axis.
  const first = Math.floor(lo / step + 1e-9);
  const last = Math.ceil(hi / step - 1e-9);
  for (let k = first; k <= last; k++) out.push(Math.round(k * step * 1e6) / 1e6);
  return [...new Set(out)];
}

export interface Series {
  name: string;
  /** 1 = practice, 2 = test. */
  slot: 1 | 2;
  values: number[];
}

function Legend({ items }: { items: { name: string; slot?: 1 | 2; mark?: "line" | "dot" | "ink" | "ring" }[] }) {
  return (
    <ul className="viz-legend">
      {items.map((i) => (
        <li key={i.name}>
          <span className={`viz-key viz-key-${i.mark || "line"}${i.slot ? ` is-s${i.slot}` : ""}`} aria-hidden />
          {i.name}
        </li>
      ))}
    </ul>
  );
}

export function ChartCard({ title, children, table, note }: { title: string; children: ReactNode; table?: ReactNode; note?: ReactNode }) {
  return (
    <figure className="viz">
      <figcaption className="viz-title">{title}</figcaption>
      {children}
      {note}
      {table && (
        <details className="viz-table">
          <summary>{t("Show the numbers")}</summary>
          <div className="viz-table-scroll">{table}</div>
        </details>
      )}
    </figure>
  );
}

const H = 210;
const M = { l: 46, r: 64, t: 12, b: 30 };

/** Practice vs test over the rounds of training. */
export function LineChart({
  title,
  series,
  xLabel,
  format,
  min,
  max,
  rounds,
}: {
  title: string;
  series: Series[];
  xLabel: string;
  format: (n: number) => string;
  min?: number;
  max?: number;
  /** Width of the x axis in rounds, so the chart doesn't rescale while training. */
  rounds: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.values).filter((v) => isFinite(v));
  const lo = min ?? Math.min(0, ...all);
  const hiRaw = max ?? (all.length ? Math.max(...all, lo + 1e-6) : lo + 1);
  const yt = ticks(lo, hiRaw);
  const hi = Math.max(hiRaw, yt[yt.length - 1]);
  const w = Math.max(220, width);
  const iw = w - M.l - M.r;
  const ih = H - M.t - M.b;
  const n = Math.max(1, rounds);
  const X = (i: number) => M.l + (i / n) * iw;
  const Y = (v: number) => M.t + ih - ((v - lo) / (hi - lo || 1)) * ih;
  const path = (vals: number[]) => {
    let d = "";
    vals.forEach((v, i) => {
      if (!isFinite(v)) return;
      d += `${d && isFinite(vals[i - 1]) ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`;
    });
    return d;
  };
  const len = Math.max(0, ...series.map((s) => s.values.length));
  const xt = ticks(0, n, w < 360 ? 3 : 5).filter((t) => Number.isInteger(t));

  // Direct labels at the line ends, nudged apart so they never overlap.
  const ends = series
    .map((s) => {
      const i = s.values.length - 1;
      return isFinite(s.values[i]) ? { s, y: Y(s.values[i]), x: X(i) } : null;
    })
    .filter(Boolean) as { s: Series; y: number; x: number }[];
  if (ends.length === 2 && Math.abs(ends[0].y - ends[1].y) < 16) {
    const [a, b] = ends[0].y <= ends[1].y ? [ends[0], ends[1]] : [ends[1], ends[0]];
    const mid = (a.y + b.y) / 2;
    a.y = mid - 8;
    b.y = mid + 8;
  }

  const move = (e: React.PointerEvent) => {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - M.l) / iw) * n);
    setHover(len ? Math.max(0, Math.min(len - 1, i)) : null);
  };

  return (
    <ChartCard
      title={title}
      table={
        <table>
          <thead>
            <tr>
              <th>{xLabel}</th>
              {series.map((s) => (
                <th key={s.name}>{s.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: len }, (_, i) => (
              <tr key={i}>
                <td>{i}</td>
                {series.map((s) => (
                  <td key={s.name}>{isFinite(s.values[i]) ? format(s.values[i]) : "–"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      {series.length > 1 && <Legend items={series.map((s) => ({ name: s.name, slot: s.slot }))} />}
      <div className="viz-plot" ref={ref}>
        {width > 0 && (
          <svg width={w} height={H} role="img" aria-label={`${title}: ${series.map((s) => `${s.name} ${isFinite(s.values[len - 1]) ? format(s.values[len - 1]) : t("none yet")}`).join(", ")}`} onPointerMove={move} onPointerLeave={() => setHover(null)}>
            {yt.map((t) => (
              <g key={t}>
                <line className="viz-grid" x1={M.l} x2={M.l + iw} y1={Y(t)} y2={Y(t)} />
                <text className="viz-tick" x={M.l - 8} y={Y(t)} dy="0.32em" textAnchor="end">
                  {format(t)}
                </text>
              </g>
            ))}
            {xt.map((t) => (
              <text key={t} className="viz-tick" x={X(t)} y={H - 10} textAnchor="middle">
                {t}
              </text>
            ))}
            <line className="viz-axis" x1={M.l} x2={M.l + iw} y1={M.t + ih} y2={M.t + ih} />
            {series.map((s) => (
              <path key={s.name} className={`viz-line is-s${s.slot}`} d={path(s.values)} />
            ))}
            {ends.map((e) => (
              <g key={e.s.name}>
                <circle className={`viz-dot is-s${e.s.slot}`} cx={e.x} cy={Y(e.s.values[e.s.values.length - 1])} r={4} />
                {series.length > 1 && (
                  <text className="viz-end" x={e.x + 9} y={e.y} dy="0.32em">
                    {e.s.name}
                  </text>
                )}
              </g>
            ))}
            {hover !== null && (
              <g>
                <line className="viz-cross" x1={X(hover)} x2={X(hover)} y1={M.t} y2={M.t + ih} />
                {series.map((s) => isFinite(s.values[hover]) && <circle key={s.name} className={`viz-dot is-s${s.slot}`} cx={X(hover)} cy={Y(s.values[hover])} r={5} />)}
              </g>
            )}
            <rect x={M.l} y={M.t} width={iw} height={ih} fill="transparent" />
          </svg>
        )}
        {hover !== null && (
          <div className="viz-tip" style={{ left: Math.min(X(hover) + 12, w - 150), top: M.t }}>
            <strong>
              {xLabel} {hover}
            </strong>
            {series.map((s) => (
              <span key={s.name}>
                <i className={`viz-key viz-key-line is-s${s.slot}`} aria-hidden /> {s.name}: {isFinite(s.values[hover]) ? format(s.values[hover]) : "–"}
              </span>
            ))}
          </div>
        )}
      </div>
    </ChartCard>
  );
}

export interface Dot {
  x: number;
  y: number;
  slot: 1 | 2;
  flagged?: boolean;
  label?: string;
}

/** Points and Zo's line through them. */
export function Scatter({ title, dots, line, xName, yName, legend = true }: { title: string; dots: Dot[]; line?: (x: number) => number; xName: string; yName: string; legend?: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const clip = useId();
  const h = 260;
  const m = { l: 46, r: 16, t: 12, b: 34 };
  const w = Math.max(220, width);
  const xs = dots.map((d) => d.x);
  const ys = dots.map((d) => d.y);
  const xt = ticks(Math.min(...xs, 0), Math.max(...xs, 1));
  const yt = ticks(Math.min(...ys, 0), Math.max(...ys, 1));
  const [x0, x1, y0, y1] = [xt[0], xt[xt.length - 1], yt[0], yt[yt.length - 1]];
  const X = (v: number) => m.l + ((v - x0) / (x1 - x0 || 1)) * (w - m.l - m.r);
  const Y = (v: number) => m.t + (h - m.t - m.b) - ((v - y0) / (y1 - y0 || 1)) * (h - m.t - m.b);
  const curve = line
    ? Array.from({ length: 121 }, (_, i) => x0 + ((x1 - x0) * i) / 120)
        .map((x) => [X(x), Y(Math.max(y0 - (y1 - y0), Math.min(y1 + (y1 - y0), line(x))))])
        .map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`)
        .join("")
    : "";
  const slots = new Set(dots.map((d) => d.slot));
  const items = [
    ...(slots.has(1) ? [{ name: slots.has(2) ? t("Practice") : t("Examples"), slot: 1 as const, mark: "dot" as const }] : []),
    ...(slots.has(2) ? [{ name: t("Test"), slot: 2 as const, mark: "dot" as const }] : []),
    ...(dots.some((d) => d.flagged) ? [{ name: t("Far from the rest"), mark: "ring" as const }] : []),
    ...(line ? [{ name: t("Zo's line"), mark: "ink" as const }] : []),
  ];
  const near = (e: React.PointerEvent) => {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    let best = -1;
    let dist = 24 ** 2;
    dots.forEach((d, i) => {
      const q = (X(d.x) - px) ** 2 + (Y(d.y) - py) ** 2;
      if (q < dist) [best, dist] = [i, q];
    });
    setHover(best < 0 ? null : best);
  };
  const hd = hover !== null ? dots[hover] : null;
  return (
    <ChartCard
      title={title}
      table={
        <table>
          <thead>
            <tr>
              <th>{xName}</th>
              <th>{yName}</th>
              <th />
              {line && <th>{t("Zo's guess")}</th>}
            </tr>
          </thead>
          <tbody>
            {dots.map((d, i) => (
              <tr key={i}>
                <td>{d.x}</td>
                <td>{d.y}</td>
                <td>{d.slot === 2 ? "test" : slots.has(2) ? "practice" : ""}{d.flagged ? " · far" : ""}</td>
                {line && <td>{fmt(line(d.x))}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      {legend && items.length > 1 && <Legend items={items} />}
      <div className="viz-plot" ref={ref}>
        {width > 0 && (
          <svg width={w} height={h} role="img" aria-label={`${title}: ${dots.length} points`} onPointerMove={near} onPointerLeave={() => setHover(null)}>
            {yt.map((t) => (
              <g key={t}>
                <line className="viz-grid" x1={m.l} x2={w - m.r} y1={Y(t)} y2={Y(t)} />
                <text className="viz-tick" x={m.l - 8} y={Y(t)} dy="0.32em" textAnchor="end">
                  {fmt(t)}
                </text>
              </g>
            ))}
            {xt.map((t) => (
              <text key={t} className="viz-tick" x={X(t)} y={h - m.b + 16} textAnchor="middle">
                {fmt(t)}
              </text>
            ))}
            <text className="viz-axis-name" x={w - m.r} y={h - 3} textAnchor="end">
              {xName} →
            </text>
            <line className="viz-axis" x1={m.l} x2={w - m.r} y1={Y(y0)} y2={Y(y0)} />
            <clipPath id={clip}>
              <rect x={m.l} y={m.t} width={w - m.l - m.r} height={h - m.t - m.b} />
            </clipPath>
            {dots.map((d, i) => (
              <g key={i}>
                {d.flagged && <circle className="viz-ring" cx={X(d.x)} cy={Y(d.y)} r={9} />}
                <circle className={`viz-point is-s${d.slot}`} cx={X(d.x)} cy={Y(d.y)} r={hover === i ? 6 : 4.5} />
              </g>
            ))}
            {line && <path className="viz-model" d={curve} clipPath={`url(#${CSS.escape(clip)})`} />}
          </svg>
        )}
        {hd && (
          <div className="viz-tip" style={{ left: Math.min(X(hd.x) + 12, w - 160), top: Math.max(0, Y(hd.y) - 50) }}>
            <strong>{hd.label || (hd.slot === 2 ? t("Test") : t("Practice"))}</strong>
            <span>
              {xName}: {hd.x}
            </span>
            <span>
              {yName}: {hd.y}
            </span>
            {line && <span>Zo's guess: {fmt(line(hd.x))}</span>}
          </div>
        )}
      </div>
    </ChartCard>
  );
}

export const fmt = (n: number) => (Math.abs(n) >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10));

/** Horizontal bars with the value at the end of each: label counts, Zo's confidence. */
export function Bars({ title, items, format = String, max, highlight }: { title?: string; items: { label: string; value: number }[]; format?: (n: number) => string; max?: number; highlight?: string }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  const body = (
    <ul className="viz-bars">
      {items.map((i) => (
        <li key={i.label} className={highlight === i.label ? "is-on" : ""} title={`${i.label}: ${format(i.value)}`}>
          <span className="viz-bar-label">{i.label}</span>
          <span className="viz-bar-track">
            <span className="viz-bar" style={{ width: `${Math.max(1.5, (i.value / top) * 100)}%` }} />
          </span>
          <span className="viz-bar-value">{format(i.value)}</span>
        </li>
      ))}
    </ul>
  );
  return title ? <ChartCard title={title}>{body}</ChartCard> : body;
}

/** Real label down the side, Zo's guess along the top. Right answers sit on the diagonal. */
export function Confusion({ labels, cells }: { labels: string[]; cells: number[][] }) {
  const top = Math.max(1, ...cells.flat());
  const [tip, setTip] = useState<string | null>(null);
  return (
    <ChartCard title={t("Real label vs Zo's guess")} note={<p className="viz-note">{tip || t("Right answers are on the diagonal.")}</p>}>
      <div className="viz-table-scroll">
        <table className="confusion">
          <thead>
            <tr>
              <th className="confusion-corner">
                <span>{t("Zo said →")}</span>
                <span>{t("Real ↓")}</span>
              </th>
              {labels.map((l) => (
                <th key={l} scope="col">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((real, r) => (
              <tr key={real}>
                <th scope="row">{real}</th>
                {labels.map((said, c) => {
                  const n = cells[r][c];
                  const step = n ? Math.min(6, 1 + Math.floor((n / top) * 5.999)) : 0;
                  const text = `${tn(n, "{n} “{real}” example: Zo said “{said}”", "{n} “{real}” examples: Zo said “{said}”", { real, said })}${r === c ? ` ${t("(right)")}` : ""}`;
                  return (
                    <td key={said} className={`cell-${step}${r === c ? " is-diag" : ""}`} title={text} onPointerEnter={() => setTip(text)} onPointerLeave={() => setTip(null)}>
                      {n}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

/** One square per example: practice or test. */
export function SplitStrip({ train, test }: { train: number; test: number }) {
  return (
    <div className="split-strip" role="img" aria-label={t("{train} practice examples and {test} test examples", { train, test })}>
      {Array.from({ length: train }, (_, i) => (
        <span key={`a${i}`} className="is-s1" />
      ))}
      {Array.from({ length: test }, (_, i) => (
        <span key={`b${i}`} className="is-s2" />
      ))}
    </div>
  );
}

export { Legend };
