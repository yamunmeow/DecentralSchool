import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { cpp } from "@codemirror/lang-cpp";
import { exercises, scratchExercise, type Exercise } from "./exercises";

const WANDBOX_URL = "https://wandbox.org/api/compile.json";
const WANDBOX_COMPILER = "gcc-13.2.0-c";
const REQUEST_GAP_MS = 350; // be polite to the free/shared public instance

interface WandboxResponse {
  status: string;
  signal: string;
  compiler_output: string;
  compiler_error: string;
  program_output: string;
  program_error: string;
}

/** A run is a compile failure when the compiler produced errors and nothing ran. */
function isCompileError(result: WandboxResponse): boolean {
  return (
    result.status !== "0" &&
    result.compiler_error.trim() !== "" &&
    result.program_output.trim() === "" &&
    result.program_error.trim() === ""
  );
}

function normalize(s: string): string {
  return s.replace(/\r\n/g, "\n").trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runOnWandbox(code: string, stdin: string): Promise<WandboxResponse> {
  const res = await fetch(WANDBOX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      compiler: WANDBOX_COMPILER,
      stdin,
      save: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`The code runner responded with an error (HTTP ${res.status}).`);
  }
  return res.json();
}

const editorTheme = EditorView.theme(
  {
    "&": {
      color: "var(--ink)",
      backgroundColor: "var(--bg-inset)",
      fontSize: "0.9rem",
      height: "100%",
    },
    ".cm-content": {
      fontFamily: "var(--font-body)",
      caretColor: "var(--pac-yellow)",
      padding: "12px 0",
    },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--pac-yellow)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "rgba(255, 212, 0, 0.18)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--bg-inset)",
      color: "var(--muted)",
      border: "none",
      borderRight: "1px solid var(--border)",
    },
    ".cm-activeLine": { backgroundColor: "rgba(255, 255, 255, 0.04)" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(255, 255, 255, 0.06)" },
    "&.cm-editor.cm-focused": { outline: "none" },
    ".cm-scroller": { fontFamily: "var(--font-body)", overflow: "auto" },
  },
  { dark: true }
);

function makeState(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [basicSetup, cpp(), editorTheme, EditorView.lineWrapping],
  });
}

type OutputKind = "idle" | "busy" | "compile-error" | "output" | "network-error" | "check-result";

export function mountCEditor(root: HTMLElement) {
  root.innerHTML = `
    <div class="cx-wrap">
      <aside class="cx-sidebar" aria-label="Exercises">
        <h2 class="cx-sidebar-title">Exercises</h2>
        <ul class="cx-list" id="cx-list"></ul>
      </aside>

      <div class="cx-main">
        <div class="cx-prompt" id="cx-prompt"></div>

        <div class="cx-editor-shell">
          <div class="cx-editor" id="cx-editor"></div>
        </div>

        <div class="cx-stdin-row">
          <label class="cx-stdin-label" for="cx-stdin">Custom input (stdin)</label>
          <textarea id="cx-stdin" class="cx-stdin" rows="2" placeholder="Only used in Run mode -- Check uses the exercise's own tests"></textarea>
        </div>

        <div class="cx-controls">
          <button class="pixel-btn" id="cx-run" type="button">Run</button>
          <button class="pixel-btn secondary" id="cx-check" type="button">Check</button>
          <button class="pixel-btn secondary" id="cx-reset" type="button">Reset code</button>
          <span class="cx-busy" id="cx-busy" hidden>Compiling and running&hellip;</span>
        </div>

        <div class="cx-output" id="cx-output" aria-live="polite">
          <p class="cx-output-hint">Output appears here after you Run or Check.</p>
        </div>

        <p class="cx-note">
          C code compiles and runs on <a href="https://github.com/melpon/wandbox" target="_blank" rel="noopener noreferrer">Wandbox</a>
          (gcc 13), a free open-source online compiler, via its public API. It's shared --
          if a run fails to reach it, wait a few seconds and try again.
        </p>
      </div>
    </div>
  `;

  const listEl = root.querySelector<HTMLElement>("#cx-list")!;
  const promptEl = root.querySelector<HTMLElement>("#cx-prompt")!;
  const editorMountEl = root.querySelector<HTMLElement>("#cx-editor")!;
  const stdinEl = root.querySelector<HTMLTextAreaElement>("#cx-stdin")!;
  const runBtn = root.querySelector<HTMLButtonElement>("#cx-run")!;
  const checkBtn = root.querySelector<HTMLButtonElement>("#cx-check")!;
  const resetBtn = root.querySelector<HTMLButtonElement>("#cx-reset")!;
  const busyEl = root.querySelector<HTMLElement>("#cx-busy")!;
  const outputEl = root.querySelector<HTMLElement>("#cx-output")!;

  let current: Exercise = scratchExercise;

  const view = new EditorView({
    state: makeState(current.starter),
    parent: editorMountEl,
  });

  function renderList() {
    listEl.innerHTML = exercises
      .map(
        (ex) => `
          <li>
            <button class="cx-list-item${ex.slug === current.slug ? " active" : ""}" data-slug="${ex.slug}" type="button">
              <span class="cx-list-title">${ex.title}</span>
              <span class="cx-list-diff cx-diff-${ex.difficulty}">${ex.difficulty}</span>
            </button>
          </li>
        `
      )
      .join("");
    listEl.querySelectorAll<HTMLButtonElement>(".cx-list-item").forEach((btn) => {
      btn.addEventListener("click", () => selectExercise(btn.dataset.slug!));
    });
  }

  function renderPrompt() {
    promptEl.innerHTML = `
      <h1 class="cx-title">${current.title}</h1>
      <p class="cx-prompt-text">${current.prompt}</p>
      ${
        current.tests.length > 0
          ? `<p class="cx-example">Example: <code>${escapeHtml(current.tests[0].stdin) || "(no input)"}</code> &rarr; <code>${escapeHtml(
              current.tests[0].expectedStdout.split("\n")[0]
            )}${current.tests[0].expectedStdout.includes("\n") ? " ..." : ""}</code></p>`
          : ""
      }
    `;
  }

  function selectExercise(slug: string) {
    const next = exercises.find((e) => e.slug === slug);
    if (!next) return;
    current = next;
    view.setState(makeState(current.starter));
    stdinEl.value = "";
    renderList();
    renderPrompt();
    setOutput("idle");
    checkBtn.hidden = current.tests.length === 0;
  }

  function setBusy(isBusy: boolean) {
    runBtn.disabled = isBusy;
    checkBtn.disabled = isBusy;
    busyEl.hidden = !isBusy;
  }

  function setOutput(kind: OutputKind, html = "") {
    if (kind === "idle") {
      outputEl.innerHTML = `<p class="cx-output-hint">Output appears here after you Run or Check.</p>`;
      return;
    }
    outputEl.innerHTML = html;
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderRunResult(result: WandboxResponse) {
    if (isCompileError(result)) {
      setOutput(
        "compile-error",
        `<p class="cx-output-label cx-label-error">Compile error</p><pre class="cx-pre cx-pre-error">${escapeHtml(
          result.compiler_error || "Unknown compile error."
        )}</pre>`
      );
      return;
    }
    const stdout = result.program_output || "";
    const stderr = result.program_error || "";
    const crashed = result.status !== "0";
    let html = `<p class="cx-output-label">Output${crashed ? " (exited with an error)" : ""}</p>`;
    html += `<pre class="cx-pre${crashed ? " cx-pre-error" : ""}">${escapeHtml(stdout) || "(no output)"}</pre>`;
    if (stderr.trim()) {
      html += `<p class="cx-output-label cx-label-error">stderr</p><pre class="cx-pre cx-pre-error">${escapeHtml(stderr)}</pre>`;
    }
    if (result.compiler_error.trim()) {
      html += `<p class="cx-output-label">Compiler warnings</p><pre class="cx-pre">${escapeHtml(
        result.compiler_error
      )}</pre>`;
    }
    setOutput("output", html);
  }

  function renderNetworkError(err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    setOutput(
      "network-error",
      `<p class="cx-output-label cx-label-error">Couldn't reach the code runner</p><p class="cx-pre-error">${escapeHtml(
        msg
      )} It's a free public service and sometimes rate-limited -- wait a few seconds and try again.</p>`
    );
  }

  runBtn.addEventListener("click", async () => {
    setBusy(true);
    setOutput("busy", "");
    try {
      const result = await runOnWandbox(view.state.doc.toString(), stdinEl.value);
      renderRunResult(result);
    } catch (err) {
      renderNetworkError(err);
    } finally {
      setBusy(false);
    }
  });

  resetBtn.addEventListener("click", () => {
    view.setState(makeState(current.starter));
    setOutput("idle");
  });

  checkBtn.addEventListener("click", async () => {
    if (current.tests.length === 0) return;
    setBusy(true);
    setOutput("busy", "");
    const code = view.state.doc.toString();
    const rows: string[] = [];
    let passCount = 0;
    try {
      for (let i = 0; i < current.tests.length; i++) {
        const test = current.tests[i];
        if (i > 0) await sleep(REQUEST_GAP_MS);
        const result = await runOnWandbox(code, test.stdin);

        if (isCompileError(result)) {
          setOutput(
            "compile-error",
            `<p class="cx-output-label cx-label-error">Compile error</p><pre class="cx-pre cx-pre-error">${escapeHtml(
              result.compiler_error || "Unknown compile error."
            )}</pre>`
          );
          setBusy(false);
          return;
        }

        const actual = normalize(result.program_output || "");
        const expected = normalize(test.expectedStdout);
        const pass = actual === expected;
        if (pass) passCount++;
        rows.push(
          `<div class="cx-test-row ${pass ? "cx-test-pass" : "cx-test-fail"}">` +
            `<p class="cx-test-head">${pass ? "PASS" : "FAIL"} -- test ${i + 1}${
              test.stdin ? ` (input: <code>${escapeHtml(test.stdin)}</code>)` : ""
            }</p>` +
            (pass
              ? ""
              : `<p class="cx-test-detail">Expected:</p><pre class="cx-pre">${escapeHtml(
                  expected
                )}</pre><p class="cx-test-detail">Got:</p><pre class="cx-pre cx-pre-error">${escapeHtml(
                  actual || "(no output)"
                )}</pre>`) +
            `</div>`
        );
      }
      const allPass = passCount === current.tests.length;
      const summary = `<p class="cx-output-label ${allPass ? "cx-label-pass" : "cx-label-error"}">${passCount} / ${
        current.tests.length
      } tests passed</p>`;
      setOutput("check-result", summary + rows.join(""));
    } catch (err) {
      renderNetworkError(err);
    } finally {
      setBusy(false);
    }
  });

  renderList();
  renderPrompt();
  checkBtn.hidden = current.tests.length === 0;
}
