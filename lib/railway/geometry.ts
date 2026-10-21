import type { Track, Endpoint } from "./types";
export const BOARD_SIZE = 20;
export function rotatePoint(
  x: number,
  y: number,
  r: number,
): { x: number; y: number } {
  for (let i = 0; i < r; i++) [x, y] = [1 - y, x];
  return { x, y };
}
function rotateVector(x: number, y: number, r: number) {
  for (let i = 0; i < r; i++) [x, y] = [-y, x];
  return { x: x === 0 ? 0 : x, y: y === 0 ? 0 : y };
}
export function endpoints(t: Track): [Endpoint, Endpoint] {
  const local =
    t.type === "straight"
      ? [
          [0, 0.5, -1, 0],
          [1, 0.5, 1, 0],
        ]
      : [
          [0, 0.5, -1, 0],
          [0.5, 1, 0, 1],
        ];
  return local.map(([x, y, dx, dy], i) => {
    const p = rotatePoint(x, y, t.rotation),
      v = rotateVector(dx, dy, t.rotation);
    return {
      pieceId: t.id,
      end: i as 0 | 1,
      x: t.x + p.x,
      y: t.y + p.y,
      dx: v.x,
      dy: v.y,
    };
  }) as [Endpoint, Endpoint];
}
export function pathLength(t: Track): number {
  return t.type === "straight" ? 1 : Math.PI / 4;
}
export function samplePath(
  t: Track,
  distance: number,
): { x: number; y: number; heading: number } {
  const d = Math.max(0, Math.min(pathLength(t), distance));
  // Base curve has centre (0,1) and radius 1/2: west midpoint to south midpoint.
  const angle = -Math.PI / 2 + 2 * d;
  const local =
    t.type === "straight"
      ? { x: d, y: 0.5 }
      : { x: 0.5 * Math.cos(angle), y: 1 + 0.5 * Math.sin(angle) };
  const p = rotatePoint(local.x, local.y, t.rotation);
  return {
    x: t.x + p.x,
    y: t.y + p.y,
    heading: (t.type === "straight" ? 0 : 2 * d) + (t.rotation * Math.PI) / 2,
  };
}
