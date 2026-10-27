import * as Blockly from "blockly/core";
import { chip } from "./blocks";
import type { ProcPart, ProcState } from "../../code/compiler";

/**
 * My tricks (Scratch's My Blocks): a "how to" start block whose argument reporters can be dragged
 * out as copies, call blocks shaped from the definition, and "run without screen
 * refresh". Unlike Scratch, a My Block can also be a reporter that returns a value
 * with "report".
 */

export const procCtx: {
  edit: ((proc: ProcState | null) => Promise<ProcState | null>) | null;
} = { edit: null };

type ProcBlock = Blockly.BlockSvg & { proc: ProcState | null; build: () => void };

const ARG_TYPE: Record<string, string> = { num: "argument_reporter_string_number", text: "argument_reporter_string_number", bool: "argument_reporter_boolean" };

/** Rebuild a block's inputs, keeping what was plugged into inputs that still exist. */
function rebuildInputs(block: Blockly.Block, keep: string[], add: () => void) {
  const saved = new Map<string, Blockly.serialization.blocks.State>();
  // What was typed into each slot (its shadow), so changing a trick keeps the values.
  const typed = new Map<string, Blockly.serialization.blocks.State>();
  for (const input of [...block.inputList]) {
    if (keep.includes(input.name)) continue;
    const shadow = input.connection?.getShadowState(true);
    if (shadow && input.name) typed.set(input.name, shadow);
    const child = input.connection?.targetBlock();
    if (child && !child.isShadow() && input.name) saved.set(input.name, Blockly.serialization.blocks.save(child) as Blockly.serialization.blocks.State);
    if (child && !child.isShadow()) child.dispose(false);
    block.removeInput(input.name, true);
  }
  add();
  for (const [name, state] of typed) {
    const input = block.getInput(name);
    if (input?.connection && input.connection.getShadowState()) input.connection.setShadowState(state);
  }
  for (const [name, state] of saved) {
    const input = block.getInput(name);
    if (!input?.connection) continue;
    const child = Blockly.serialization.blocks.append(state, block.workspace);
    const out = child.outputConnection || child.previousConnection;
    if (out) input.connection.connect(out);
  }
}

let n = 0;
const fresh = () => `L${n++}`;

function addParts(block: Blockly.Block, parts: ProcPart[], call: boolean, reporter = false) {
  let row: Blockly.Input | null = null;
  // A step that uses a trick carries the trick chip, like every other step.
  if (call && !reporter) row = block.appendDummyInput(fresh()).appendField(new Blockly.FieldImage(chip("myblocks"), 28, 28, "trick"));
  for (const p of parts) {
    if (p.type === "label") {
      if (!row) row = block.appendDummyInput(fresh());
      row.appendField(p.text || "");
      continue;
    }
    const input = block.appendValueInput(p.id!);
    if (p.type === "bool") input.setCheck("Boolean");
    if (call && p.type !== "bool") input.connection?.setShadowState({ type: "text", fields: { TEXT: "" } });
    row = null;
  }
}

export function registerProcedures() {
  Blockly.Blocks.procedures_definition = {
    init(this: ProcBlock) {
      this.setStyle("myblocks_blocks");
      this.setNextStatement(true);
      this.setInputsInline(true);
      this.appendDummyInput("HEAD").appendField(new Blockly.FieldImage(chip("myblocks", true), 28, 28, "trick")).appendField("how to");
      this.proc = null;
      this.setTooltip("Teach a trick of your own");
    },
    saveExtraState(this: ProcBlock) {
      return this.proc;
    },
    loadExtraState(this: ProcBlock, state: ProcState) {
      this.proc = state;
      this.build();
    },
    build(this: ProcBlock) {
      const proc = this.proc;
      if (!proc) return;
      rebuildInputs(this, ["HEAD"], () => addParts(this, proc.parts, false));
      this.getInput("HEAD")!.fieldRow[1].setValue(proc.reporter ? "how to work out" : "how to");
    },
    customContextMenu(this: ProcBlock, options: Blockly.ContextMenuRegistry.ContextMenuOption[]) {
      options.unshift({ text: "Edit", enabled: true, callback: () => editProcedure(this.workspace, this.proc) } as unknown as Blockly.ContextMenuRegistry.ContextMenuOption);
    },
  };

  Blockly.Blocks.procedures_call = {
    init(this: ProcBlock) {
      this.setStyle("myblocks_blocks");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setInputsInline(true);
      this.proc = null;
    },
    saveExtraState(this: ProcBlock) {
      return this.proc ? { procId: this.proc.id, proc: this.proc } : null;
    },
    loadExtraState(this: ProcBlock, state: { procId: string; proc: ProcState }) {
      this.proc = state.proc;
      this.build();
    },
    build(this: ProcBlock) {
      const proc = this.proc;
      if (!proc) return;
      if (proc.reporter && !this.outputConnection) {
        this.setPreviousStatement(false);
        this.setNextStatement(false);
        this.setOutput(true);
        this.setOutputShape(2);
      } else if (!proc.reporter && this.outputConnection) {
        this.setOutput(false);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
      }
      rebuildInputs(this, [], () => addParts(this, proc.parts, true, !!proc.reporter));
    },
    customContextMenu(this: ProcBlock, options: Blockly.ContextMenuRegistry.ContextMenuOption[]) {
      options.unshift({ text: "Edit", enabled: true, callback: () => editProcedure(this.workspace, findDefinition(this.workspace, this.proc?.id)?.proc ?? this.proc) } as unknown as Blockly.ContextMenuRegistry.ContextMenuOption);
    },
  };

  for (const [type, bool] of [["argument_reporter_string_number", false], ["argument_reporter_boolean", true]] as const) {
    Blockly.Blocks[type] = {
      init(this: Blockly.BlockSvg & { argId: string }) {
        this.setStyle("myblocks_blocks");
        this.setOutput(true, bool ? "Boolean" : null);
        this.setOutputShape(bool ? 3 : 2);
        this.appendDummyInput("NAME_ROW").appendField(new Blockly.FieldLabel(""), "NAME");
        this.argId = "";
      },
      saveExtraState(this: Blockly.Block & { argId: string }) {
        return { argId: this.argId, name: this.getFieldValue("NAME") };
      },
      loadExtraState(this: Blockly.Block & { argId: string }, state: { argId: string; name: string }) {
        this.argId = state.argId;
        this.setFieldValue(state.name, "NAME");
      },
    };
  }

  Blockly.common.defineBlocksWithJsonArray([
    { type: "procedures_return", message0: "%1 give back %2", args0: [{ type: "field_image", src: chip("myblocks"), width: 28, height: 28, alt: "trick" }, { type: "input_value", name: "VALUE" }], previousStatement: null, style: "myblocks_blocks", inputsInline: true, tooltip: "Give back a value from a trick that works something out" },
  ]);
}

export function findDefinition(ws: Blockly.Workspace, id?: string): ProcBlock | undefined {
  if (!id) return undefined;
  return ws.getBlocksByType("procedures_definition", false).find((b) => (b as ProcBlock).proc?.id === id) as ProcBlock | undefined;
}

export function definitions(ws: Blockly.Workspace): ProcState[] {
  return (ws.getBlocksByType("procedures_definition", false) as ProcBlock[]).map((b) => b.proc).filter((p): p is ProcState => !!p);
}

function argReporter(p: ProcPart) {
  return { type: ARG_TYPE[p.type], extraState: { argId: p.id, name: p.name } };
}

/** Create a new definition (proc without a definition yet) or update an existing one and all its calls. */
export async function editProcedure(ws: Blockly.Workspace, current: ProcState | null) {
  if (!procCtx.edit) return;
  const proc = await procCtx.edit(current);
  if (!proc) return;
  Blockly.Events.setGroup(true);
  try {
    const def = findDefinition(ws, proc.id);
    if (!def) {
      const svg = ws as Blockly.WorkspaceSvg;
      const metrics = svg.getMetricsManager?.().getViewMetrics(true);
      const x = (metrics?.left ?? 0) + 40;
      const y = (metrics?.top ?? 0) + 40;
      const inputs: Record<string, unknown> = {};
      for (const p of proc.parts) if (p.type !== "label") inputs[p.id!] = { block: argReporter(p) };
      Blockly.serialization.blocks.append({ type: "procedures_definition", x, y, extraState: proc, inputs } as Blockly.serialization.blocks.State, ws);
    } else {
      def.proc = proc;
      def.build();
      for (const p of proc.parts) {
        if (p.type === "label") continue;
        const input = def.getInput(p.id!);
        if (input?.connection && !input.connection.isConnected()) {
          const r = Blockly.serialization.blocks.append(argReporter(p) as Blockly.serialization.blocks.State, ws);
          input.connection.connect(r.outputConnection!);
        }
      }
      for (const call of ws.getBlocksByType("procedures_call", false) as ProcBlock[])
        if (call.proc?.id === proc.id) {
          call.proc = proc;
          call.build();
        }
      for (const type of Object.values(ARG_TYPE))
        for (const r of ws.getBlocksByType(type, false) as (Blockly.Block & { argId: string })[]) {
          const part = proc.parts.find((p) => p.id === r.argId);
          if (part) r.setFieldValue(part.name, "NAME");
        }
    }
  } finally {
    Blockly.Events.setGroup(false);
  }
  (ws as Blockly.WorkspaceSvg).refreshToolboxSelection?.();
}

/**
 * Keeps definitions tidy: dragging an argument reporter out of a "define" block
 * leaves a fresh one behind, and nothing else can be dropped into those slots.
 */
export function watchDefinitions(ws: Blockly.WorkspaceSvg) {
  ws.addChangeListener((e) => {
    if (e.type !== Blockly.Events.BLOCK_MOVE) return;
    const move = e as Blockly.Events.BlockMove;
    if (move.oldParentId && move.oldInputName) {
      const parent = ws.getBlockById(move.oldParentId) as ProcBlock | null;
      if (parent?.type === "procedures_definition" && parent.proc) {
        const part = parent.proc.parts.find((p) => p.id === move.oldInputName);
        const input = parent.getInput(move.oldInputName);
        if (part && input?.connection && !input.connection.isConnected()) {
          const r = Blockly.serialization.blocks.append(argReporter(part) as Blockly.serialization.blocks.State, ws);
          input.connection.connect(r.outputConnection!);
        }
      }
    }
    if (move.newParentId && move.newInputName) {
      const parent = ws.getBlockById(move.newParentId) as ProcBlock | null;
      const block = ws.getBlockById(move.blockId!) as (Blockly.BlockSvg & { argId?: string }) | null;
      if (parent?.type === "procedures_definition" && block && block.argId !== move.newInputName) {
        setTimeout(() => {
          block.unplug();
          block.moveBy(30, 30);
        });
      }
    }
  });
}

/** Blocks for the My Blocks part of the toolbox. */
export function myBlocksFlyout(ws: Blockly.WorkspaceSvg): Blockly.utils.toolbox.FlyoutItemInfoArray {
  const out: Blockly.utils.toolbox.FlyoutItemInfoArray = [{ kind: "button", text: "+ New trick", callbackkey: "MAKE_BLOCK" }];
  const procs = definitions(ws);
  for (const proc of procs) {
    const inputs: Record<string, unknown> = {};
    for (const p of proc.parts) if (p.type === "num" || p.type === "text") inputs[p.id!] = { shadow: { type: "text", fields: { TEXT: "" } } };
    out.push({ kind: "block", type: "procedures_call", extraState: { procId: proc.id, proc }, inputs } as Blockly.utils.toolbox.BlockInfo);
  }
  if (procs.some((p) => p.reporter)) out.push({ kind: "block", type: "procedures_return", inputs: { VALUE: { shadow: { type: "text", fields: { TEXT: "" } } } } } as Blockly.utils.toolbox.BlockInfo);
  return out;
}
