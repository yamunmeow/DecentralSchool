import type { ReactNode } from "react";
import { svgUrl } from "../../code/art";
import { zoSvg, type Pose } from "../../code/art/zo";

const cache = new Map<string, string>();

/** A data: URL of Zo in an outfit and pose (made once, then reused). */
export function zoUrl(outfit: string, pose: Pose = "stand"): string {
  const key = `${outfit}/${pose}`;
  if (!cache.has(key)) cache.set(key, svgUrl(zoSvg(outfit, pose)));
  return cache.get(key)!;
}

export function ZoPic({ outfit, pose = "stand", size = 72, className = "" }: { outfit: string; pose?: Pose; size?: number; className?: string }) {
  return <img src={zoUrl(outfit, pose)} alt="" width={size} height={size * 1.25} className={`zo-pic ${className}`} />;
}

/** Zo, dressed for the step, saying one thing at a time. */
export function ZoGuide({ outfit, pose = "stand", children }: { outfit: string; pose?: Pose; children: ReactNode }) {
  return (
    <div className="zo-guide">
      <ZoPic outfit={outfit} pose={pose} size={64} className="zo-guide-pic" />
      <p className="zo-bubble" aria-live="polite">
        {children}
      </p>
    </div>
  );
}
