import type {
  Track,
  Endpoint,
  PathId,
  PortId,
  TraversalPath,
  Pose,
} from "./types";
export const BOARD_SIZE = 20;
export const isSwitch = (t: Track) =>
  t.type === "switch-left" || t.type === "switch-right";
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
export function endpoints(t: Track): Endpoint[] {
  let local: number[][];
  if (t.type === "curve")
    local = [
      [0, 0.5, -1, 0],
      [0.5, 1, 0, 1],
    ];
  else if (t.type === "crossing")
    local = [
      [0, 0.5, -1, 0],
      [1, 0.5, 1, 0],
      [0.5, 0, 0, -1],
      [0.5, 1, 0, 1],
    ];
  else if (isSwitch(t))
    local = [
      [0, 0.5, -1, 0],
      [2, 0.5, 1, 0],
      [
        1.5,
        t.type === "switch-left" ? 0 : 1,
        0,
        t.type === "switch-left" ? -1 : 1,
      ],
    ];
  else
    local = [
      [0, 0.5, -1, 0],
      [1, 0.5, 1, 0],
    ];
  return local.map(([x, y, dx, dy], i) => {
    const p = rotatePoint(x, y, t.rotation),
      v = rotateVector(dx, dy, t.rotation);
    return {
      pieceId: t.id,
      end: i as PortId,
      x: t.x + p.x,
      y: t.y + p.y,
      dx: v.x,
      dy: v.y,
    };
  });
}
export function paths(t: Track): TraversalPath[] {
  if (t.type === "crossing")
    return [
      { id: "main", ports: [0, 1] },
      { id: "cross", ports: [2, 3] },
    ];
  if (isSwitch(t))
    return [
      { id: "main", ports: [0, 1] },
      { id: "branch", ports: [0, 2] },
    ];
  return [{ id: "main", ports: [0, 1] }];
}
export function activePaths(t: Track): TraversalPath[] {
  return paths(t).filter(
    (p) =>
      !isSwitch(t) || p.id === (t.switchState === "branch" ? "branch" : "main"),
  );
}
export function pathLength(t: Track, pathId: PathId = "main"): number {
  if (!paths(t).some((p) => p.id === pathId)) throw Error("Unknown track path");
  if (isSwitch(t)) return pathId === "branch" ? 1 + Math.PI / 4 : 2;
  return t.type === "curve" ? Math.PI / 4 : 1;
}
export function samplePath(
  t: Track,
  distance: number,
  pathId: PathId = "main",
): Pose {
  const d = Math.max(0, Math.min(pathLength(t, pathId), distance));
  let x = d,
    y = 0.5,
    heading = 0;
  if (t.type === "curve") {
    const angle = -Math.PI / 2 + 2 * d;
    x = 0.5 * Math.cos(angle);
    y = 1 + 0.5 * Math.sin(angle);
    heading = 2 * d;
  } else if (t.type === "crossing" && pathId === "cross") {
    x = 0.5;
    y = d;
    heading = Math.PI / 2;
  } else if (isSwitch(t) && pathId === "branch" && d > 1) {
    const sign = t.type === "switch-left" ? -1 : 1,
      angle = 2 * (d - 1);
    x = 1 + 0.5 * Math.sin(angle);
    y = 0.5 + sign * 0.5 * (1 - Math.cos(angle));
    heading = sign * angle;
  }
  const p = rotatePoint(x, y, t.rotation);
  return {
    x: t.x + p.x,
    y: t.y + p.y,
    heading: heading + (t.rotation * Math.PI) / 2,
  };
}
export function nearestActivePath(
  t: Track,
  point: { x: number; y: number },
): PathId {
  let best: PathId = activePaths(t)[0].id,
    nearest = Infinity;
  for (const path of activePaths(t))
    for (let i = 0; i <= 32; i++) {
      const p = samplePath(t, (pathLength(t, path.id) * i) / 32, path.id),
        d = (p.x - point.x) ** 2 + (p.y - point.y) ** 2;
      if (d < nearest) {
        nearest = d;
        best = path.id;
      }
    }
  return best;
}
