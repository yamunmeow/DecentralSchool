import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { Annotation, Compartment, EditorState, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useEffect, useRef } from "react";

/** A code editor (CodeMirror 6) that can light up lines for the block a student picked. */

export type Language = "html" | "css" | "js";

const fromOutside = Annotation.define<boolean>();
const setLines = StateEffect.define<[number, number] | null>();

const lineMark = Decoration.line({ class: "cm-linked" });

const linkedLines = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects)
      if (e.is(setLines)) {
        if (!e.value) return Decoration.none;
        const [from, to] = e.value;
        const b = new RangeSetBuilder<Decoration>();
        for (let n = Math.max(1, from); n <= Math.min(to, tr.state.doc.lines); n++) {
          const line = tr.state.doc.line(n);
          b.add(line.from, line.from, lineMark);
        }
        return b.finish();
      }
    return deco.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

const look = EditorView.theme({
  "&": { height: "100%", fontSize: "calc(14px * var(--ui, 1))" },
  ".cm-scroller": { fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', lineHeight: "1.6" },
  ".cm-linked": { backgroundColor: "rgba(255, 191, 0, 0.28)", boxShadow: "inset 3px 0 0 #ffbf00" },
});

const languageOf = (l: Language) => (l === "html" ? html() : l === "css" ? css() : javascript());

export function CodeView({
  value,
  language,
  readOnly = false,
  dark = false,
  lines = null,
  onChange,
  onLineClick,
  label,
  scrollTo,
}: {
  value: string;
  language: Language;
  readOnly?: boolean;
  dark?: boolean;
  lines?: [number, number] | null;
  onChange?: (text: string) => void;
  onLineClick?: (line: number) => void;
  label: string;
  /** Scroll this line to the top (e.g. a sprite's part of script.js). */
  scrollTo?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const handlers = useRef({ onChange, onLineClick });
  handlers.current = { onChange, onLineClick };
  const themeSlot = useRef(new Compartment());
  const langSlot = useRef(new Compartment());
  const roSlot = useRef(new Compartment());

  useEffect(() => {
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          look,
          linkedLines,
          langSlot.current.of(languageOf(language)),
          themeSlot.current.of(dark ? oneDark : []),
          roSlot.current.of(EditorState.readOnly.of(readOnly)),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ "aria-label": label }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged && !u.transactions.some((t) => t.annotation(fromOutside))) handlers.current.onChange?.(u.state.doc.toString());
          }),
          EditorView.domEventHandlers({
            mousedown: (e, ed) => {
              const pos = ed.posAtCoords({ x: e.clientX, y: e.clientY });
              if (pos !== null) handlers.current.onLineClick?.(ed.state.doc.lineAt(pos).number);
            },
          }),
        ],
      }),
    });
    view.current = v;
    return () => v.destroy();
    // The editor is made once; later prop changes go through the effects below.
  }, []);

  // New text from outside (the blocks changed), unless the student is typing in it.
  useEffect(() => {
    const v = view.current;
    if (!v || v.state.doc.toString() === value) return;
    if (v.hasFocus && !readOnly) return;
    v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value }, annotations: fromOutside.of(true) });
  }, [value, readOnly]);

  useEffect(() => {
    view.current?.dispatch({ effects: [themeSlot.current.reconfigure(dark ? oneDark : []), langSlot.current.reconfigure(languageOf(language)), roSlot.current.reconfigure(EditorState.readOnly.of(readOnly))] });
  }, [dark, language, readOnly]);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    v.dispatch({ effects: setLines.of(lines) });
    if (lines && lines[0] <= v.state.doc.lines) {
      const pos = v.state.doc.line(lines[0]).from;
      v.dispatch({ effects: EditorView.scrollIntoView(pos, { y: "center" }) });
    }
  }, [lines?.[0], lines?.[1], value]);

  useEffect(() => {
    const v = view.current;
    if (!v || !scrollTo || scrollTo > v.state.doc.lines) return;
    v.dispatch({ effects: EditorView.scrollIntoView(v.state.doc.line(scrollTo).from, { y: "start" }) });
  }, [scrollTo]);

  return <div className="code-view" ref={host} />;
}
