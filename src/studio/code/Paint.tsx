import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { boxOf, emptyDoc, fitShape, moveShape, NONE, pathD, shapeSvg, thin, type Box, type PaintDoc, type Shape } from "../../code/paint";
import { uid } from "../../shared/random";
import { t } from "../i18n";
import { Icon } from "../ui";

/**
 * Game Lab's paint editor: vector shapes on a board, so drawings stay sharp at any
 * size and can be changed later. Pointer events only, so it works with a mouse, a pen
 * or a finger.
 */

type Tool = "select" | "brush" | "line" | "rect" | "ellipse" | "text" | "fill" | "eraser" | "centre";
type Handle = "nw" | "ne" | "sw" | "se";

const COLOURS = ["#262b45", "#ffffff", "#8d9fd8", "#e8423c", "#f39c12", "#f6d33c", "#3fbf6b", "#17a3a3", "#3a86e0", "#6c5fcf", "#e45aa5", "#8a5a2b", "#a3a8b8", "#f6c9a4"];

// Labels are English; shown through t().
const TOOLS: { id: Tool; label: string; key: string; icon: ReactNode }[] = [
  { id: "select", label: "Select and move", key: "v", icon: <path d="M6 4l12 7-5.5 1.5L10 18z" fill="currentColor" /> },
  { id: "brush", label: "Brush", key: "b", icon: <path d="M4 18c3 0 4-2 5-4s3-6 6-8 4.5 0 3 2-5 4-7 6-3 4-7 4z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /> },
  { id: "line", label: "Line", key: "l", icon: <path d="M5 19L19 5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /> },
  { id: "rect", label: "Rectangle", key: "r", icon: <rect x="4.5" y="6" width="15" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.2" /> },
  { id: "ellipse", label: "Circle", key: "o", icon: <ellipse cx="12" cy="12" rx="8" ry="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" /> },
  { id: "text", label: "Words", key: "t", icon: <path d="M6 6h12M12 6v13M9 19h6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /> },
  { id: "fill", label: "Fill with colour", key: "f", icon: <path d="M5 11l6-6 7 7-6 6zM18 15s2 2.5 2 3.5a2 2 0 01-4 0c0-1 2-3.5 2-3.5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /> },
  { id: "eraser", label: "Eraser", key: "e", icon: <path d="M4 15l8-8 7 7-5 5H8zM9 19h11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" /> },
  { id: "centre", label: "Turning point", key: "c", icon: <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none"><circle cx="12" cy="12" r="5" /><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /></g> },
];

interface Drag {
  kind: "draw" | "move" | "resize" | "erase";
  start: [number, number];
  shape?: Shape;
  box?: Box;
  handle?: Handle;
  moved: boolean;
}

export function PaintEditor({ title, initial, stage, onDone, onCancel }: { title: string; initial: PaintDoc | null; stage: boolean; onDone: (doc: PaintDoc) => void; onCancel: () => void }) {
  const [doc, setDoc] = useState<PaintDoc>(() => initial ?? emptyDoc());
  const [undo, setUndo] = useState<PaintDoc[]>([]);
  const [redo, setRedo] = useState<PaintDoc[]>([]);
  const [tool, setTool] = useState<Tool>(initial?.shapes.length ? "select" : "brush");
  const [fill, setFill] = useState("#f6d33c");
  const [stroke, setStroke] = useState("#262b45");
  const [target, setTarget] = useState<"fill" | "stroke">("fill");
  const [width, setWidth] = useState(6);
  const [fontSize, setFontSize] = useState(36);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Shape | null>(null);
  const [typing, setTyping] = useState<{ x: number; y: number; text: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const svg = useRef<SVGSVGElement>(null);
  const typeBox = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;

  const commit = useCallback((next: PaintDoc) => {
    setUndo((u) => [...u.slice(-49), docRef.current]);
    setRedo([]);
    setDoc(next);
  }, []);
  const back = () => {
    if (!undo.length) return;
    setRedo((r) => [...r, doc]);
    setDoc(undo[undo.length - 1]);
    setUndo((u) => u.slice(0, -1));
    setSelected(null);
  };
  const forward = () => {
    if (!redo.length) return;
    setUndo((u) => [...u, doc]);
    setDoc(redo[redo.length - 1]);
    setRedo((r) => r.slice(0, -1));
  };

  // Fit the board to the space it has.
  const fit = useCallback(() => {
    const el = area.current;
    if (!el) return;
    setZoom(Math.max(0.3, Math.min((el.clientWidth - 24) / doc.w, (el.clientHeight - 24) / doc.h, 3)));
  }, [doc.w, doc.h]);
  useLayoutEffect(fit, [fit]);

  const point = (e: { clientX: number; clientY: number }): [number, number] => {
    const s = svg.current!;
    const p = s.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(s.getScreenCTM()!.inverse());
    return [q.x, q.y];
  };
  const shapeAt = (el: EventTarget | null) => (el instanceof Element ? el.closest("[data-shape]")?.getAttribute("data-shape") : null) || null;
  const replace = (d: PaintDoc, s: Shape) => ({ ...d, shapes: d.shapes.map((x) => (x.id === s.id ? s : x)) });
  const sel = doc.shapes.find((s) => s.id === selected) || null;

  const down = (e: React.PointerEvent) => {
    if (typing) return finishText();
    // Keep focus where it is (a click on the board would take it from the words box).
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const [x, y] = point(e);
    const hit = shapeAt(e.target);
    const handle = (e.target as Element).getAttribute?.("data-handle") as Handle | null;
    if (tool === "select") {
      if (handle && sel) drag.current = { kind: "resize", start: [x, y], shape: sel, box: boxOf(sel), handle, moved: false };
      else if (hit) {
        setSelected(hit);
        drag.current = { kind: "move", start: [x, y], shape: doc.shapes.find((s) => s.id === hit), moved: false };
      } else setSelected(null);
      return;
    }
    if (tool === "fill") {
      const s = doc.shapes.find((x) => x.id === hit);
      if (!s) return;
      if (s.kind === "line") commit(replace(doc, { ...s, stroke: fill === NONE ? stroke : fill }));
      else if (s.kind !== "image") commit(replace(doc, { ...s, fill } as Shape));
      return;
    }
    if (tool === "eraser") {
      drag.current = { kind: "erase", start: [x, y], moved: false };
      // One undo step for the whole stroke of the eraser.
      commit(hit ? { ...doc, shapes: doc.shapes.filter((s) => s.id !== hit) } : doc);
      return;
    }
    if (tool === "centre") {
      if (!stage) commit({ ...doc, cx: Math.round(x), cy: Math.round(y) });
      return;
    }
    if (tool === "text") {
      setTyping({ x, y, text: "" });
      return;
    }
    const id = uid();
    const shape: Shape =
      tool === "brush"
        ? { id, kind: "path", points: [x, y], stroke, sw: width, fill: NONE }
        : tool === "line"
          ? { id, kind: "line", x1: x, y1: y, x2: x, y2: y, stroke, sw: width }
          : tool === "rect"
            ? { id, kind: "rect", x, y, w: 0, h: 0, fill, stroke, sw: width, r: 6 }
            : { id, kind: "ellipse", cx: x, cy: y, rx: 0, ry: 0, fill, stroke, sw: width };
    drag.current = { kind: "draw", start: [x, y], shape, moved: false };
    setDraft(shape);
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = point(e);
    const [x0, y0] = d.start;
    d.moved = d.moved || Math.hypot(x - x0, y - y0) > 1;
    if (d.kind === "erase") {
      const hit = shapeAt(document.elementFromPoint(e.clientX, e.clientY));
      if (hit) setDoc((cur) => ({ ...cur, shapes: cur.shapes.filter((s) => s.id !== hit) }));
      return;
    }
    if (d.kind === "move" && d.shape) {
      setDoc((cur) => replace(cur, moveShape(d.shape!, x - x0, y - y0)));
      return;
    }
    if (d.kind === "resize" && d.shape && d.box) {
      const b = d.box;
      const ax = d.handle!.includes("w") ? b.x + b.w : b.x;
      const ay = d.handle!.includes("n") ? b.y + b.h : b.y;
      let w = x - ax;
      let h = y - ay;
      // Pictures and words keep their shape; hold Shift to keep any shape's proportions.
      if (d.shape.kind === "image" || d.shape.kind === "text" || e.shiftKey) {
        const k = Math.max(Math.abs(w) / (b.w || 1), Math.abs(h) / (b.h || 1));
        w = Math.sign(w || 1) * b.w * k;
        h = Math.sign(h || 1) * b.h * k;
      }
      const to = { x: Math.min(ax, ax + w), y: Math.min(ay, ay + h), w: Math.max(4, Math.abs(w)), h: Math.max(4, Math.abs(h)) };
      setDoc((cur) => replace(cur, fitShape(d.shape!, b, to)));
      return;
    }
    if (d.kind === "draw" && d.shape) {
      const s = d.shape;
      let next: Shape = s;
      if (s.kind === "path") next = d.shape = { ...s, points: [...s.points, x, y] };
      else if (s.kind === "line") next = { ...s, x2: x, y2: y };
      else if (s.kind === "rect") {
        const w = x - x0;
        const h = e.shiftKey ? Math.sign(y - y0 || 1) * Math.abs(w) : y - y0;
        next = { ...s, w, h };
      } else if (s.kind === "ellipse") {
        const rx = (x - x0) / 2;
        const ry = e.shiftKey ? Math.sign(y - y0 || 1) * Math.abs(rx) : (y - y0) / 2;
        next = { ...s, cx: x0 + rx, cy: y0 + ry, rx, ry };
      }
      setDraft(next);
    }
  };

  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if ((d.kind === "move" || d.kind === "resize") && d.moved) {
      // The live drag changed the doc in place; record the state before it for undo.
      const before = { ...docRef.current, shapes: docRef.current.shapes.map((s) => (s.id === d.shape!.id ? d.shape! : s)) };
      setUndo((u) => [...u.slice(-49), before]);
      setRedo([]);
    }
    if (d.kind === "draw" && draft) {
      const s = draft.kind === "path" ? { ...draft, points: thin(draft.points) } : draft;
      const b = boxOf({ ...s, ...(s.kind !== "text" && s.kind !== "image" ? { stroke: NONE } : {}) } as Shape);
      if (s.kind === "path" || b.w > 2 || b.h > 2) commit({ ...doc, shapes: [...doc.shapes, s] });
      setDraft(null);
    }
  };

  const finishText = () => {
    if (typing && typing.text.trim()) commit({ ...doc, shapes: [...doc.shapes, { id: uid(), kind: "text", x: typing.x, y: typing.y, text: typing.text.trim(), size: fontSize, fill: fill === NONE ? stroke : fill }] });
    setTyping(null);
  };

  // Colour and width changes apply to the selected shape too.
  const setColour = (c: string) => {
    if (target === "fill") setFill(c);
    else setStroke(c);
    if (!sel) return;
    if (target === "fill" && sel.kind !== "image" && sel.kind !== "line") commit(replace(doc, { ...sel, fill: c } as Shape));
    if (target === "stroke" && "stroke" in sel) commit(replace(doc, { ...sel, stroke: c } as Shape));
  };
  const setLineWidth = (n: number) => {
    setWidth(n);
    if (sel && "sw" in sel) setDoc(replace(doc, { ...sel, sw: n } as Shape));
  };
  const reorder = (d: number) => {
    if (!sel) return;
    const i = doc.shapes.indexOf(sel);
    const j = Math.max(0, Math.min(doc.shapes.length - 1, i + d));
    const shapes = doc.shapes.slice();
    shapes.splice(i, 1);
    shapes.splice(j, 0, sel);
    commit({ ...doc, shapes });
  };
  const remove = () => {
    if (!sel) return;
    commit({ ...doc, shapes: doc.shapes.filter((s) => s.id !== sel.id) });
    setSelected(null);
  };
  const duplicate = () => {
    if (!sel) return;
    const copy = { ...moveShape(sel, 16, 16), id: uid() };
    commit({ ...doc, shapes: [...doc.shapes, copy] });
    setSelected(copy.id);
  };

  useEffect(() => {
    if (!typing) return;
    const t = window.setTimeout(() => typeBox.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [!!typing]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") return e.preventDefault(), e.shiftKey ? forward() : back();
      if (mod && e.key.toLowerCase() === "y") return e.preventDefault(), forward();
      if (mod && e.key.toLowerCase() === "d") return e.preventDefault(), duplicate();
      if ((e.key === "Delete" || e.key === "Backspace") && sel) return e.preventDefault(), remove();
      if (sel && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const n = e.shiftKey ? 10 : 1;
        const [dx, dy] = e.key === "ArrowLeft" ? [-n, 0] : e.key === "ArrowRight" ? [n, 0] : e.key === "ArrowUp" ? [0, -n] : [0, n];
        return commit(replace(doc, moveShape(sel, dx, dy)));
      }
      if (e.key === "Escape") return setSelected(null);
      if (!mod) {
        const t = TOOLS.find((x) => x.key === e.key.toLowerCase());
        if (t) setTool(t.id);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  const box = sel ? boxOf(sel) : null;
  const hs = 9 / zoom;
  const shown = draft ? [...doc.shapes, draft] : doc.shapes;
  const typingPos = typing && svg.current ? (() => {
    const m = svg.current.getScreenCTM()!;
    const r = area.current!.getBoundingClientRect();
    return { left: m.a * typing.x + m.e - r.left + area.current!.scrollLeft, top: m.d * typing.y + m.f - r.top + area.current!.scrollTop };
  })() : null;

  return (
    <div className="paint" role="dialog" aria-label={title}>
      <header className="paint-bar">
        <strong className="paint-title">{title}</strong>
        <div className="paint-history">
          <button className="icon-btn icon-btn-sm" disabled={!undo.length} onClick={back} aria-label={t("Undo")} title={t("Undo (Ctrl+Z)")}>
            <Icon name="undo" size={18} />
          </button>
          <button className="icon-btn icon-btn-sm flip" disabled={!redo.length} onClick={forward} aria-label={t("Redo")} title={t("Redo")}>
            <Icon name="undo" size={18} />
          </button>
          <button className="icon-btn icon-btn-sm" onClick={() => setZoom((z) => Math.max(0.3, z / 1.25))} aria-label={t("Zoom out")}>
            −
          </button>
          <button className="btn btn-ghost btn-sm" onClick={fit}>
            {Math.round(zoom * 100)}%
          </button>
          <button className="icon-btn icon-btn-sm" onClick={() => setZoom((z) => Math.min(6, z * 1.25))} aria-label={t("Zoom in")}>
            +
          </button>
        </div>
        <span className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>
          {t("Cancel")}
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => (finishText(), onDone(docRef.current))}>
          <Icon name="check" size={16} /> {t("Done")}
        </button>
      </header>

      <div className="paint-body">
        <nav className="paint-tools" aria-label={t("Tools")}>
          {TOOLS.filter((x) => !(stage && x.id === "centre")).map((x) => (
            <button key={x.id} className={tool === x.id ? "on" : ""} aria-pressed={tool === x.id} title={`${t(x.label)} (${x.key.toUpperCase()})`} aria-label={t(x.label)} onClick={() => (setTool(x.id), x.id !== "select" && setSelected(null))}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                {x.icon}
              </svg>
            </button>
          ))}
        </nav>

        <div className="paint-area" ref={area}>
          <svg
            ref={svg}
            className={`paint-board tool-${tool}${stage ? " is-stage" : ""}`}
            width={doc.w * zoom}
            height={doc.h * zoom}
            viewBox={`0 0 ${doc.w} ${doc.h}`}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          >
            {shown.map((s) => (
              <g key={s.id} data-shape={s.id}>
                {(s.kind === "path" || s.kind === "line") && <path d={s.kind === "path" ? pathD(s.points) : `M${s.x1} ${s.y1}L${s.x2} ${s.y2}`} stroke="transparent" strokeWidth={Math.max(s.sw, 14 / zoom)} fill="none" strokeLinecap="round" />}
                <g pointerEvents={s.kind === "path" || s.kind === "line" ? "visibleStroke" : "all"} dangerouslySetInnerHTML={{ __html: shapeSvg(s) }} />
              </g>
            ))}
            {!stage && (
              <g className="paint-centre" pointerEvents="none" transform={`translate(${doc.cx} ${doc.cy}) scale(${1 / zoom})`}>
                <circle r="7" />
                <path d="M-12 0H12M0 -12V12" />
              </g>
            )}
            {box && tool === "select" && (
              <g className="paint-select">
                <rect x={box.x} y={box.y} width={box.w} height={box.h} strokeWidth={1.5 / zoom} pointerEvents="none" />
                {(
                  [
                    ["nw", box.x, box.y],
                    ["ne", box.x + box.w, box.y],
                    ["sw", box.x, box.y + box.h],
                    ["se", box.x + box.w, box.y + box.h],
                  ] as [Handle, number, number][]
                ).map(([h, x, y]) => (
                  <rect key={h} data-handle={h} className={`handle h-${h}`} x={x - hs} y={y - hs} width={hs * 2} height={hs * 2} rx={hs / 2} strokeWidth={1.5 / zoom} />
                ))}
              </g>
            )}
          </svg>
          {typing && typingPos && (
            <input
              ref={typeBox}
              className="paint-type"
              value={typing.text}
              style={{ left: typingPos.left, top: typingPos.top - fontSize * zoom, fontSize: fontSize * zoom, color: fill === NONE ? stroke : fill }}
              onChange={(e) => setTyping({ ...typing, text: e.target.value })}
              onKeyDown={(e) => (e.key === "Enter" ? finishText() : e.key === "Escape" && setTyping(null))}
              onBlur={finishText}
              aria-label={t("Words")}
            />
          )}
        </div>
      </div>

      <footer className="paint-props">
        <div className="seg seg-small" role="radiogroup" aria-label={t("Colour for")}>
          <button className={target === "fill" ? "on" : ""} aria-pressed={target === "fill"} onClick={() => setTarget("fill")}>
            <span className={`swatch${fill === NONE ? " is-none" : ""}`} style={{ background: fill === NONE ? undefined : fill }} /> {t("Fill")}
          </button>
          <button className={target === "stroke" ? "on" : ""} aria-pressed={target === "stroke"} onClick={() => setTarget("stroke")}>
            <span className={`swatch is-ring${stroke === NONE ? " is-none" : ""}`} style={{ borderColor: stroke === NONE ? undefined : stroke }} /> {t("Outline")}
          </button>
        </div>
        <div className="paint-colours" role="group" aria-label={t("Colours")}>
          <button className={`swatch-btn is-none${(target === "fill" ? fill : stroke) === NONE ? " on" : ""}`} aria-label={t("No colour")} title={t("No colour")} onClick={() => setColour(NONE)} />
          {COLOURS.map((c) => (
            <button key={c} className={`swatch-btn${(target === "fill" ? fill : stroke) === c ? " on" : ""}`} style={{ background: c }} aria-label={c} onClick={() => setColour(c)} />
          ))}
          <label className="swatch-btn is-custom" title={t("Any colour")}>
            <input type="color" value={(target === "fill" ? fill : stroke) === NONE ? "#000000" : target === "fill" ? fill : stroke} onChange={(e) => setColour(e.target.value)} aria-label={t("Any colour")} />
          </label>
        </div>
        {tool === "text" || sel?.kind === "text" ? (
          <label className="paint-range">
            <span>{t("Size")}</span>
            <input type="range" min={10} max={120} value={sel?.kind === "text" ? Math.round(sel.size) : fontSize} onChange={(e) => (setFontSize(Number(e.target.value)), sel?.kind === "text" && setDoc(replace(doc, { ...sel, size: Number(e.target.value) })))} />
          </label>
        ) : (
          <label className="paint-range">
            <span>{t("Line")}</span>
            <input type="range" min={1} max={40} value={sel && "sw" in sel ? sel.sw : width} onChange={(e) => setLineWidth(Number(e.target.value))} />
          </label>
        )}
        {sel && (
          <div className="paint-shape-tools">
            <button className="btn btn-ghost btn-sm" onClick={() => reorder(1)} title={t("Bring forward")}>
              <Icon name="up" size={16} /> {t("Forward")}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => reorder(-1)} title={t("Send back")}>
              <Icon name="down" size={16} /> {t("Back")}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={duplicate}>
              <Icon name="copy" size={16} /> {t("Copy")}
            </button>
            <button className="btn btn-ghost btn-sm danger-hover" onClick={remove}>
              <Icon name="trash" size={16} /> {t("Delete")}
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}
