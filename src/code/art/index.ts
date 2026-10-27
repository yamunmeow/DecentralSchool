import { uid } from "../../shared/random";
import type { ArtRef, CostumeAsset } from "../types";
import { BACKDROP_IDS, BACKDROPS, backdropSvg } from "./backdrops";
import { THING_IDS, THINGS, thingSvg } from "./things";
import { OUTFIT_IDS, OUTFITS, POSE_NAMES, POSES, ZO_CX, ZO_CY, zoSvg, type Pose } from "./zo";

/** The built-in drawings: every Zo job with its poses, things, and backdrops. */

export function artSvg(ref: ArtRef): string {
  if (ref.lib === "zo") return zoSvg(ref.id, (ref.pose as Pose) || "stand");
  if (ref.lib === "thing") return thingSvg(ref.id);
  return backdropSvg(ref.id);
}

export function costumeSvg(c: CostumeAsset): string {
  return c.ref ? artSvg(c.ref) : c.svg || backdropSvg("white");
}

export const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export interface LibraryItem {
  kind: "zo" | "thing";
  id: string;
  name: string;
  /** Costumes a new sprite of this kind starts with. */
  costumes: () => CostumeAsset[];
  thumb: string;
}

const zoCostumes = (id: string): CostumeAsset[] =>
  POSES.map((pose) => ({ id: uid(), name: `${OUTFITS[id].name} ${POSE_NAMES[pose]}`, ref: { lib: "zo", id, pose }, cx: ZO_CX, cy: ZO_CY }));

export const SPRITE_LIBRARY: LibraryItem[] = [
  ...OUTFIT_IDS.map((id) => ({ kind: "zo" as const, id, name: OUTFITS[id].name, costumes: () => zoCostumes(id), thumb: svgUrl(zoSvg(id)) })),
  ...THING_IDS.map((id) => ({
    kind: "thing" as const,
    id,
    name: THINGS[id].name,
    costumes: (): CostumeAsset[] => [{ id: uid(), name: THINGS[id].name, ref: { lib: "thing", id }, cx: THINGS[id].w / 2, cy: THINGS[id].h / 2 }],
    thumb: svgUrl(thingSvg(id)),
  })),
];

/** Single costumes for the costume picker: every Zo pose and every thing. */
export function costumeChoices(): { costume: () => CostumeAsset; name: string; thumb: string; group: string }[] {
  const out: { costume: () => CostumeAsset; name: string; thumb: string; group: string }[] = [];
  for (const id of OUTFIT_IDS)
    for (const pose of POSES) {
      const ref: ArtRef = { lib: "zo", id, pose };
      out.push({ group: OUTFITS[id].name, name: `${OUTFITS[id].name} ${POSE_NAMES[pose]}`, thumb: svgUrl(artSvg(ref)), costume: () => ({ id: uid(), name: `${OUTFITS[id].name} ${POSE_NAMES[pose]}`, ref, cx: ZO_CX, cy: ZO_CY }) });
    }
  for (const id of THING_IDS) {
    const ref: ArtRef = { lib: "thing", id };
    out.push({ group: "Things", name: THINGS[id].name, thumb: svgUrl(artSvg(ref)), costume: () => ({ id: uid(), name: THINGS[id].name, ref, cx: THINGS[id].w / 2, cy: THINGS[id].h / 2 }) });
  }
  return out;
}

export const BACKDROP_LIBRARY = BACKDROP_IDS.map((id) => ({
  id,
  name: BACKDROPS[id].name,
  thumb: svgUrl(backdropSvg(id)),
  costume: (): CostumeAsset => ({ id: uid(), name: BACKDROPS[id].name, ref: { lib: "backdrop", id }, cx: 240, cy: 180 }),
}));
