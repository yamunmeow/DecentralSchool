import codeRuntime from "virtual:code-runtime";
import { costumeSvg } from "../../code/art";
import { compileProject } from "../../code/compiler";
import { encodeProject } from "../../code/link";
import type { CodeProject } from "../../code/types";
import { buildCodePage } from "../../shared/page";
import { getLang } from "../i18n";

/**
 * How Game Lab projects leave the studio. The main format is one .html "app file":
 * it plays full screen in any browser with no internet, and the same file opens
 * again in the studio to keep editing. Also: a link, an Android app, and plain JSON.
 */

export const appFile = (p: CodeProject) => buildCodePage(codeRuntime, p, compileProject(p), { lang: getLang() });

export const projectLink = (p: CodeProject) => `${new URL("/c/", window.location.origin).href}#${encodeProject(p)}`;

export const projectJson = (p: CodeProject) => JSON.stringify(p, null, 1);

export function iconSvg(p: CodeProject): string {
  const sprite = p.sprites.find((s) => s.visible) || p.sprites[0];
  const costume = sprite ? sprite.costumes[sprite.costume] : p.stage.costumes[p.stage.costume];
  return costumeSvg(costume);
}

export async function projectFromFile(file: File): Promise<CodeProject> {
  const text = await file.text();
  const embedded = text.match(/<script type="application\/json" id="project">([\s\S]*?)<\/script>/);
  const data = JSON.parse(embedded ? embedded[1] : text);
  if (data?.kind !== "code" || !data.stage || !Array.isArray(data.sprites)) throw new Error("not a project");
  return { ...data, updated: Date.now() } as CodeProject;
}
