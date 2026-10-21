import type { Track, Network, TrainState, StartPosition } from "./types";
import { pathLength, samplePath, activePaths, endpoints } from "./geometry";
import { nextRoute, compatible } from "./network";
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
// Validate the graph link against current geometry as well as active alignment.
// This also makes a stale network fail closed after a removal, move or rotation.
function continuation(
  s: StartPosition,
  byId: Map<string, Track>,
  network: Network,
) {
  const t = byId.get(s.pieceId);
  const path = t && activePaths(t).find((p) => p.id === (s.pathId || "main"));
  if (!t || !path) return;
  const side = s.direction === 1 ? 1 : 0;
  const next = nextRoute(network, t.id, path.id, side);
  const target = next && byId.get(next.pieceId);
  const targetPath =
    target && activePaths(target).find((p) => p.id === next!.pathId);
  if (!next || !target || !targetPath) return;
  const a = endpoints(t).find((ep) => ep.end === path.ports[side])!;
  const b = endpoints(target).find(
    (ep) => ep.end === targetPath.ports[next.end],
  )!;
  return compatible(a, b) ? next : undefined;
}
function distanceToEnd(
  s: TrainState,
  byId: Map<string, Track>,
  network: Network,
): number {
  let current: StartPosition = s,
    distance = 0;
  const visited = new Set<string>();
  while (true) {
    const key = JSON.stringify([
      current.pieceId,
      current.pathId || "main",
      current.direction,
    ]);
    if (visited.has(key)) return Infinity;
    visited.add(key);
    const t = byId.get(current.pieceId)!;
    distance +=
      current.direction === 1
        ? pathLength(t, current.pathId) - current.distance
        : current.distance;
    const next = continuation(current, byId, network);
    if (!next) return distance;
    current = {
      pieceId: next.pieceId,
      pathId: next.pathId,
      direction: next.end === 0 ? 1 : -1,
      distance:
        next.end === 0 ? 0 : pathLength(byId.get(next.pieceId)!, next.pathId),
    };
  }
}
const ACCELERATION = 3;
// Exact accelerating/cruising profile, then split the frame at the braking point.
// A distance-based stop envelope avoids frame-rate-dependent creeping at the end.
function motion(speed: number, target: number, dt: number, available: number) {
  const profile = (time: number) => {
    const accelerating = Math.min(
      time,
      Math.abs(target - speed) / ACCELERATION,
    );
    const v = speed + Math.sign(target - speed) * ACCELERATION * accelerating;
    return {
      speed: v,
      distance: (speed + v) * 0.5 * accelerating + v * (time - accelerating),
    };
  };
  const free = profile(dt);
  if (!Number.isFinite(available)) return free;
  let before = { speed, distance: 0 },
    brakeTime = dt;
  if ((speed * speed) / (2 * ACCELERATION) < available - 1e-10) {
    if (
      free.distance + (free.speed * free.speed) / (2 * ACCELERATION) <
      available
    )
      return free;
    let lo = 0,
      hi = dt;
    for (let i = 0; i < 40; i++) {
      const middle = (lo + hi) / 2,
        p = profile(middle);
      if (p.distance + (p.speed * p.speed) / (2 * ACCELERATION) < available)
        lo = middle;
      else hi = middle;
    }
    before = profile(hi);
    brakeTime -= hi;
  }
  const time = Math.min(brakeTime, before.speed / ACCELERATION);
  const v = Math.max(0, before.speed - ACCELERATION * time);
  const distance = before.distance + (before.speed + v) * 0.5 * time;
  return {
    speed: v,
    distance: available - distance < 1e-8 ? available : distance,
  };
}
export function reconcileTrain(
  train: TrainState | null,
  previous: Track[],
  next: Track[],
): TrainState | null {
  if (!train || !revalidateStart(train, next)) return null;
  const old = previous.find((t) => t.id === train.pieceId),
    current = next.find((t) => t.id === train.pieceId)!;
  if (
    !old ||
    old.type !== current.type ||
    old.x !== current.x ||
    old.y !== current.y ||
    old.rotation !== current.rotation
  )
    return null;
  return {
    ...train,
    running: false,
    speed: 0,
    travelled: 0,
    laps: 0,
    lapLength: 0,
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
    return { ...state, running: false, speed: 0, stopReason: "invalid" };
  const s = { ...state, pathId: state.pathId || "main" };
  const availableAhead = distanceToEnd(s, byId, network);
  const movement = motion(s.speed, s.targetSpeed, dt, availableAhead);
  let remaining = movement.distance;
  s.speed = movement.speed;
  s.stopReason = undefined;
  if (availableAhead <= 1e-10) {
    return { ...s, running: false, speed: 0, stopReason: "end" };
  }
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
    const next = continuation(s, byId, network);
    if (!next || !byId.has(next.pieceId)) {
      s.distance = s.direction === 1 ? length : 0;
      s.speed = 0;
      s.running = false;
      s.stopReason = "end";
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
