import * as Blockly from "blockly/core";

/**
 * The "rail" look for Game Lab blocks. Every step is a light card riding on a coloured
 * rail: the block is filled with its category colour and a light panel covers all
 * but a strip down the left edge and the arms of loops and ifs, so stacked cards line
 * up into one track and nested steps sit on a branch of it. Start blocks are solid,
 * value blocks are light pills, yes/no blocks are rounded tags. No jigsaw notches:
 * cards simply stack.
 */

/** Width of the coloured strip down a card's left edge. */
const RAIL = 7;
/** Extra room between the rail and a card's first word or icon. */
const RAIL_PAD = 6;

const darkArrow = (fill: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 4.5l3.5 3.5 3.5-3.5" fill="none" stroke="${fill}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`)}`;

class RailConstants extends Blockly.zelos.ConstantProvider {
  constructor() {
    super();
    this.CORNER_RADIUS = 3 * this.GRID_UNIT;
    this.NOTCH_HEIGHT = 0;
    this.STATEMENT_BOTTOM_SPACER = 0;
    this.MIN_BLOCK_HEIGHT = 11 * this.GRID_UNIT;
    this.FIELD_BORDER_RECT_RADIUS = 2 * this.GRID_UNIT;
    this.FIELD_DROPDOWN_COLOURED_DIV = false;
    this.SELECTED_GLOW_COLOUR = "#f5b700";
    this.SELECTED_GLOW_SIZE = 1;
    this.STATEMENT_INPUT_PADDING_LEFT = 5 * this.GRID_UNIT;
  }

  setDynamicProperties_(theme: Blockly.Theme) {
    super.setDynamicProperties_(theme);
    const dark = theme.name.includes("-d-");
    this.FIELD_DROPDOWN_SVG_ARROW_DATAURI = darkArrow(dark ? "#fbf3dd" : "#3d2f10");
    // Typing fields paint their whole block with this (Blockly's "full block field").
    this.FIELD_BORDER_RECT_COLOUR = dark ? "#1c1810" : "#ffffff";
  }

  /** Flat: a card's bottom edge simply meets the next card's top. */
  makeNotch() {
    const w = this.NOTCH_WIDTH;
    return { type: this.SHAPES.NOTCH, width: w, height: 0, pathLeft: `h ${w}`, pathRight: `h ${-w}` };
  }

  /** Yes/no values are rounded tags (value pills are fully round), never hexagons. */
  shapeFor(connection: Blockly.RenderedConnection) {
    const shape = super.shapeFor(connection);
    return shape === this.HEXAGONAL ? this.SQUARED! : shape;
  }

  getCSS_(selector: string): string[] {
    return [
      ...super.getCSS_(selector),
      `${selector} .blocklyText { fill: var(--blk-ink); }`,
      `${selector} .blocklyDropdownText { fill: var(--blk-ink) !important; }`,
      `${selector} .blocklyNonEditableField>text, ${selector} .blocklyEditableField>text, ${selector} .blocklyNonEditableField>g>text, ${selector} .blocklyEditableField>g>text { fill: var(--blk-ink); }`,
      `${selector} .rail-solid>.blocklyNonEditableField>text, ${selector} .rail-solid>.blocklyNonEditableField>g>text { fill: var(--blk-solid-ink); }`,
      `${selector} .blocklyHtmlInput { color: var(--blk-ink); background: var(--blk-field); }`,
      `${selector} .blocklyNonEditableField>rect:not(.blocklyDropdownRect), ${selector} .blocklyEditableField>rect:not(.blocklyDropdownRect) { fill: var(--blk-field); }`,
      `${selector} .railPanel { pointer-events: none; }`,
      `${selector} .blocklyInsertionMarker>.railPanel { display: none; }`,
      `${selector} .blocklyDraggable:not(.blocklyDisabled) .blocklyEditableField:not(.blocklyEditing):hover>rect, ${selector} .blocklyDraggable:not(.blocklyDisabled) .blocklyEditableField:not(.blocklyEditing):hover>.blocklyPath { stroke: var(--blk-hover); stroke-width: 2; }`,
    ];
  }
}

class RailInfo extends Blockly.zelos.RenderInfo {
  getInRowSpacing_(prev: Blockly.blockRendering.Measurable | null, next: Blockly.blockRendering.Measurable | null) {
    const base = super.getInRowSpacing_(prev, next);
    const T = Blockly.blockRendering.Types;
    // Room for the rail before the first thing on each row of a step card.
    if (!prev && next && !this.outputConnection && (T.isField(next) || T.isInlineInput(next) || T.isIcon(next))) return base + RAIL_PAD;
    return base;
  }
}

type Row = Blockly.blockRendering.Row & { hasStatement?: boolean };

class RailDrawer extends Blockly.zelos.Drawer {
  draw() {
    super.draw();
    const block = (this as unknown as { block_: Blockly.BlockSvg }).block_;
    (block.pathObject as RailPath).setPanel(this.panel(block));
  }

  /** Light panels over each run of rows that isn't the inside of a loop or if. */
  private panel(block: Blockly.BlockSvg): string {
    const info = this.info_;
    if (info.outputConnection || block.isShadow() || !block.previousConnection) return "";
    const inset = 2;
    const segments: Row[][] = [[]];
    for (const row of info.rows as Row[]) {
      if (row.hasStatement) segments.push([]);
      else segments[segments.length - 1].push(row);
    }
    let d = "";
    for (const seg of segments) {
      const rows = seg.filter((r) => r.height > 0);
      if (!rows.length) continue;
      const top = rows[0].yPos + inset;
      const bottom = rows[rows.length - 1].yPos + rows[rows.length - 1].height - inset;
      const right = Math.max(...rows.map((r) => r.xPos + r.width)) - inset;
      const h = bottom - top;
      const w = right - RAIL;
      if (h <= 4 || w <= 4) continue;
      const r = Math.min(this.constants_.CORNER_RADIUS - inset, h / 2, w / 2);
      d += `M ${RAIL + r} ${top} H ${right - r} A ${r} ${r} 0 0 1 ${right} ${top + r} V ${bottom - r} A ${r} ${r} 0 0 1 ${right - r} ${bottom} H ${RAIL + r} A ${r} ${r} 0 0 1 ${RAIL} ${bottom - r} V ${top + r} A ${r} ${r} 0 0 1 ${RAIL + r} ${top} Z `;
    }
    return d;
  }
}

class RailPath extends Blockly.zelos.PathObject {
  private readonly panelPath: SVGPathElement;

  constructor(root: SVGElement, style: Blockly.Theme.BlockStyle, constants: Blockly.zelos.ConstantProvider) {
    super(root, style, constants);
    this.panelPath = Blockly.utils.dom.createSvgElement(Blockly.utils.Svg.PATH, { class: "railPanel" });
    this.svgPath.after(this.panelPath);
  }

  setPanel(d: string) {
    this.panelPath.setAttribute("d", d);
  }

  applyColour(block: Blockly.BlockSvg) {
    super.applyColour(block);
    const s = this.style;
    const solid = !block.outputConnection && !block.previousConnection && !block.isShadow();
    root(this).classList.toggle("rail-solid", solid);
    if (block.isShadow()) {
      this.svgPath.setAttribute("fill", "var(--blk-field)");
      this.svgPath.setAttribute("stroke", "var(--blk-field-line)");
    } else if (block.outputConnection) {
      this.svgPath.setAttribute("fill", s.colourSecondary);
      this.svgPath.setAttribute("stroke", s.colourPrimary);
    } else {
      this.svgPath.setAttribute("fill", s.colourPrimary);
      this.svgPath.setAttribute("stroke", s.colourTertiary);
    }
    this.panelPath.setAttribute("fill", s.colourSecondary);
    // Empty slots waiting for a value.
    const outlines = (this as unknown as { outlines: Map<string, SVGElement> }).outlines;
    outlines?.forEach((o) => {
      o.setAttribute("fill", "var(--blk-slot)");
      o.setAttribute("stroke", "var(--blk-field-line)");
    });
  }
}

const root = (p: RailPath) => (p as unknown as { svgRoot: SVGElement }).svgRoot;

class RailRenderer extends Blockly.zelos.Renderer {
  protected makeConstants_() {
    return new RailConstants();
  }
  protected makeRenderInfo_(block: Blockly.BlockSvg) {
    return new RailInfo(this, block);
  }
  protected makeDrawer_(block: Blockly.BlockSvg, info: Blockly.blockRendering.RenderInfo) {
    return new RailDrawer(block, info as Blockly.zelos.RenderInfo);
  }
  makePathObject(root: SVGElement, style: Blockly.Theme.BlockStyle) {
    return new RailPath(root, style, this.getConstants());
  }
}

let registered = false;
export function registerRailRenderer() {
  if (registered) return;
  registered = true;
  Blockly.blockRendering.register("rail", RailRenderer);
}
