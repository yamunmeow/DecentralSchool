import type { RProject, RSprite } from "./runtime";

/**
 * Pointer and keyboard for a stage, Scratch-style: the mouse position is in stage
 * units (rounded, clamped to the stage), "when this sprite clicked" fires on press
 * (on release for a draggable sprite that wasn't moved), the stage gets the click
 * when no sprite is hit, and in the editor every sprite can be dragged.
 */

export interface InputOptions {
  /** In the editor every sprite can be dragged, as in Scratch's editor. */
  editor?: boolean;
  /** Keys go to the project only while this says so (not while typing in a field). */
  keysEnabled?: () => boolean;
  onDragged?: (sprite: RSprite) => void;
}

export function keyName(e: KeyboardEvent): string {
  switch (e.key) {
    case " ": return "space";
    case "ArrowUp": return "up arrow";
    case "ArrowDown": return "down arrow";
    case "ArrowLeft": return "left arrow";
    case "ArrowRight": return "right arrow";
    case "Enter": return "enter";
  }
  if (e.code?.startsWith("Digit")) return e.code.slice(5);
  return e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
}

const typing = (el: Element | null) =>
  !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el as HTMLElement).isContentEditable || !!el.closest(".blocklyWorkspace, .blocklyWidgetDiv, .blocklyDropDownDiv, [role=dialog]"));

export function wireInput(rp: RProject, container: HTMLElement, opts: InputOptions = {}): () => void {
  rp.renderer.setRenderTarget(container);
  const canvas = rp.renderer.stage as HTMLCanvasElement;
  canvas.removeAttribute("tabindex");
  canvas.style.touchAction = "none";

  // Leopard's own mouse listeners would overwrite ours with unrounded values.
  const mouse = { x: 0, y: 0, down: false };
  Object.defineProperty(rp.input, "mouse", { get: () => mouse, set: () => undefined, configurable: true });

  const toStage = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 480 - 240;
    const y = 180 - ((e.clientY - r.top) / r.height) * 360;
    mouse.x = Math.round(Math.max(-240, Math.min(240, x)));
    mouse.y = Math.round(Math.max(-180, Math.min(180, y)));
  };

  let drag: { sprite: RSprite; dx: number; dy: number; startX: number; startY: number; moved: boolean } | null = null;

  const visibleSprites = () => (rp.spritesAndClones as unknown as RSprite[]).filter((s) => s.visible);

  const down = (e: PointerEvent) => {
    if (e.button > 0) return;
    toStage(e);
    mouse.down = true;
    canvas.setPointerCapture?.(e.pointerId);
    let hit: RSprite | null = null;
    try {
      hit = rp.renderer.pick(visibleSprites(), { x: mouse.x, y: mouse.y }) as RSprite | null;
    } catch {
      hit = null;
    }
    if (hit && (opts.editor || hit.draggable)) {
      drag = { sprite: hit, dx: hit.x - mouse.x, dy: hit.y - mouse.y, startX: e.clientX, startY: e.clientY, moved: false };
      return;
    }
    if (hit) rp.clickTarget(hit);
    else rp.clickTarget(rp.stage);
  };

  const move = (e: PointerEvent) => {
    toStage(e);
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.sprite.dragging = true;
      drag.sprite.setLayer(true);
    }
    drag.sprite.goto(mouse.x + drag.dx, mouse.y + drag.dy);
  };

  const up = (e: PointerEvent) => {
    toStage(e);
    mouse.down = false;
    if (!drag) return;
    const d = drag;
    drag = null;
    d.sprite.dragging = false;
    if (d.moved) {
      d.sprite.goto(d.sprite.x, d.sprite.y);
      opts.onDragged?.(d.sprite);
    } else rp.clickTarget(d.sprite);
  };

  const keyDown = (e: KeyboardEvent) => {
    if (opts.keysEnabled && !opts.keysEnabled()) return;
    if (typing(document.activeElement)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = keyName(e);
    if (key === "space" || key.endsWith("arrow")) e.preventDefault();
    rp.keyDown(key);
  };
  const keyUp = (e: KeyboardEvent) => rp.keyUp(keyName(e));
  const blur = () => {
    for (const k of [...(rp.input as unknown as { keys: string[] }).keys]) rp.keyUp(k);
  };

  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  document.addEventListener("keydown", keyDown);
  document.addEventListener("keyup", keyUp);
  window.addEventListener("blur", blur);
  return () => {
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointermove", move);
    canvas.removeEventListener("pointerup", up);
    canvas.removeEventListener("pointercancel", up);
    document.removeEventListener("keydown", keyDown);
    document.removeEventListener("keyup", keyUp);
    window.removeEventListener("blur", blur);
  };
}
