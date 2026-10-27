/**
 * The stage is a fixed 480 × 360 surface scaled to its box with a CSS transform, so
 * watchers, speech bubbles and the ask box zoom with it. The canvas still renders at
 * full resolution for its on-screen size.
 */
export function scaleStage(box: HTMLElement, surface: HTMLElement): () => void {
  surface.style.position = "absolute";
  surface.style.left = "0";
  surface.style.top = "0";
  surface.style.width = "480px";
  surface.style.height = "360px";
  surface.style.transformOrigin = "0 0";
  const fit = () => {
    const r = box.getBoundingClientRect();
    const k = Math.min(r.width / 480, r.height / 360) || 1;
    surface.style.transform = `scale(${k})`;
    surface.style.left = `${(r.width - 480 * k) / 2}px`;
    surface.style.top = `${(r.height - 360 * k) / 2}px`;
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(box);
  return () => ro.disconnect();
}
