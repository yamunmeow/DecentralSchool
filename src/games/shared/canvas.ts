/** Convert a pointer event's client coordinates into the canvas's *logical*
 * drawing coordinate space (the same units used to draw), accounting for
 * the canvas being displayed at a CSS size different from that logical
 * size (e.g. `width:100%` scaling it down on a phone). */
export function pointerPos(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
  e: PointerEvent
): [number, number] {
  const rect = canvas.getBoundingClientRect();
  const scaleX = logicalWidth / rect.width;
  const scaleY = logicalHeight / rect.height;
  return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY];
}

/** Set up a canvas's internal resolution once, matching its CSS box size at
 * a fixed device pixel ratio cap (keeps things crisp without huge buffers). */
export function sizeCanvas(canvas: HTMLCanvasElement, logicalWidth: number, logicalHeight: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = logicalWidth * dpr;
  canvas.height = logicalHeight * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}
