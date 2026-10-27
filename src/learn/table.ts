/** Rows and columns out of pasted or uploaded text: CSV (with quotes), TSV or semicolons. */
export function parseTable(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const sample = lines.slice(0, 20);
  const count = (d: string) => sample.filter((l) => l.includes(d)).length;
  const delim = count("\t") >= sample.length / 2 ? "\t" : count(";") > count(",") ? ";" : count(",") >= sample.length / 2 ? "," : null;
  if (!delim) return lines.map((l) => [l.trim()]);
  return lines.map((line) => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') (cur += '"'), i++;
        else if (c === '"') quoted = false;
        else cur += c;
      } else if (c === '"' && !cur.trim()) quoted = true;
      else if (c === delim) out.push(cur.trim()), (cur = "");
      else cur += c;
    }
    out.push(cur.trim());
    return out;
  });
}

const HEADER = /^(text|sentence|example|label|class|category|question|answer|reply|x|y|input|output)$/i;

/** First row is a header if it names the columns instead of holding an example. */
export const looksLikeHeader = (row: string[], numeric: boolean) =>
  row.length > 1 && (numeric ? row.slice(0, 2).every((c) => c && isNaN(Number(c.replace(",", ".")))) : row.slice(0, 2).some((c) => HEADER.test(c)));
