import leopardCss from "leopard/dist/index.min.css?inline";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { costumeSvg, svgUrl } from "../../code/art";
import { absorb, buildRuntime, factoryFor } from "../../code/build";
import { compileSnippet, type SBlock } from "../../code/compiler";
import { LIB } from "../../code/runtime";
import { wireInput } from "../../code/input";
import { scaleStage } from "../../code/stage";
import { allTargets, newTarget, uniqueName } from "../../code/project";
import type { RProject, RSprite } from "../../code/runtime";
import type { CodeProject, Target } from "../../code/types";
import { uid } from "../../shared/random";
import { APP_ID_RE, buildApk, makeIconFromSvg } from "../apk/build";
import { getSigningKey } from "../apk/keys";
import { projects as table } from "../db";
import { download, kb, slug } from "../exporting";
import { go, useApp } from "../store";
import { Field, Icon, Modal } from "../ui";
import { translate, type WebTranslation } from "../../code/web/translate";
import { webZip } from "../../code/web/package";
import { CostumesTab, LibraryModal, SoundsTab, backdropItems, spriteItems } from "./Assets";
import { HandInModal, MissionCard } from "../class/MissionCard";
import "./code.css";

// CodeMirror (HTML, CSS, JavaScript) loads the first time JavaScript or the Web tab is opened.
const CodeView = lazy(() => import("./CodeView").then((m) => ({ default: m.CodeView })));
const WebTab = lazy(() => import("./WebTab").then((m) => ({ default: m.WebTab })));
const MapTab = lazy(() => import("./MapTab").then((m) => ({ default: m.MapTab })));
import { BlocksPane, DEFAULT_PREFS, type BlocksApi, type Prefs } from "./BlocksPane";
import { DialogHost, type DialogRequest } from "./Dialogs";
import { appFile, iconSvg, projectJson, projectLink } from "./files";

const PREFS_KEY = "ds-code-prefs";
type StageSize = "small" | "normal" | "large";

function loadPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
}

let leopardStyle = false;
function injectLeopardCss() {
  if (leopardStyle) return;
  leopardStyle = true;
  const s = document.createElement("style");
  s.textContent = leopardCss;
  document.head.appendChild(s);
}

export function CodeEditor({ id }: { id: string }) {
  const [project, setProject] = useState<CodeProject | null | undefined>(undefined);
  useEffect(() => {
    table.get(id).then((p) => setProject(p || null), () => setProject(null));
  }, [id]);
  if (project === undefined) return <div className="code-loading" aria-busy />;
  if (project === null)
    return (
      <div className="page">
        <p>This project isn't in this browser.</p>
        <a className="btn btn-primary" href="#/code">
          Game Lab
        </a>
      </div>
    );
  return <Editor key={project.id} initial={project} />;
}

function Editor({ initial }: { initial: CodeProject }) {
  const { toast } = useApp();
  const [project, setProject] = useState(initial);
  const projectRef = useRef(project);
  projectRef.current = project;
  const [targetId, setTargetId] = useState(initial.sprites[0]?.id || initial.stage.id);
  const [tab, setTab] = useState<"code" | "map" | "costumes" | "sounds" | "web">("code");
  const [showJs, setShowJs] = useState(() => localStorage.getItem("ds-code-js") === "1");
  const [selected, setSelected] = useState<string | null>(null);
  const [linked, setLinked] = useState(false);
  const [web, setWeb] = useState<WebTranslation | null>(null);
  const pendingSelect = useRef<string | null>(null);
  const [stageSize, setStageSize] = useState<StageSize>(() => (window.innerWidth < 1440 ? "small" : "normal"));
  const [full, setFull] = useState(false);
  const [running, setRunning] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const [modal, setModal] = useState<"sprite" | "backdrop" | "share" | "settings" | "handin" | null>(null);
  const [live, setLive] = useState<{ x: number; y: number; direction: number; size: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [debug, setDebug] = useState<"off" | "slow" | "step">("off");
  /** Blocks changed since the running game was built: Play restarts it with them. */
  const [edited, setEdited] = useState(false);
  const debugRef = useRef(debug);
  debugRef.current = debug;
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark");

  const blocks = useRef<BlocksApi>(null);
  const stageEl = useRef<HTMLDivElement>(null);
  const stageBox = useRef<HTMLDivElement>(null);
  const rp = useRef<RProject | null>(null);
  const unwire = useRef<() => void>(() => undefined);
  const codeDirty = useRef(false);
  const saveTimer = useRef(0);

  useEffect(() => {
    injectLeopardCss();
    const on = () => setDark(document.documentElement.dataset.theme === "dark");
    window.addEventListener("themechange", on);
    return () => window.removeEventListener("themechange", on);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const target = allTargets(project).find((t) => t.id === targetId) || project.stage;

  /* ----- saving ----- */

  const persist = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    let p = projectRef.current;
    if (rp.current) p = absorb(p, rp.current);
    table.put({ ...p, updated: Date.now() }).catch(() => toast("Couldn't save in this browser.", "error"));
  }, [toast]);

  // Once the editor has closed, save straight away: a late save would overwrite changes
  // made elsewhere since (feedback arriving, another tab).
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );
  const scheduleSave = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    if (!alive.current) return persist();
    saveTimer.current = window.setTimeout(persist, 800);
  }, [persist]);

  useEffect(() => {
    const flush = () => {
      blocks.current?.flush();
      persist();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [persist]);

  /* ----- the running stage ----- */

  const rebuild = useCallback(() => {
    const el = stageEl.current;
    if (!el) return;
    let p = projectRef.current;
    if (rp.current) {
      p = absorb(p, rp.current);
      const picked = pickedCostume.current;
      if (picked.size) {
        const pick = (t: Target) => (picked.has(t.id) ? { ...t, costume: Math.min(picked.get(t.id)!, t.costumes.length - 1) } : t);
        p = { ...p, stage: pick(p.stage), sprites: p.sprites.map(pick) };
        picked.clear();
      }
      projectRef.current = p;
      setProject(p);
      unwire.current();
      rp.current.dispose();
      rp.current = null;
    }
    try {
      const next = buildRuntime(p, factoryFor(p, true), {
        onError: (t, m) => setErrors((e) => [...e.slice(-4), `${t === "_stage_" ? "Scene" : t}: ${m}`]),
        onReport: (blockId, value) => blocks.current?.report(blockId, value),
      });
      next.editorMode = true;
      next.debug = { ...next.debug, mode: debugRef.current, onStep: (id) => blocks.current?.step(id) };
      unwire.current = wireInput(next, el, {
        editor: true,
        keysEnabled: () => !document.querySelector("dialog[open]"),
        onDragged: () => scheduleSave(),
      });
      rp.current = next;
      codeDirty.current = false;
      setEdited(false);
      if (import.meta.env.DEV) (window as unknown as { __rp: unknown }).__rp = next;
    } catch (e) {
      setErrors((x) => [...x, `Couldn't start: ${(e as Error).message}`]);
    }
  }, [scheduleSave]);

  // Changes to sprites, costumes, sounds or variables rebuild the stage straight away.
  const structure = useMemo(
    () =>
      JSON.stringify({
        t: allTargets(project).map((t) => [t.id, t.name, t.costumes.map((c) => `${c.id}${c.name}${c.cx},${c.cy}${c.svg ? c.svg.length + c.svg.slice(-60) : ""}`), t.sounds.map((s) => s.id + s.name), t.variables.map((v) => v.id + v.name), t.lists.map((v) => v.id + v.name)]),
        turbo: project.turbo,
      }),
    [project],
  );
  useEffect(() => {
    rebuild();
  }, [structure, rebuild]);

  useEffect(() => (stageBox.current && stageEl.current ? scaleStage(stageBox.current, stageEl.current) : undefined), []);

  useEffect(
    () => () => {
      unwire.current();
      rp.current?.dispose();
      rp.current = null;
    },
    [],
  );

  // Poll the stage: what's running (for the glow) and where the selected sprite is.
  useEffect(() => {
    const t = window.setInterval(() => {
      const r = rp.current;
      if (!r) return;
      setRunning(r.threads.length > 0);
      const runtimeTarget = target.isStage ? (r.stage as unknown as RSprite) : (r.sprites as Record<string, RSprite>)[target.id];
      if (runtimeTarget) blocks.current?.glow(r.runningScripts(runtimeTarget));
      if (!target.isStage && runtimeTarget) setLive({ x: Math.round(runtimeTarget.x), y: Math.round(runtimeTarget.y), direction: Math.round(runtimeTarget.direction), size: Math.round(runtimeTarget.size) });
    }, 150);
    return () => window.clearInterval(t);
  }, [target.id, target.isStage]);

  const ensureFresh = () => {
    blocks.current?.flush();
    if (codeDirty.current) rebuild();
    return rp.current;
  };

  const greenFlag = () => {
    setErrors([]);
    ensureFresh()?.greenFlag();
  };
  const stop = () => {
    rp.current?.stopAll();
    blocks.current?.step(null);
  };

  const setDebugMode = (mode: "off" | "slow" | "step") => {
    setDebug(mode);
    debugRef.current = mode;
    const r = rp.current;
    if (r) r.debug = { ...r.debug, mode, tokens: 0 };
    if (mode === "off") blocks.current?.step(null);
  };
  const stepOnce = () => {
    const r = ensureFresh();
    if (!r) return;
    if (debugRef.current !== "step") setDebugMode("step");
    r.debug.tokens = 1;
    if (!r.threads.length) r.greenFlag();
  };

  /** A block tapped in the palette runs once on the selected character (or the scene). */
  const runBlock = (json: Record<string, unknown>) => {
    const r = ensureFresh();
    if (!r) return;
    const t = projectRef.current.stage.id === targetId ? r.stage : (r.sprites as Record<string, RSprite>)[targetId];
    if (!t) return;
    try {
      const make = new Function("L", compileSnippet(allTargets(projectRef.current).find((x) => x.id === targetId)!, json as unknown as SBlock))(LIB);
      r.runOnce(t as RSprite, make, `palette:${String(json.type)}`);
    } catch (e) {
      setErrors((x) => [...x.slice(-4), (e as Error).message]);
    }
  };

  /* ----- project edits ----- */

  const update = (fn: (p: CodeProject) => CodeProject) => {
    setProject((p) => {
      const next = fn(rp.current ? absorb(p, rp.current) : p);
      projectRef.current = next;
      return next;
    });
    scheduleSave();
  };
  /** Outfits picked in the Outfits tab, kept across the rebuild that adding or changing one causes. */
  const pickedCostume = useRef(new Map<string, number>());
  const updateTarget = (t: Target) => {
    const before = allTargets(projectRef.current).find((x) => x.id === t.id);
    if (before && before.costume !== t.costume) {
      pickedCostume.current.set(t.id, t.costume);
      const r = rp.current;
      const live = r ? (t.isStage ? r.stage : (r.sprites as Record<string, RSprite>)[t.id]) : null;
      if (live && t.costume < before.costumes.length) (live as RSprite).costume = t.costume + 1;
    }
    update((p) => (t.isStage ? { ...p, stage: t } : { ...p, sprites: p.sprites.map((s) => (s.id === t.id ? t : s)) }));
  };

  const onBlocks = (tid: string, json: Record<string, unknown>) => {
    const p = projectRef.current;
    // Saving unchanged scripts must not count as an edit (that would restart a running game).
    if (JSON.stringify(allTargets(p).find((t) => t.id === tid)?.blocks) === JSON.stringify(json)) return;
    setEdited(true);
    const next = tid === p.stage.id ? { ...p, stage: { ...p.stage, blocks: json } } : { ...p, sprites: p.sprites.map((s) => (s.id === tid ? { ...s, blocks: json } : s)) };
    projectRef.current = next;
    setProject(next);
    codeDirty.current = true;
    scheduleSave();
  };

  const onVariable: Parameters<typeof BlocksPane>[0]["onVariable"] = (change) => {
    if (change.kind === "create") {
      const vid = change.id || uid();
      const list = change.type === "list";
      update((p) => {
        const owner = change.global ? p.stage : allTargets(p).find((t) => t.id === targetId) || p.stage;
        const added = list ? { ...owner, lists: [...owner.lists, { id: vid, name: change.name, value: [] }] } : { ...owner, variables: [...owner.variables, { id: vid, name: change.name, value: 0 }] };
        return owner.isStage ? { ...p, stage: added } : { ...p, sprites: p.sprites.map((s) => (s.id === owner.id ? added : s)) };
      });
      codeDirty.current = true;
      return vid;
    }
    update((p) => {
      const each = (t: Target): Target =>
        change.kind === "rename"
          ? { ...t, variables: t.variables.map((v) => (v.id === change.id ? { ...v, name: change.name } : v)), lists: t.lists.map((v) => (v.id === change.id ? { ...v, name: change.name } : v)) }
          : { ...t, variables: t.variables.filter((v) => v.id !== change.id), lists: t.lists.filter((v) => v.id !== change.id) };
      return { ...p, stage: each(p.stage), sprites: p.sprites.map(each) };
    });
    codeDirty.current = true;
  };

  const runScript = (tid: string, blockId: string) => {
    const r = ensureFresh();
    if (!r) return;
    const t = tid === projectRef.current.stage.id ? r.stage : (r.sprites as Record<string, RSprite>)[tid];
    if (t) r.toggleScript(t as RSprite, blockId);
  };

  const addSprite = (item: { costumes: () => Target["costumes"]; name: string; kind: string }) => {
    const taken = projectRef.current.sprites.map((s) => s.name);
    const s = newTarget(uniqueName(item.name, taken), false, item.costumes(), {
      size: item.kind === "zo" ? 70 : 100,
      x: Math.round(Math.random() * 300 - 150),
      y: Math.round(Math.random() * 200 - 100),
    });
    update((p) => ({ ...p, sprites: [...p.sprites, s] }));
    setTargetId(s.id);
    setTab("code");
  };

  const duplicate = (t: Target) => {
    const taken = projectRef.current.sprites.map((s) => s.name);
    const copy: Target = { ...structuredClone(t), id: uid(), name: uniqueName(t.name, taken), x: t.x + 20, y: t.y - 20 };
    update((p) => ({ ...p, sprites: [...p.sprites, copy] }));
    setTargetId(copy.id);
  };

  const remove = (t: Target) =>
    setDialog({
      kind: "confirm",
      title: `Delete ${t.name}?`,
      text: "Its outfits, sounds and blocks go too.",
      resolve: (ok) => {
        if (!ok) return;
        update((p) => ({ ...p, sprites: p.sprites.filter((s) => s.id !== t.id) }));
        if (targetId === t.id) setTargetId(projectRef.current.stage.id);
      },
    });

  const setLiveProp = (patch: Partial<{ x: number; y: number; direction: number; size: number; visible: boolean }>) => {
    const r = rp.current;
    const s = r ? (r.sprites as Record<string, RSprite>)[target.id] : null;
    if (s) {
      if (patch.x !== undefined || patch.y !== undefined) s.goto(patch.x ?? s.x, patch.y ?? s.y);
      if (patch.direction !== undefined) s.direction = patch.direction;
      if (patch.size !== undefined) s.size = patch.size;
      if (patch.visible !== undefined) s.visible = patch.visible;
    }
    update((p) => p);
  };

  /* ----- the web version and the JavaScript panel ----- */

  useEffect(() => {
    try {
      localStorage.setItem("ds-code-js", showJs ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [showJs]);

  useEffect(() => {
    if (!showJs && tab !== "web") return;
    const t = window.setTimeout(() => {
      try {
        setWeb(translate(projectRef.current));
      } catch (e) {
        console.error("Couldn't translate to the web", e);
      }
    }, web ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [project, showJs, tab]);

  // After switching sprite from a click in script.js, select the block once its scripts are loaded.
  useEffect(() => {
    const id = pendingSelect.current;
    if (!id) return;
    pendingSelect.current = null;
    window.setTimeout(() => blocks.current?.select(id), 120);
  }, [targetId]);

  const lineClicked = (line: number) => {
    if (!web) return;
    let best: string | null = null;
    let size = Infinity;
    for (const [id, [a, b]] of web.lines)
      if (line >= a && line <= b && b - a < size) {
        best = id;
        size = b - a;
      }
    if (!best) return;
    setLinked(true);
    if (window.matchMedia("(max-width: 760px)").matches) setShowJs(false);
    let owner: string | null = null;
    for (const [tid, [a, b]] of web.sections) if (line >= a && line <= b) owner = tid;
    if (owner && owner !== targetId) {
      pendingSelect.current = best;
      setTargetId(owner);
    } else blocks.current?.select(best);
  };

  const selectedLines = web && selected ? web.lines.get(selected) || null : null;
  const sectionStart = web?.sections.get(targetId)?.[0];

  const uiStyle = { "--ui": prefs.ui } as CSSProperties;

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "code", label: "Blocks" },
    { id: "map", label: "Map" },
    { id: "costumes", label: target.isStage ? "Backgrounds" : "Outfits" },
    { id: "sounds", label: "Sounds" },
    { id: "web", label: "Web" },
  ];

  return (
    <div className={`code-editor${prefs.dyslexia ? " is-dyslexia" : ""}${full ? " is-full" : ""}`} style={uiStyle}>
      <header className="ce-bar">
        <a className="icon-btn" href="#/code" aria-label="All my games" title="All my games">
          <Icon name="arrowL" />
        </a>
        <input className="ce-title" value={project.title} aria-label="Game name" onChange={(e) => update((p) => ({ ...p, title: e.target.value }))} onBlur={() => !project.title.trim() && update((p) => ({ ...p, title: "Untitled" }))} />
        <nav className="seg ce-tabs" aria-label="Editor">
          {tabs.map((t) => (
            <button key={t.id} className={tab === t.id ? "on" : ""} aria-pressed={tab === t.id} onClick={() => (blocks.current?.flush(), setTab(t.id))}>
              {t.label}
            </button>
          ))}
        </nav>
        <span className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={() => setModal("settings")} aria-label="Display and accessibility">
          <Icon name="eye" size={18} /> <span className="hide-sm">View</span>
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => (blocks.current?.flush(), persist(), setModal("share"))}>
          <Icon name="share" size={18} /> <span className="hide-sm">Save & share</span>
        </button>
      </header>

      <div className={`ce-body stage-${stageSize}${tab === "web" ? " is-web" : ""}`}>
        <section className="ce-left">
          <div className={`ce-pane${showJs ? " with-js" : ""}`} hidden={tab !== "code"}>
            <div className="blocks-wrap">
              <BlocksPane
                ref={blocks}
                project={() => projectRef.current}
                target={target}
                prefs={prefs}
                dark={dark}
                ask={setDialog}
                onBlocks={onBlocks}
                onVariable={onVariable}
                onBroadcast={(name) => update((p) => (p.broadcasts.some((b) => b.name === name) ? p : { ...p, broadcasts: [...p.broadcasts, { id: uid(), name }] }))}
                onRun={runScript}
                onRunBlock={runBlock}
                onSelect={(id) => {
                  setSelected(id);
                  if (id && showJs) setLinked(true);
                }}
              />
              <button className={`js-toggle${showJs ? " on" : ""}`} aria-pressed={showJs} onClick={() => (blocks.current?.flush(), setShowJs(!showJs))}>
                {"{ }"} <span>JavaScript</span>
              </button>
            </div>
            {showJs && web && (
              <div className="js-panel">
                <div className="js-head">
                  <strong>script.js</strong>
                  <span className="muted">from your blocks</span>
                  <span className="spacer" />
                  <button className="icon-btn icon-btn-sm" aria-label="Close JavaScript" onClick={() => setShowJs(false)}>
                    ✕
                  </button>
                </div>
                <Suspense fallback={<div className="code-view" aria-busy />}>
                  <CodeView value={web.files.js} language="js" readOnly dark={dark} label="script.js, made from your blocks" lines={selectedLines} onLineClick={lineClicked} scrollTo={selectedLines ? undefined : sectionStart} />
                </Suspense>
              </div>
            )}
          </div>
          {tab === "map" && (
            <Suspense fallback={<div className="map-tab" aria-busy />}>
              <MapTab
                project={project}
                dark={dark}
                onJump={(tid, blockId) => {
                  setTab("code");
                  if (tid !== targetId) {
                    pendingSelect.current = blockId || null;
                    setTargetId(tid);
                  } else if (blockId) window.setTimeout(() => blocks.current?.select(blockId), 120);
                }}
              />
            </Suspense>
          )}
          {tab === "costumes" && <CostumesTab target={target} onChange={updateTarget} />}
          {tab === "sounds" && <SoundsTab target={target} onChange={updateTarget} />}
          {tab === "web" && web && (
            <Suspense fallback={<div className="web-tab" aria-busy />}>
              <WebTab
                project={project}
                translation={web}
                dark={dark}
                linked={linked}
                onWeb={(w) => update((p) => ({ ...p, web: w }))}
                onDots={(done) => update((p) => ({ ...p, dots: done }))}
                onRemake={() =>
                  setDialog({
                    kind: "confirm",
                    title: "Make the files again from the blocks?",
                    text: "Your changes to index.html, style.css and script.js will be replaced.",
                    resolve: (ok) => ok && update((p) => ({ ...p, web: undefined })),
                  })
                }
              />
            </Suspense>
          )}
        </section>

        <aside className="ce-right">
          {project.mission && <MissionCard project={project} update={update} onHandIn={() => (blocks.current?.flush(), persist(), setModal("handin"))} />}
          <section className="scene-card" aria-label="Scene">
            <div className="scene-head">
              <strong>Scene</strong>
              <span className="spacer" />
              <div className="seg seg-small stage-sizes" role="radiogroup" aria-label="Scene size">
                {(["small", "normal", "large"] as StageSize[]).map((s) => (
                  <button key={s} className={stageSize === s ? "on" : ""} aria-pressed={stageSize === s} onClick={() => setStageSize(s)}>
                    {s === "small" ? "S" : s === "normal" ? "M" : "L"}
                  </button>
                ))}
              </div>
              <button className="icon-btn icon-btn-sm" aria-label={full ? "Leave full screen" : "Full screen"} onClick={() => setFull(!full)}>
                {full ? "✕" : "⛶"}
              </button>
            </div>
            <div className="stage-frame">
              <div className="stage-box" ref={stageBox}>
                <div ref={stageEl} className="stage-canvas" aria-label="Scene" />
              </div>
              <div className="play-bar">
                <button className={`play-btn${running ? " on" : ""}`} onClick={greenFlag} aria-label="Play" title="Play">
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                    <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
                  </svg>
                  <span>{running && edited ? "Restart" : running ? "Playing" : "Play"}</span>
                </button>
                <button className="stop-btn" onClick={stop} aria-label="Stop" title="Stop">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                    <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
                  </svg>
                </button>
                {full && (
                  <button className="stop-btn" onClick={() => setFull(false)} aria-label="Leave full screen">
                    ✕
                  </button>
                )}
              </div>
              <div className="speed-bar">
                <div className="seg seg-small debug-modes" role="radiogroup" aria-label="Speed">
                  <button className={debug === "off" ? "on" : ""} aria-pressed={debug === "off"} onClick={() => setDebugMode("off")} title="Normal speed">
                    Normal
                  </button>
                  <button className={debug === "slow" ? "on" : ""} aria-pressed={debug === "slow"} onClick={() => setDebugMode("slow")} title="Slow motion: see each block as it runs">
                    Slow
                  </button>
                  <button className={debug === "step" ? "on" : ""} aria-pressed={debug === "step"} onClick={() => setDebugMode("step")} title="One block at a time">
                    Step
                  </button>
                </div>
                {debug === "step" && (
                  <button className="btn btn-soft btn-sm next-btn" onClick={stepOnce}>
                    Next block
                  </button>
                )}
              </div>
            </div>
          </section>
          {errors.length > 0 && (
            <div className="ce-errors" role="alert">
              {errors.map((e, i) => (
                <p key={i}>{e}</p>
              ))}
            </div>
          )}

          <section className="cast" aria-label="Characters">
            <div className="cast-head">
              <strong>Characters</strong>
              <span className="muted">{project.sprites.length}</span>
            </div>
            <ul className="cast-list">
              <li>
                <button className={`cast-item is-scene${project.stage.id === targetId ? " on" : ""}`} aria-pressed={project.stage.id === targetId} onClick={() => setTargetId(project.stage.id)}>
                  <span className="cast-pic">
                    <img src={svgUrl(costumeSvg(project.stage.costumes[project.stage.costume]))} alt="" />
                  </span>
                  <span className="cast-name">Scene</span>
                </button>
              </li>
              {project.sprites.map((s) => (
                <li key={s.id}>
                  <button className={`cast-item${s.id === targetId ? " on" : ""}`} aria-pressed={s.id === targetId} onClick={() => setTargetId(s.id)}>
                    <span className="cast-pic">
                      <img src={svgUrl(costumeSvg(s.costumes[s.costume] || s.costumes[0]))} alt="" />
                    </span>
                    <span className="cast-name">{s.name}</span>
                  </button>
                </li>
              ))}
              <li>
                <button className="cast-item is-add" onClick={() => setModal("sprite")}>
                  <span className="cast-pic">
                    <Icon name="plus" size={24} />
                  </span>
                  <span className="cast-name">Add</span>
                </button>
              </li>
            </ul>
          </section>

          {target.isStage ? (
            <section className="who-card">
              <div className="who-head">
                <strong>Scene</strong>
                <span className="spacer" />
                <button className="btn btn-soft btn-sm" onClick={() => setModal("backdrop")}>
                  <Icon name="plus" size={16} /> Background
                </button>
              </div>
            </section>
          ) : (
            live && (
              <section className="who-card">
                <div className="who-head">
                  <input className="who-name" aria-label="Character name" value={target.name} onChange={(e) => updateTarget({ ...target, name: e.target.value })} onBlur={() => !target.name.trim() && updateTarget({ ...target, name: uniqueName("Character", project.sprites.map((s) => s.name)) })} />
                  <button className={`icon-btn icon-btn-sm${target.visible ? "" : " is-off"}`} aria-pressed={target.visible} aria-label={target.visible ? "Showing: hide it" : "Hidden: show it"} title={target.visible ? "Showing" : "Hidden"} onClick={() => (setLiveProp({ visible: !target.visible }), updateTarget({ ...target, visible: !target.visible }))}>
                    <Icon name={target.visible ? "eye" : "stop"} size={18} />
                  </button>
                  <button className="icon-btn icon-btn-sm" aria-label={`Duplicate ${target.name}`} title="Duplicate" onClick={() => duplicate(target)}>
                    <Icon name="copy" size={18} />
                  </button>
                  <button className="icon-btn icon-btn-sm danger-hover" aria-label={`Delete ${target.name}`} title="Delete" onClick={() => remove(target)}>
                    <Icon name="trash" size={18} />
                  </button>
                </div>
                <div className="who-props">
                  <NumberBox label="x" value={live.x} onCommit={(x) => setLiveProp({ x })} />
                  <NumberBox label="y" value={live.y} onCommit={(y) => setLiveProp({ y })} />
                  <NumberBox label="Size" value={live.size} onCommit={(size) => setLiveProp({ size })} />
                  <NumberBox label="Facing" value={live.direction} onCommit={(direction) => setLiveProp({ direction })} />
                </div>
              </section>
            )
          )}
        </aside>
      </div>

      <DialogHost request={dialog} done={() => setDialog(null)} />
      {modal === "sprite" && <LibraryModal title="Add a character" items={spriteItems()} onPick={addSprite} onClose={() => setModal(null)} />}
      {modal === "backdrop" && (
        <LibraryModal
          title="Add a background"
          items={backdropItems()}
          onPick={(c) => update((p) => ({ ...p, stage: { ...p.stage, costumes: [...p.stage.costumes, c], costume: p.stage.costumes.length } }))}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "settings" && <SettingsModal prefs={prefs} setPrefs={setPrefs} project={project} update={update} onClose={() => setModal(null)} />}
      {modal === "handin" && <HandInModal project={rp.current ? absorb(project, rp.current) : project} update={update} onClose={() => setModal(null)} />}
      {modal === "share" && <ShareModal project={rp.current ? absorb(project, rp.current) : project} update={update} onClose={() => setModal(null)} />}
    </div>
  );
}

function NumberBox({ label, value, onCommit }: { label: string; value: number; onCommit: (n: number) => void }) {
  const [text, setText] = useState<string | null>(null);
  const commit = () => {
    if (text === null) return;
    const n = Number(text);
    if (text.trim() && Number.isFinite(n)) onCommit(n);
    setText(null);
  };
  return (
    <label className="who-prop">
      <span>{label}</span>
      <input inputMode="decimal" value={text ?? String(value)} onFocus={() => setText(String(value))} onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
    </label>
  );
}

function SettingsModal({ prefs, setPrefs, project, update, onClose }: { prefs: Prefs; setPrefs: (p: Prefs) => void; project: CodeProject; update: (fn: (p: CodeProject) => CodeProject) => void; onClose: () => void }) {
  const set = (patch: Partial<Prefs>) => setPrefs({ ...prefs, ...patch });
  return (
    <Modal title="View" onClose={onClose}>
      <Field label="Text and buttons">
        <div className="seg" role="radiogroup" aria-label="Text size">
          {[1, 1.15, 1.3, 1.5].map((n) => (
            <button key={n} className={prefs.ui === n ? "on" : ""} aria-pressed={prefs.ui === n} onClick={() => set({ ui: n })}>
              {Math.round(n * 100)}%
            </button>
          ))}
        </div>
      </Field>
      <Field label="Block size">
        <div className="seg" role="radiogroup" aria-label="Block size">
          {[0.7, 0.9, 1.15, 1.5, 2].map((n) => (
            <button key={n} className={prefs.blocks === n ? "on" : ""} aria-pressed={prefs.blocks === n} onClick={() => set({ blocks: n })}>
              {Math.round((n / 0.9) * 100)}%
            </button>
          ))}
        </div>
      </Field>
      <label className="check">
        <input type="checkbox" checked={prefs.highContrast} onChange={(e) => set({ highContrast: e.target.checked })} />
        High-contrast blocks
      </label>
      <label className="check">
        <input type="checkbox" checked={prefs.dyslexia} onChange={(e) => set({ dyslexia: e.target.checked })} />
        Easy-to-read font
      </label>
      <label className="check">
        <input type="checkbox" checked={prefs.readAloud} onChange={(e) => set({ readAloud: e.target.checked })} />
        Read selected blocks aloud
      </label>
      <hr className="rule" />
      <label className="check">
        <input type="checkbox" checked={project.turbo} onChange={(e) => update((p) => ({ ...p, turbo: e.target.checked }))} />
        Super speed (no waiting between frames)
      </label>
      <label className="check">
        <input type="checkbox" checked={project.touchPad} onChange={(e) => update((p) => ({ ...p, touchPad: e.target.checked }))} />
        Arrow keys on touch screens when shared
      </label>
    </Modal>
  );
}

function ShareModal({ project, update, onClose }: { project: CodeProject; update: (fn: (p: CodeProject) => CodeProject) => void; onClose: () => void }) {
  const { toast } = useApp();
  const page = useMemo(() => appFile(project), [project]);
  const link = useMemo(() => projectLink(project), [project]);
  const [busy, setBusy] = useState(false);
  const appId = `org.decentralschool.code.p${project.id.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
  const [lastCode, setLastCode] = useState(() => Number(localStorage.getItem(`ds-apk-${project.id}`) || 0));

  const apk = async () => {
    setBusy(true);
    try {
      if (!APP_ID_RE.test(appId)) throw new Error("Bad app id");
      const versionCode = lastCode + 1;
      const key = await getSigningKey();
      const icon = await makeIconFromSvg(iconSvg(project));
      const blob = await buildApk(icon, page, { id: appId, name: project.title.slice(0, 30) || "Game Lab", version: `1.${versionCode}`, versionCode, keepScreenOn: true }, key);
      download(`${slug(project.title)}-v${versionCode}.apk`, blob, "application/vnd.android.package-archive");
      localStorage.setItem(`ds-apk-${project.id}`, String(versionCode));
      setLastCode(versionCode);
      toast(`App ready: ${kb(blob.size)}`);
    } catch (e) {
      toast((e as Error).message || "Couldn't build the app.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Save & share" wide onClose={onClose}>
      <div className="share-rows">
        <section className="share-row">
          <Icon name="file" size={22} />
          <div className="grow">
            <strong>App file (.html)</strong>
            <p className="muted">Plays in any browser without internet. Open it here again to keep editing.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => download(`${slug(project.title)}.html`, page)}>
            <Icon name="download" size={16} /> {kb(new Blob([page]).size)}
          </button>
        </section>
        <section className="share-row">
          <Icon name="link" size={22} />
          <div className="grow">
            <strong>Link</strong>
            <p className="muted">{link.length > 60000 ? "Too big for a link; use the app file." : "The project travels inside the link."}</p>
          </div>
          <button
            className="btn btn-soft btn-sm"
            disabled={link.length > 60000}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                toast("Link copied");
              } catch {
                toast("Couldn't copy the link.", "error");
              }
            }}
          >
            <Icon name="copy" size={16} /> Copy
          </button>
        </section>
        <section className="share-row">
          <Icon name="android" size={22} />
          <div className="grow">
            <strong>Android app</strong>
            <p className="muted">{lastCode ? `Next build is version ${lastCode + 1} and updates installed copies.` : "Installs like any app; works offline."}</p>
          </div>
          <button className="btn btn-soft btn-sm" disabled={busy} onClick={apk}>
            <Icon name="download" size={16} /> {busy ? "Building…" : "APK"}
          </button>
        </section>
        <section className="share-row">
          <Icon name="code" size={22} />
          <div className="grow">
            <strong>Web project (.zip)</strong>
            <p className="muted">index.html, style.css and script.js with the pictures and sounds, to open in any code editor.</p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              const t = translate(project);
              const files = project.web ? { html: project.web.html, css: project.web.css, js: project.web.js } : t.files;
              download(`${slug(project.title)}-web.zip`, new Blob([webZip(files, t.assets, project.title) as BlobPart], { type: "application/zip" }), "application/zip");
            }}
          >
            <Icon name="download" size={16} /> ZIP
          </button>
        </section>
        <section className="share-row">
          <Icon name="game" size={22} />
          <div className="grow">
            <strong>Scratch project (.sb3)</strong>
            <p className="muted">Opens in Scratch and other Scratch editors.</p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              const { projectToSb3 } = await import("../../code/sb3export");
              download(`${slug(project.title)}.sb3`, new Blob([projectToSb3(project) as BlobPart], { type: "application/x.scratch.sb3" }), "application/x.scratch.sb3");
            }}
          >
            <Icon name="download" size={16} /> SB3
          </button>
        </section>
        <section className="share-row">
          <Icon name="edit" size={22} />
          <div className="grow">
            <strong>Project file (.json)</strong>
            <p className="muted">Readable text, for keeping or for other tools.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => download(`${slug(project.title)}.json`, projectJson(project), "application/json")}>
            <Icon name="download" size={16} /> JSON
          </button>
        </section>
      </div>
      <p className="muted small">Saved in this browser as you work.</p>
      <button className="link-btn" onClick={() => (update((p) => ({ ...p })), go("code"))}>
        Back to all projects
      </button>
    </Modal>
  );
}
