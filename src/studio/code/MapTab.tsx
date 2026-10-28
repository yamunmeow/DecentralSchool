import { useEffect, useMemo, useRef, useState } from "react";
import type { CodeProject } from "../../code/types";
import { download, slug } from "../exporting";
import { t } from "../i18n";
import { Icon } from "../ui";
import { buildTree, drawMap, initialFolds, type Palette } from "./mindmap";

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const palette = (): Palette => ({ paper: css("--paper"), ink: css("--ink"), ink2: css("--ink-2"), line: css("--line-2"), root: css("--brand"), rootInk: css("--brand-ink") });
const LIGHT: Palette = { paper: "#ffffff", ink: "#3d2f10", ink2: "#614d22", line: "#ecd796", root: "#ffd447", rootInk: "#3d2f10" };

/** The whole game as a mind map. Tap a step to open it in the blocks; tap ± to fold. */
export function MapTab({ project, dark, onJump }: { project: CodeProject; dark: boolean; onJump: (targetId: string, blockId?: string) => void }) {
  const [folded, setFolded] = useState(() => initialFolds(project));
  const [zoom, setZoom] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  // Re-read the colours when the theme changes.
  const pal = useMemo(palette, [dark]);
  const tree = useMemo(() => buildTree(project, folded), [project, folded]);
  const map = useMemo(() => drawMap(tree, pal), [tree, pal]);

  const fit = () => {
    const el = box.current;
    if (el) setZoom(Math.max(0.75, Math.min(1.2, (el.clientWidth - 24) / map.width)));
  };
  useEffect(fit, []);

  const toggle = (key: string) =>
    setFolded((f) => {
      const next = new Set(f);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const onClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    const el = e.target as Element;
    const fold = el.closest("[data-fold]");
    if (fold) return toggle(fold.getAttribute("data-fold")!);
    const node = el.closest(".map-node");
    const target = node?.getAttribute("data-target");
    if (target) onJump(target, node!.getAttribute("data-block") || undefined);
  };

  const exportSvg = () => download(`${slug(project.title)}-map.svg`, drawMap(tree, LIGHT).svg, "image/svg+xml");
  const exportPng = () => {
    const { svg, width, height } = drawMap(tree, LIGHT);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(2, 8000 / Math.max(width, height));
      const c = document.createElement("canvas");
      c.width = Math.round(width * scale);
      c.height = Math.round(height * scale);
      const g = c.getContext("2d")!;
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => b && download(`${slug(project.title)}-map.png`, b));
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  return (
    <div className="map-tab">
      <div className="map-bar">
        <strong>{t("Map")}</strong>
        <span className="map-legend hide-sm">
          <span className="lg lg-script" /> {t("starts")}
          <span className="lg lg-loop" /> {t("repeats")}
          <span className="lg lg-if" /> {t("decides")}
          <span className="lg lg-signal" /> {t("signal")}
        </span>
        <span className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={() => setFolded(new Set())}>
          {t("Open all")}
        </button>
        <button className="btn btn-ghost btn-sm hide-sm" onClick={() => setFolded(new Set([project.stage, ...project.sprites].map((x) => `t:${x.id}`)))}>
          {t("Fold all")}
        </button>
        <div className="seg seg-small" role="group" aria-label={t("Zoom")}>
          <button onClick={() => setZoom((z) => Math.max(0.3, z / 1.2))} aria-label={t("Zoom out")}>
            −
          </button>
          <button onClick={fit} aria-label={t("Fit")}>
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))} aria-label={t("Zoom in")}>
            +
          </button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={exportSvg} title={t("Download the map as SVG")}>
          <Icon name="download" size={16} /> SVG
        </button>
        <button className="btn btn-ghost btn-sm" onClick={exportPng} title={t("Download the map as a picture")}>
          PNG
        </button>
      </div>
      <div className="map-scroll" ref={box} onClick={onClick} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick(e))}>
        <div className="map-canvas" style={{ width: map.width * zoom, height: map.height * zoom }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "0 0", width: map.width, height: map.height }} dangerouslySetInnerHTML={{ __html: map.svg }} />
        </div>
      </div>
    </div>
  );
}
