import type { Track, TrainState, StartPosition, SwitchState } from "./types";
import { isSwitch, pathLength } from "./geometry";
import { footprintBounds } from "./footprints";
import { trainPose, revalidateStart } from "./simulation";
import { buildNetwork, loopLengthFor } from "./network";
export { isSwitch } from "./geometry";
export function switchOccupied(
  t: Track,
  train: TrainState | null,
  tracks: Track[],
): boolean {
  if (!train || !isSwitch(t)) return false;
  if (train.pieceId === t.id) return true;
  const pose = trainPose(train, tracks);
  if (!pose) return false;
  const b = footprintBounds(t),
    cx = b.x + b.width / 2,
    cy = b.y + b.height / 2,
    hx = b.width / 2,
    hy = b.height / 2;
  const u = { x: Math.cos(pose.heading), y: Math.sin(pose.heading) },
    v = { x: -u.y, y: u.x };
  // Separating-axis test: locomotive body plus clearance versus the full turnout footprint.
  for (const axis of [{ x: 1, y: 0 }, { x: 0, y: 1 }, u, v]) {
    const separation = Math.abs(
        (pose.x - cx) * axis.x + (pose.y - cy) * axis.y,
      ),
      body =
        0.55 * Math.abs(u.x * axis.x + u.y * axis.y) +
        0.33 * Math.abs(v.x * axis.x + v.y * axis.y),
      tile = hx * Math.abs(axis.x) + hy * Math.abs(axis.y);
    if (separation > body + tile) return false;
  }
  return true;
}
export function changeSwitchRoute(
  tracks: Track[],
  id: string,
  alignment: SwitchState,
  train: TrainState | null,
  start: StartPosition | null,
): {
  tracks: Track[];
  train: TrainState | null;
  start: StartPosition | null;
  blocked: boolean;
} {
  const t = tracks.find((t) => t.id === id);
  const unchanged = { tracks, train, start, blocked: false };
  if (!t || !isSwitch(t) || (t.switchState || "straight") === alignment)
    return unchanged;
  if (switchOccupied(t, train, tracks)) return { ...unchanged, blocked: true };
  const next = tracks.map((p) =>
      p.id === id ? { ...p, switchState: alignment } : p,
    ),
    updated = next.find((p) => p.id === id)!;
  let reset = start;
  if (start?.pieceId === id) {
    const pathId = alignment === "branch" ? "branch" : "main";
    reset = { ...start, pathId, distance: pathLength(updated, pathId) / 2 };
  }
  reset = revalidateStart(reset, next);
  const state = train
    ? {
        ...train,
        travelled: 0,
        laps: 0,
        lapLength: loopLengthFor(
          buildNetwork(next),
          train.pieceId,
          train.pathId || "main",
        ),
      }
    : null;
  return { tracks: next, train: state, start: reset, blocked: false };
}
