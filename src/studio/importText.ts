import { strFromU8, unzipSync } from "fflate";
import type { Passage } from "../shared/types";
import { t } from "./i18n";

/** Text out of a teacher's file, read in the browser: .txt, .md, .html, .docx, .odt, .pdf. */
export async function textFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) return fromDocx(new Uint8Array(await file.arrayBuffer()));
  if (name.endsWith(".odt")) return fromOdt(new Uint8Array(await file.arrayBuffer()));
  if (name.endsWith(".pdf")) return fromPdf(new Uint8Array(await file.arrayBuffer()));
  const text = await file.text();
  if (name.endsWith(".html") || name.endsWith(".htm")) return fromHtml(text);
  if (name.endsWith(".md")) return text.replace(/^#+\s*/gm, "").replace(/[*_`]{1,3}([^*_`]+)[*_`]{1,3}/g, "$1");
  return text;
}

export const ACCEPT_TEXT = ".txt,.md,.html,.htm,.docx,.odt,.pdf";

function fromDocx(bytes: Uint8Array): string {
  const files = unzipSync(bytes, { filter: (f) => f.name === "word/document.xml" });
  const xml = files["word/document.xml"];
  if (!xml) throw new Error(t("That Word file looks empty."));
  const doc = new DOMParser().parseFromString(strFromU8(xml), "application/xml");
  return Array.from(doc.getElementsByTagName("w:p"))
    .map((p) => Array.from(p.getElementsByTagName("w:t")).map((t) => t.textContent || "").join(""))
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n\n");
}

function fromOdt(bytes: Uint8Array): string {
  const files = unzipSync(bytes, { filter: (f) => f.name === "content.xml" });
  const xml = files["content.xml"];
  if (!xml) throw new Error(t("That document looks empty."));
  const doc = new DOMParser().parseFromString(strFromU8(xml), "application/xml");
  return Array.from(doc.getElementsByTagName("*"))
    .filter((e) => e.tagName === "text:p" || e.tagName === "text:h")
    .map((p) => (p.textContent || "").trim())
    .filter(Boolean)
    .join("\n\n");
}

function fromHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, nav, header, footer").forEach((n) => n.remove());
  const blocks = Array.from(doc.body.querySelectorAll("p, h1, h2, h3, li"));
  const text = blocks.length ? blocks.map((b) => (b.textContent || "").trim()).filter(Boolean).join("\n\n") : doc.body.textContent || "";
  return text.trim();
}

async function fromPdf(bytes: Uint8Array): Promise<string> {
  const [pdfjs, worker] = await Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    let page = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      page += item.str + (item.hasEOL ? "\n" : "");
    }
    pages.push(page);
  }
  // Join hyphenated line breaks, keep blank lines as paragraph breaks, unwrap the rest.
  return pages
    .join("\n\n")
    .replace(/-\n(?=\p{Ll})/gu, "")
    .replace(/\n{2,}/g, "\u0000")
    .replace(/\n/g, " ")
    .replace(/\u0000/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function groupSentences(text: string, size: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const s of text.match(/[^.!?।]+[.!?।]+["')\]]*\s*|[^.!?।]+$/g) || [text]) {
    if (cur && wordCount(cur) + wordCount(s) > size) {
      out.push(cur.trim());
      cur = "";
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export const wordCount = (text: string) => (text.match(/\S+/g) || []).length;

/** Long texts become several passages of about `size` words, split between paragraphs. */
export function splitPassages(title: string, text: string, size = 350): Passage[] {
  // Paragraphs longer than a part (common in PDFs, which lose paragraph breaks) are cut at sentence ends.
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => (wordCount(p) <= size ? [p] : groupSentences(p, size)));
  const parts: string[][] = [[]];
  let words = 0;
  for (const p of paras) {
    const n = wordCount(p);
    if (words > 0 && words + n > size) {
      parts.push([]);
      words = 0;
    }
    parts[parts.length - 1].push(p);
    words += n;
  }
  const many = parts.length > 1;
  return parts.map((ps, i) => ({ title: many ? `${title} (${i + 1}/${parts.length})` : title, text: ps.join("\n\n"), questions: [], glossary: [] }));
}
