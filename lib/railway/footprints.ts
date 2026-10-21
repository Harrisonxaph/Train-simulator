import type { Track } from "./types";
import { isSwitch, rotatePoint } from "./geometry";
export function footprint(t: Track): { x: number; y: number }[] {
  return (isSwitch(t) ? [0, 1] : [0]).map((x) => {
    const p = rotatePoint(x + 0.5, 0.5, t.rotation);
    return { x: t.x + Math.floor(p.x), y: t.y + Math.floor(p.y) };
  });
}
export function trackAtCell(
  tracks: Track[],
  x: number,
  y: number,
): Track | undefined {
  return tracks.find((t) => footprint(t).some((p) => p.x === x && p.y === y));
}
export function footprintBounds(t: Track) {
  const cells = footprint(t),
    x = Math.min(...cells.map((c) => c.x)),
    y = Math.min(...cells.map((c) => c.y));
  return {
    x,
    y,
    width: Math.max(...cells.map((c) => c.x)) + 1 - x,
    height: Math.max(...cells.map((c) => c.y)) + 1 - y,
  };
}
