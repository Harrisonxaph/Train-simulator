import type { Track, Network, TrainState, StartPosition } from "./types";
import { pathLength, samplePath, activePaths } from "./geometry";
import { nextRoute } from "./network";
export function createTrain(start: StartPosition, lapLength = 0): TrainState {
  return {
    ...start,
    pathId: start.pathId || "main",
    speed: 0,
    targetSpeed: 2,
    running: false,
    travelled: 0,
    laps: 0,
    lapLength,
  };
}
export function advanceTrain(
  state: TrainState,
  tracks: Track[],
  network: Network,
  dt: number,
): TrainState {
  if (!state.running || !Number.isFinite(dt) || dt <= 0) return state;
  const byId = new Map(tracks.map((t) => [t.id, t]));
  if (!byId.has(state.pieceId) || !revalidateStart(state, tracks))
    return { ...state, running: false, speed: 0 };
  const s = { ...state, pathId: state.pathId || "main" };
  const nextSpeed =
    s.speed +
    Math.sign(s.targetSpeed - s.speed) *
      Math.min(Math.abs(s.targetSpeed - s.speed), dt * 3);
  // Integrate the accelerating portion and the constant-speed remainder separately.
  // Otherwise a frame that crosses the target speed loses distance.
  const acceleratingTime = Math.min(dt, Math.abs(s.targetSpeed - s.speed) / 3);
  let remaining =
    (s.speed + nextSpeed) * 0.5 * acceleratingTime +
    nextSpeed * (dt - acceleratingTime);
  s.speed = nextSpeed;
  let traversals = 0;
  while (remaining > 1e-10 && traversals < 2048) {
    const track = byId.get(s.pieceId)!;
    const length = pathLength(track, s.pathId);
    const available = s.direction === 1 ? length - s.distance : s.distance;
    const step = Math.min(remaining, Math.max(0, available));
    s.distance += step * s.direction;
    s.travelled += step;
    remaining -= step;
    if (remaining <= 1e-10 && available - step > 1e-10) break;
    const exit = s.direction === 1 ? 1 : 0,
      next = nextRoute(network, s.pieceId, s.pathId, exit);
    if (!next || !byId.has(next.pieceId)) {
      s.distance = s.direction === 1 ? length : 0;
      s.speed = 0;
      s.running = false;
      break;
    }
    s.pieceId = next.pieceId;
    s.pathId = next.pathId;
    s.direction = next.end === 0 ? 1 : -1;
    s.distance =
      next.end === 0 ? 0 : pathLength(byId.get(next.pieceId)!, next.pathId);
    traversals++;
  }
  if (traversals >= 2048) {
    s.running = false;
    s.speed = 0;
  }
  s.laps = s.lapLength > 0 ? Math.floor((s.travelled + 1e-8) / s.lapLength) : 0;
  return s;
}
export function trainPose(
  s: TrainState,
  tracks: Track[],
): { x: number; y: number; heading: number } | null {
  const t = tracks.find((t) => t.id === s.pieceId);
  if (!t || !revalidateStart(s, tracks)) return null;
  const p = samplePath(t, s.distance, s.pathId || "main");
  return { ...p, heading: p.heading + (s.direction === -1 ? Math.PI : 0) };
}

export function revalidateStart(
  start: StartPosition | null,
  tracks: Track[],
): StartPosition | null {
  if (!start) return null;
  const t = tracks.find((t) => t.id === start.pieceId),
    pathId = start.pathId || "main";
  if (
    !t ||
    !activePaths(t).some((p) => p.id === pathId) ||
    !Number.isFinite(start.distance) ||
    start.distance < 0 ||
    start.distance > pathLength(t, pathId)
  )
    return null;
  return { ...start, pathId };
}
