import { blockWords } from "./blocks";

/** Block search: the palette's own blocks (with their starting values), best matches first. */

type Item = { kind: string; type?: string; text?: string; [k: string]: unknown };

export function searchBlocks(query: string, items: Item[], extra: (item: Item) => string = () => ""): Item[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const seen = new Set<string>();
  const scored: { item: Item; score: number }[] = [];
  for (const item of items) {
    if (item.kind !== "block" || !item.type) continue;
    const text = `${blockWords(item.type)} ${extra(item)}`.toLowerCase();
    const key = `${item.type}:${extra(item)}`;
    if (seen.has(key)) continue;
    let score = 0;
    for (const w of words) {
      const at = text.search(new RegExp(`(^|\\s)${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
      if (at >= 0) score += at === 0 ? 3 : 2;
      else if (text.includes(w)) score += 1;
      else {
        score = 0;
        break;
      }
    }
    if (score > 0) {
      seen.add(key);
      scored.push({ item, score });
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 30).map((s) => s.item);
}
