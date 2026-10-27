import { svgUrl } from "../../code/art";
import { zoSvg } from "../../code/art/zo";

/** The certificate of appreciation for a game chosen for the Wall of Fame, as a printable page. */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export interface Award {
  credit: string;
  school: string;
  title: string;
  /** When the game was chosen. */
  date: number;
}

export function certificatePage(a: Award): string {
  const date = new Date(a.date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Certificate of appreciation · ${esc(a.title)}</title>
<style>
@page { size: A4 landscape; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body { display: grid; place-items: center; background: #fff; color: #2b2414; font-family: Georgia, "Times New Roman", serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sheet { position: relative; width: 297mm; height: 210mm; padding: 14mm; background: #fffaf0; }
.frame { height: 100%; border: 3mm solid #f2c230; border-radius: 6mm; outline: 1mm solid #8a6d1d; outline-offset: -6mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 12mm 26mm; gap: 4mm; }
.brand { font: 700 15pt system-ui, sans-serif; letter-spacing: 0.04em; color: #8a6d1d; }
h1 { margin: 0; font-size: 34pt; font-weight: 400; letter-spacing: 0.02em; }
.to { font-size: 13pt; color: #6b5a33; margin-top: 2mm; }
.name { font-size: 30pt; font-style: italic; border-bottom: 0.6mm solid #c9a63a; padding: 0 10mm 1mm; }
.school { font-size: 13pt; color: #6b5a33; }
.why { max-width: 190mm; font-size: 14pt; line-height: 1.45; }
.game { font-weight: 700; }
.foot { display: flex; width: 100%; justify-content: space-between; align-items: flex-end; margin-top: 6mm; font: 11pt system-ui, sans-serif; color: #6b5a33; }
.foot div { min-width: 60mm; border-top: 0.4mm solid #c9a63a; padding-top: 2mm; }
.zo { position: absolute; right: 26mm; top: 22mm; width: 30mm; }
</style></head>
<body><div class="sheet"><div class="frame">
<img class="zo" src="${svgUrl(zoSvg("graduate", "cheer"))}" alt="">
<div class="brand">DecentralSchool · Wall of Fame</div>
<h1>Certificate of appreciation</h1>
<div class="to">presented to</div>
<div class="name">${esc(a.credit)}</div>
${a.school ? `<div class="school">${esc(a.school)}</div>` : ""}
<p class="why">for contributing <span class="game">“${esc(a.title)}”</span> to our open Learning Game Community. Chosen for the Wall of Fame for its creativity, so students everywhere can play it.</p>
<div class="foot"><div>${esc(date)}</div><div>The DecentralSchool team</div></div>
</div></div></body></html>`;
}

/** Opens the print dialog for the certificate (choose “Save as PDF” to keep it as a file). */
export function printCertificate(a: Award) {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  frame.srcdoc = certificatePage(a);
  frame.onload = () => {
    const w = frame.contentWindow;
    if (!w) return;
    w.addEventListener("afterprint", () => frame.remove());
    w.focus();
    w.print();
  };
  document.body.appendChild(frame);
}
