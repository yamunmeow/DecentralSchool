import { registerContinuousToolbox } from "@blockly/continuous-toolbox";
import * as Blockly from "blockly/core";
import * as En from "blockly/msg/en";
import * as Fr from "blockly/msg/fr";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { CodeProject, Target } from "../../code/types";
import { CATEGORIES, ctx, glyphSvg, registerBlocks, blockTheme } from "./blocks";
import { registerRailRenderer } from "./renderer";
import { editProcedure, myBlocksFlyout, procCtx, registerProcedures, watchDefinitions } from "./procedures";
import { searchBlocks } from "./search";
import { GROUPS, toolboxFor, variablesFlyout } from "./toolbox";
import type { DialogRequest } from "./Dialogs";
import { getLang, t } from "../i18n";

export interface Prefs {
  /** Size of the editor's text and buttons. */
  ui: number;
  /** Starting size of blocks. */
  blocks: number;
  highContrast: boolean;
  dyslexia: boolean;
  readAloud: boolean;
}

export const DEFAULT_PREFS: Prefs = { ui: 1, blocks: 0.9, highContrast: false, dyslexia: false, readAloud: false };

export interface BlocksApi {
  /** Write the open workspace back to its target now. */
  flush: () => void;
  glow: (ids: Set<string>) => void;
  report: (blockId: string, value: unknown) => void;
  refresh: () => void;
  /** Select a block and bring it into view (from a click on its line of JavaScript). */
  select: (blockId: string) => void;
  /** The debugger's current block, outlined (null clears it). */
  step: (blockId: string | null) => void;
}

interface Props {
  project: () => CodeProject;
  target: Target;
  prefs: Prefs;
  dark: boolean;
  ask: (r: DialogRequest) => void;
  onBlocks: (targetId: string, blocks: Record<string, unknown>) => void;
  onVariable: (change: { kind: "create"; name: string; type: string; global: boolean; id?: string } | { kind: "rename"; id: string; name: string } | { kind: "delete"; id: string }) => string | void;
  onBroadcast: (name: string) => void;
  onRun: (targetId: string, blockId: string) => void;
  /** A block in the palette was tapped: run it once, as Scratch does. */
  onRunBlock?: (block: Record<string, unknown>) => void;
  /** The selected block changed (for highlighting its JavaScript). */
  onSelect?: (blockId: string | null) => void;
}

let setup = false;
function setupBlockly() {
  // Blockly's own menus (duplicate, delete, undo…) in the studio's language; Game Lab's blocks follow.
  Blockly.setLocale((getLang() === "fr" ? Fr : En) as unknown as Record<string, string>);
  registerBlocks();
  registerProcedures();
  if (setup) return;
  setup = true;
  registerContinuousToolbox();
  registerRailRenderer();
}

/**
 * Move scripts that overlap (Game Lab's cards are taller than Scratch's blocks, so an
 * imported project's scripts can land on top of each other) down below the ones they hit.
 */
function untangle(w: Blockly.WorkspaceSvg) {
  const tops = (w.getTopBlocks(true) as Blockly.BlockSvg[]).filter((b) => !b.isInsertionMarker());
  const placed: Blockly.utils.Rect[] = [];
  const hit = (a: Blockly.utils.Rect, b: Blockly.utils.Rect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  for (const b of tops) {
    let box = b.getBoundingRectangle();
    for (let guard = 0; guard < tops.length; guard++) {
      const other = placed.find((p) => hit(box, p));
      if (!other) break;
      b.moveBy(0, other.bottom + 24 - box.top);
      box = b.getBoundingRectangle();
    }
    placed.push(box);
  }
}

/** Bring the scripts' top-left corner just inside the visible area (clear of the palette and the search box). */
function showScripts(w: Blockly.WorkspaceSvg) {
  const box = w.getBlocksBoundingBox();
  const view = w.getMetricsManager().getViewMetrics(true);
  if (box && Number.isFinite(box.left) && w.getTopBlocks(false).length) w.scroll(w.scrollX + (view.left - box.left + 24) * w.scale, w.scrollY + (view.top - box.top + 60 / w.scale) * w.scale);
}

/**
 * Each palette category gets its icon (Blockly only draws a coloured dot), and the
 * categories are hung on branches by algorithm step: When, Do, Decide & repeat,
 * Check, Remember.
 */
function decorateToolbox(host: HTMLElement) {
  const CATEGORY_BY_NAME = new Map(Object.entries(CATEGORIES).map(([key, c]) => [t(c.name), key]));
  host.querySelectorAll(".tb-group").forEach((g) => g.remove());
  const rows = [...host.querySelectorAll<HTMLElement>(".blocklyToolboxCategory")];
  rows.forEach((row) => {
    const label = row.querySelector(".blocklyToolboxCategoryLabel")?.textContent || "";
    const bubble = row.querySelector<HTMLElement>(".categoryBubble");
    const key = CATEGORY_BY_NAME.get(label);
    if (!bubble || !key) return;
    if (bubble.dataset.icon !== key) {
      bubble.dataset.icon = key;
      bubble.innerHTML = glyphSvg(key);
      row.style.setProperty("--cat", CATEGORIES[key].colour);
    }
    const group = GROUPS.findIndex((g) => g.cats.includes(key));
    const shown = rows.filter((r) => GROUPS[group]?.cats.includes(CATEGORY_BY_NAME.get(r.querySelector(".blocklyToolboxCategoryLabel")?.textContent || "") || ""));
    row.dataset.branch = shown.length === 1 ? "only" : row === shown[0] ? "first" : row === shown[shown.length - 1] ? "last" : "mid";
    if (row === shown[0] && group >= 0) {
      const head = document.createElement("div");
      head.className = "tb-group";
      head.textContent = `${group + 1} · ${t(GROUPS[group].name)}`;
      head.setAttribute("aria-hidden", "true");
      (row.parentElement?.classList.contains("blocklyToolboxCategoryContainer") ? row.parentElement : row).before(head);
    }
  });
}

/**
 * Tidy up: scripts in columns by what starts them (Play, keys, taps, signals, copies,
 * tricks, loose blocks), top to bottom, so nothing hides under anything else.
 */
const LANES = [
  (t: string) => t === "event_whenflagclicked",
  (t: string) => t === "event_whenkeypressed",
  (t: string) => t === "event_whenthisspriteclicked" || t === "event_whenstageclicked",
  (t: string) => t === "event_whenbroadcastreceived",
  (t: string) => t.startsWith("event_") || t === "control_start_as_clone",
  (t: string) => t === "procedures_definition",
];
function tidy(w: Blockly.WorkspaceSvg) {
  const tops = (w.getTopBlocks(true) as Blockly.BlockSvg[]).filter((b) => !b.isInsertionMarker());
  const lanes: Blockly.BlockSvg[][] = LANES.map(() => []).concat([[]]);
  for (const b of tops) {
    const i = LANES.findIndex((f) => f(b.type));
    lanes[i < 0 ? LANES.length : i].push(b);
  }
  Blockly.Events.setGroup(true);
  let x = 0;
  for (const lane of lanes.filter((l) => l.length)) {
    let y = 0;
    let wide = 0;
    for (const b of lane) {
      const box = b.getBoundingRectangle();
      b.moveBy(x - box.left, y - box.top);
      y += box.bottom - box.top + 40;
      wide = Math.max(wide, box.right - box.left);
    }
    x += wide + 64;
  }
  Blockly.Events.setGroup(false);
  showScripts(w);
}

/** After a drop, a script that landed on another one moves just below it. */
function unstack(w: Blockly.WorkspaceSvg, moved: Blockly.BlockSvg) {
  if (moved.getParent()) return;
  const hit = (a: Blockly.utils.Rect, b: Blockly.utils.Rect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  for (let guard = 0; guard < 20; guard++) {
    const box = moved.getBoundingRectangle();
    const other = (w.getTopBlocks(false) as Blockly.BlockSvg[]).find((b) => b !== moved && !b.isInsertionMarker() && hit(box, b.getBoundingRectangle()));
    if (!other) return;
    moved.moveBy(0, other.getBoundingRectangle().bottom + 24 - box.top);
  }
}

const FONT = '"Nunito Variable", "Nunito", "Helvetica Neue", Helvetica, Arial, sans-serif';
const DYSLEXIA_FONT = '"Atkinson Hyperlegible", "Nunito Variable", Arial, sans-serif';

export const BlocksPane = forwardRef<BlocksApi, Props>(function BlocksPane(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const ws = useRef<Blockly.WorkspaceSvg | null>(null);
  const loadedId = useRef<string>("");
  const loading = useRef(false);
  const glowing = useRef<Set<string>>(new Set());
  const stepping = useRef<string | null>(null);
  const saveTimer = useRef(0);
  const propsRef = useRef(props);
  propsRef.current = props;
  const [phone, setPhone] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  const [bubble, setBubble] = useState<{ x: number; y: number; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [corner, setCorner] = useState({ left: 0, top: 0 });
  const searchBox = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const m = window.matchMedia("(max-width: 760px)");
    const on = () => setPhone(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);

  const save = () => {
    const w = ws.current;
    if (!w || loading.current || !loadedId.current) return;
    const state = Blockly.serialization.workspaces.save(w) as Record<string, unknown>;
    delete state.variables;
    propsRef.current.onBlocks(loadedId.current, state);
  };

  const load = (target: Target) => {
    const w = ws.current;
    if (!w) return;
    const p = propsRef.current.project();
    const known = new Set<string>();
    const variables = [...p.stage.variables, ...(target.isStage ? [] : target.variables)].map((v) => (known.add(v.id), { name: v.name, id: v.id, type: "" }));
    const lists = [...p.stage.lists, ...(target.isStage ? [] : target.lists)].map((v) => (known.add(v.id), { name: v.name, id: v.id, type: "list" }));
    // A block that names a variable that no longer exists would stop the load: give it one.
    const missing: { name: string; id: string; type: string }[] = [];
    JSON.stringify(target.blocks, (k, v) => {
      if ((k === "VARIABLE" || k === "LIST") && v && typeof v === "object" && "id" in v && !known.has(v.id)) {
        known.add(v.id);
        missing.push({ name: k === "LIST" ? "list" : "variable", id: v.id, type: k === "LIST" ? "list" : "" });
      }
      return v;
    });
    loading.current = true;
    try {
      Blockly.Events.disable();
      try {
        w.clear();
      } finally {
        Blockly.Events.enable();
      }
      Blockly.serialization.workspaces.load({ ...target.blocks, variables: [...variables, ...lists, ...missing] }, w, { recordUndo: false });
      for (const m of missing) propsRef.current.onVariable({ kind: "create", name: m.name, type: m.type, global: false, id: m.id });
    } catch (e) {
      console.error("Couldn't load the scripts", e);
    } finally {
      loading.current = false;
    }
    loadedId.current = target.id;
    w.updateToolbox(toolboxFor(target.isStage, p.mission?.categories ?? null));
    // The continuous flyout keeps its old contents after updateToolbox until asked to redraw.
    const toolbox = w.getToolbox() as (Blockly.IToolbox & { refreshSelection?: () => void; getFlyout?: () => Blockly.IFlyout | null; getToolboxItems?: () => unknown[] }) | null;
    toolbox?.refreshSelection?.();
    w.refreshToolboxSelection();
    if (host.current) decorateToolbox(host.current);
    w.clearUndo();
    requestAnimationFrame(() => {
      untangle(w);
      showScripts(w);
    });
    glowing.current = new Set();
  };

  // Inject (again when the layout, theme or font changes).
  useEffect(() => {
    setupBlockly();
    const div = host.current!;
    const { prefs } = propsRef.current;
    const theme = blockTheme({ highContrast: prefs.highContrast, dark: props.dark, font: prefs.dyslexia ? DYSLEXIA_FONT : FONT });
    const w = Blockly.inject(div, {
      renderer: "rail",
      theme,
      // The real toolbox goes in once the Variables / My Blocks callbacks exist (load()).
      toolbox: { kind: "categoryToolbox", contents: [{ kind: "category", name: t("Move"), categorystyle: "motion_category", contents: [] }] } as unknown as Blockly.utils.toolbox.ToolboxInfo,
      plugins: phone ? {} : { flyoutsVerticalToolbox: "ContinuousFlyout", metricsManager: "ContinuousMetrics", toolbox: "ContinuousToolbox" },
      horizontalLayout: phone,
      toolboxPosition: "start",
      zoom: { controls: true, wheel: false, startScale: prefs.blocks, maxScale: 3, minScale: 0.3, scaleSpeed: 1.15, pinch: true },
      move: { scrollbars: true, drag: true, wheel: true },
      grid: { spacing: 28, length: 2, colour: props.dark ? "#3e3424" : "#f3e3b0", snap: false },
      trashcan: false,
      sounds: false,
      comments: true,
      collapse: true,
      disable: true,
      oneBasedIndex: true,
      maxTrashcanContents: 0,
    });
    ws.current = w;
    if (import.meta.env.DEV) (window as unknown as { __blocks: unknown }).__blocks = { ws: w, Blockly };

    ctx.current = {
      project: () => propsRef.current.project(),
      target: () => propsRef.current.target,
      newMessage: () =>
        new Promise((resolve) =>
          propsRef.current.ask({
            kind: "prompt",
            title: t("New message"),
            label: t("Message name"),
            value: "",
            resolve: (name) => {
              if (name) propsRef.current.onBroadcast(name);
              resolve(name);
            },
          }),
        ),
    };
    procCtx.edit = (proc) => new Promise((resolve) => propsRef.current.ask({ kind: "procedure", proc, resolve }));
    Blockly.dialog.setPrompt((message, defaultValue, callback) => propsRef.current.ask({ kind: "prompt", title: message, label: message, value: defaultValue, resolve: callback }));
    Blockly.dialog.setConfirm((message, callback) => propsRef.current.ask({ kind: "confirm", title: t("Are you sure?"), text: message, resolve: callback }));

    const makeVar = (list: boolean) => {
      const p = propsRef.current.project();
      const target = propsRef.current.target;
      const taken = [...p.stage.variables, ...p.stage.lists, ...target.variables, ...target.lists].map((v) => v.name);
      propsRef.current.ask({
        kind: "variable",
        list,
        stage: target.isStage,
        taken,
        resolve: (r) => {
          if (!r) return;
          const id = propsRef.current.onVariable({ kind: "create", name: r.name, type: list ? "list" : "", global: r.global });
          if (id) w.getVariableMap().createVariable(r.name, list ? "list" : "", id);
          w.refreshToolboxSelection();
        },
      });
    };
    w.registerButtonCallback("MAKE_VARIABLE", () => makeVar(false));
    w.registerButtonCallback("MAKE_LIST", () => makeVar(true));
    w.registerButtonCallback("MAKE_BLOCK", () => editProcedure(w, null));
    w.registerToolboxCategoryCallback("SCRATCH_VARIABLES", () => {
      const p = propsRef.current.project();
      const target = propsRef.current.target;
      const sorted = <T extends { name: string }>(l: T[]) => [...l].sort((a, b) => a.name.localeCompare(b.name));
      return variablesFlyout(sorted([...p.stage.variables, ...(target.isStage ? [] : target.variables)]), sorted([...p.stage.lists, ...(target.isStage ? [] : target.lists)]));
    });
    w.registerToolboxCategoryCallback("SCRATCH_PROCEDURES", () => myBlocksFlyout(w));
    watchDefinitions(w);

    w.addChangeListener((e) => {
      if (loading.current) return;
      if (e.type === Blockly.Events.VAR_RENAME) {
        const r = e as Blockly.Events.VarRename;
        propsRef.current.onVariable({ kind: "rename", id: r.varId!, name: r.newName! });
        w.refreshToolboxSelection();
      } else if (e.type === Blockly.Events.VAR_DELETE) {
        propsRef.current.onVariable({ kind: "delete", id: (e as Blockly.Events.VarDelete).varId! });
        w.refreshToolboxSelection();
      } else if (e.type === Blockly.Events.VAR_CREATE) {
        const c = e as Blockly.Events.VarCreate;
        const p = propsRef.current.project();
        const t = propsRef.current.target;
        const known = [...p.stage.variables, ...p.stage.lists, ...t.variables, ...t.lists].some((v) => v.id === c.varId);
        if (!known) propsRef.current.onVariable({ kind: "create", name: c.varName!, type: c.varType || "", global: false, id: c.varId });
      }
      if (e.type === Blockly.Events.SELECTED) {
        const id = (e as Blockly.Events.Selected).newElementId;
        propsRef.current.onSelect?.(id && w.getBlockById(id) ? id : null);
      }
      if (e.type === Blockly.Events.CLICK) {
        const click = e as Blockly.Events.Click;
        if (click.targetType !== "block" || !click.blockId) return;
        setTimeout(() => {
          // Clicking a field edits it (as in Scratch); otherwise run the script.
          if (Blockly.WidgetDiv.isVisible() || Blockly.DropDownDiv.isVisible()) return;
          const block = w.getBlockById(click.blockId!);
          if (block) propsRef.current.onRun(loadedId.current, block.getRootBlock().id);
        });
        return;
      }
      if (e.type === Blockly.Events.BLOCK_DRAG && !(e as Blockly.Events.BlockDrag).isStart) {
        const b = w.getBlockById((e as Blockly.Events.BlockDrag).blockId!) as Blockly.BlockSvg | null;
        if (b) setTimeout(() => unstack(w, b));
      }
      if (e.isUiEvent) return;
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(save, 250);
    });

    // Tapping a block in the palette runs it (a tap, not a drag).
    const flyoutWs = w.getFlyout()?.getWorkspace();
    flyoutWs?.addChangeListener((e) => {
      if (e.type !== Blockly.Events.CLICK) return;
      const click = e as Blockly.Events.Click;
      if (click.targetType !== "block" || !click.blockId) return;
      setTimeout(() => {
        if (Blockly.WidgetDiv.isVisible() || Blockly.DropDownDiv.isVisible()) return;
        const block = flyoutWs.getBlockById(click.blockId!);
        if (block) propsRef.current.onRunBlock?.(Blockly.serialization.blocks.save(block.getRootBlock(), { addCoordinates: false }) as unknown as Record<string, unknown>);
      });
    });

    load(propsRef.current.target);
    // Coming back from another tab (the pane was hidden, so 0 wide): show the scripts again.
    let wasHidden = div.clientWidth === 0;
    const onResize = () => {
      Blockly.svgResize(w);
      const hidden = div.clientWidth === 0;
      if (wasHidden && !hidden) requestAnimationFrame(() => showScripts(w));
      wasHidden = hidden;
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(div);
    return () => {
      window.clearTimeout(saveTimer.current);
      save();
      ro.disconnect();
      w.dispose();
      ws.current = null;
      loadedId.current = "";
    };
    // Re-inject only when the look or layout changes (refs carry the rest).
  }, [phone, props.dark, props.prefs.highContrast, props.prefs.dyslexia]);

  // Switch sprite: write the old one's scripts, load the new one's.
  useEffect(() => {
    if (!ws.current || loadedId.current === props.target.id) return;
    window.clearTimeout(saveTimer.current);
    save();
    load(props.target);
    setBubble(null);
  }, [props.target.id]);

  useEffect(() => {
    ws.current?.setScale(props.prefs.blocks);
  }, [props.prefs.blocks]);

  useImperativeHandle(ref, () => ({
    flush: () => {
      window.clearTimeout(saveTimer.current);
      save();
    },
    glow: (ids) => {
      const w = ws.current;
      if (!w) return;
      for (const id of glowing.current) if (!ids.has(id)) (w.getBlockById(id) as Blockly.BlockSvg | null)?.removeClass("ds-running");
      for (const id of ids) if (!glowing.current.has(id)) (w.getBlockById(id) as Blockly.BlockSvg | null)?.addClass("ds-running");
      glowing.current = new Set(ids);
    },
    report: (blockId, value) => {
      const block = (ws.current?.getBlockById(blockId) || ws.current?.getFlyout()?.getWorkspace().getBlockById(blockId)) as Blockly.BlockSvg | null;
      const box = block?.getSvgRoot().getBoundingClientRect();
      const hostBox = host.current?.getBoundingClientRect();
      if (!box || !hostBox) return;
      setBubble({ x: box.left - hostBox.left + box.width / 2, y: box.bottom - hostBox.top + 8, text: Array.isArray(value) ? value.join(" ") : String(value) });
      if (propsRef.current.prefs.readAloud && "speechSynthesis" in window) speechSynthesis.speak(new SpeechSynthesisUtterance(String(value)));
    },
    refresh: () => ws.current?.refreshToolboxSelection(),
    step: (blockId) => {
      const w = ws.current;
      if (!w) return;
      if (stepping.current) (w.getBlockById(stepping.current) as Blockly.BlockSvg | null)?.removeClass("ds-step");
      stepping.current = blockId;
      const block = blockId ? (w.getBlockById(blockId) as Blockly.BlockSvg | null) : null;
      if (!block) return;
      block.addClass("ds-step");
      // Keep the current block in view while stepping.
      const box = block.getBoundingRectangle();
      const view = w.getMetricsManager().getViewMetrics(true);
      if (box.top < view.top || box.bottom > view.top + view.height || box.left < view.left || box.left > view.left + view.width) w.centerOnBlock(blockId!, true);
    },
    select: (blockId) => {
      const w = ws.current;
      const block = w?.getBlockById(blockId) as Blockly.BlockSvg | null;
      if (!w || !block) return;
      Blockly.common.setSelected(block);
      w.centerOnBlock(blockId, true);
    },
  }));

  // Read the focused block aloud (keyboard users and anyone who wants to hear it).
  useEffect(() => {
    if (!props.prefs.readAloud) return;
    const w = ws.current;
    if (!w) return;
    const listener = (e: Blockly.Events.Abstract) => {
      if (e.type !== Blockly.Events.SELECTED) return;
      const id = (e as Blockly.Events.Selected).newElementId;
      const block = id ? w.getBlockById(id) : null;
      if (block && "speechSynthesis" in window) {
        speechSynthesis.cancel();
        speechSynthesis.speak(new SpeechSynthesisUtterance(block.toString()));
      }
    };
    w.addChangeListener(listener);
    return () => w.removeChangeListener(listener);
  }, [props.prefs.readAloud, phone, props.dark]);

  /** Every block the palette offers right now, for searching. */
  const paletteItems = () => {
    const w = ws.current;
    if (!w) return [];
    const p = propsRef.current.project();
    const t = propsRef.current.target;
    const sorted = <T extends { name: string }>(l: T[]) => [...l].sort((a, b) => a.name.localeCompare(b.name));
    const cats = (toolboxFor(t.isStage, p.mission?.categories ?? null) as unknown as { contents: { contents?: unknown[]; custom?: string }[] }).contents;
    return cats.flatMap((c) =>
      c.custom === "SCRATCH_VARIABLES"
        ? (variablesFlyout(sorted([...p.stage.variables, ...(t.isStage ? [] : t.variables)]), sorted([...p.stage.lists, ...(t.isStage ? [] : t.lists)])) as unknown[])
        : c.custom === "SCRATCH_PROCEDURES"
          ? (myBlocksFlyout(w) as unknown[])
          : c.contents || [],
    ) as { kind: string; type?: string }[];
  };

  const search = (q: string) => {
    setQuery(q);
    const w = ws.current;
    const flyout = w?.getFlyout();
    if (!w || !flyout) return;
    if (!q.trim()) {
      const toolbox = w.getToolbox() as (Blockly.IToolbox & { refreshSelection?: () => void }) | null;
      if (phone) flyout.hide();
      else {
        toolbox?.refreshSelection?.();
        w.refreshToolboxSelection();
      }
      return;
    }
    const p = propsRef.current.project();
    const names = new Map([...p.stage.variables, ...p.stage.lists, ...p.sprites.flatMap((x) => [...x.variables, ...x.lists])].map((v) => [v.id, v.name]));
    const found = searchBlocks(q, paletteItems(), (item) => {
      const f = (item as { fields?: Record<string, { id?: string }> }).fields;
      const id = f?.VARIABLE?.id || f?.LIST?.id;
      return id ? names.get(id) || "" : "";
    });
    flyout.show((found.length ? [{ kind: "label", text: t("Blocks for “{query}”", { query: q.trim() }) }, ...found] : [{ kind: "label", text: t("No blocks for “{query}”", { query: q.trim() }) }]) as unknown as Blockly.utils.toolbox.FlyoutItemInfoArray);
  };

  // Keep the search box at the workspace's top-left corner, clear of the palette.
  useEffect(() => {
    const w = ws.current;
    if (!w) return;
    const place = () => {
      const m = w.getMetricsManager().getAbsoluteMetrics();
      setCorner((c) => (c.left === m.left && c.top === m.top ? c : { left: m.left, top: m.top }));
    };
    place();
    const t = window.setInterval(place, 500);
    const key = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.closest("input, textarea, [contenteditable]") || e.target.closest("dialog"));
      if (!typing && (e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key === "f"))) {
        e.preventDefault();
        searchBox.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("keydown", key);
    };
  }, [phone, props.dark, props.prefs.highContrast, props.prefs.dyslexia]);

  return (
    <div className={`blocks-pane${props.prefs.highContrast ? " is-hc" : ""}`} onPointerDown={() => bubble && setBubble(null)}>
      <div ref={host} className="blocks-host" />
      <label className={`block-search${query ? " has-query" : ""}`} style={phone ? { left: 10, bottom: 18 } : { left: corner.left + 10, top: corner.top + 10 }}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
          <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <input ref={searchBox} type="search" value={query} placeholder={t("Find a block")} aria-label={t("Find a block")} onChange={(e) => search(e.target.value)} onKeyDown={(e) => e.key === "Escape" && (search(""), e.currentTarget.blur())} />
      </label>
      <button
        type="button"
        className="tidy-btn"
        style={phone ? { left: 200, bottom: 18 } : { left: corner.left + 10, bottom: 18 }}
        onClick={() => ws.current && tidy(ws.current)}
        title={t("Put scripts in tidy columns, by what starts them")}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
          <path d="M4.5 5h6v5h-6zM13.5 5h6v8h-6zM4.5 13h6v6h-6zM13.5 16h6v3h-6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        {t("Tidy")}
      </button>
      {bubble && (
        <div className="report-bubble" style={{ left: bubble.x, top: bubble.y }} role="status">
          {bubble.text}
        </div>
      )}
    </div>
  );
});
