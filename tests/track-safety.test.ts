import { it, expect } from "vitest";
import {
  advanceTrain,
  createTrain,
  trainPose,
  reconcileTrain,
} from "../lib/railway/simulation";
import { buildNetwork } from "../lib/railway/network";
import type { Track, TrainState } from "../lib/railway/types";
const straight = (
  id: string,
  x: number,
  y = 5,
  rotation: Track["rotation"] = 0,
): Track => ({ id, type: "straight", x, y, rotation });
const line = Array.from({ length: 6 }, (_, i) => straight(String(i), i));
function run(tracks: Track[], s: TrainState, dt = 0.02) {
  const n = buildNetwork(tracks);
  for (let i = 0; i < 3000 && s.running; i++)
    s = advanceTrain(s, tracks, n, dt);
  return s;
}
const engine = (speed = 2): TrainState => ({
  ...createTrain({ pieceId: "0", distance: 0.2, direction: 1 }),
  targetSpeed: speed,
  running: true,
});
it.each([1, 2, 4])(
  "brakes progressively and stops at an open end at speed %s",
  (speed) => {
    let s = engine(speed);
    const n = buildNetwork(line);
    let slowed = false;
    for (let i = 0; i < 3000 && s.running; i++) {
      const before = s;
      s = advanceTrain(s, line, n, 0.02);
      if (s.running && s.speed < before.speed - 1e-6) slowed = true;
      expect(trainPose(s, line)!.x).toBeLessThanOrEqual(6);
    }
    expect(slowed).toBe(true);
    expect(s).toMatchObject({
      pieceId: "5",
      distance: 1,
      running: false,
      speed: 0,
      stopReason: "end",
    });
  },
);
it("clamps an emergency stop when braking distance is insufficient", () => {
  const s = advanceTrain(
    { ...engine(4), distance: 0.99, speed: 4 },
    [line[0]],
    buildNetwork([line[0]]),
    0.1,
  );
  expect(s).toMatchObject({ distance: 1, speed: 0, running: false });
});
it("rejects a stale connection to a rotated or moved next piece", () => {
  const old = [line[0], line[1]],
    n = buildNetwork(old);
  for (const bad of [
    { ...line[1], rotation: 1 as const },
    { ...line[1], x: 3 },
  ]) {
    const tracks = [line[0], bad];
    const s = advanceTrain(
      { ...engine(), distance: 0.9, speed: 2 },
      tracks,
      n,
      1,
    );
    expect(s).toMatchObject({ pieceId: "0", distance: 1, running: false });
  }
});
it("never enters a removed upcoming section even with a stale graph", () => {
  const s = advanceTrain({...engine(), distance: .9, speed: 2}, [line[0]], buildNetwork(line), 2);
  expect(s.pieceId).toBe("0");
  expect(s.distance).toBe(1);
});
it("stops after curves without jumping across a gap", () => {
  const curve: Track = { id: "curve", type: "curve", x: 1, y: 5, rotation: 0 };
  const tracks = [line[0], curve, straight("unrelated", 10)];
  const s = run(tracks, engine());
  expect(s.pieceId).toBe("curve");
  expect(trainPose(s, tracks)).toMatchObject({ x: 1.5, y: 6 });
  expect(s.running).toBe(false);
});
it("keeps the stopped pose when extending the route and resumes forward", () => {
  const old = [line[0]],
    stopped = run(old, engine());
  const kept = reconcileTrain(stopped, old, line)!;
  expect(trainPose(kept, line)).toEqual(trainPose(stopped, old));
  const resumed = run(line, { ...kept, running: true });
  expect(resumed).toMatchObject({ pieceId: "5", distance: 1, running: false });
});
it("clears the train when its occupied piece is deleted or rotated", () => {
  const s = engine();
  expect(reconcileTrain(s, line, line.slice(1))).toBeNull();
  expect(
    reconcileTrain(s, line, [{ ...line[0], rotation: 1 }, ...line.slice(1)]),
  ).toBeNull();
});
it("pauses without relocating if future track is removed", () => {
  const s = { ...engine(), pieceId: "2", distance: 0.4, speed: 2 };
  const kept = reconcileTrain(s, line, line.slice(0, 4))!;
  expect(kept).toMatchObject({
    pieceId: "2",
    distance: 0.4,
    running: false,
    speed: 0,
  });
  const end = run(line.slice(0, 4), { ...kept, running: true });
  expect(end).toMatchObject({ pieceId: "3", distance: 1 });
});
it("repeated Play cannot push past an endpoint and reverse returns along the same route", () => {
  let s = run(line, engine());
  for (let i = 0; i < 5; i++)
    s = advanceTrain({ ...s, running: true }, line, buildNetwork(line), 1);
  expect(s).toMatchObject({ pieceId: "5", distance: 1 });
  s = run(line, { ...s, running: true, direction: -1 });
  expect(s).toMatchObject({ pieceId: "0", distance: 0, running: false });
});
it("unrelated open pieces do not interrupt a closed loop", async () => {
  const { sampleLayout } = await import("../lib/railway/sample");
  const loop = sampleLayout(),
    tracks = [...loop, straight("lonely", 0, 0)];
  let s = {
    ...createTrain({ pieceId: loop[0].id, distance: 0.2, direction: 1 }),
    running: true,
  };
  const n = buildNetwork(tracks);
  for (let i = 0; i < 5000; i++) s = advanceTrain(s, tracks, n, 0.02);
  expect(s.running).toBe(true);
});
it.each([0.02, 0.1, 0.5])(
  "reaches the same endpoint with frame step %s",
  (dt) => {
    expect(run(line, engine(4), dt)).toMatchObject({
      pieceId: "5",
      distance: 1,
      running: false,
      speed: 0,
    });
  },
);
it("chosen incomplete switch branch stops without choosing the complete straight route", () => {
  const sw: Track = {
    id: "s",
    type: "switch-left",
    x: 1,
    y: 5,
    rotation: 0,
    switchState: "branch",
  };
  const tracks = [line[0], sw, straight("other", 3)];
  const s = run(tracks, engine());
  expect(s.pieceId).toBe("s");
  expect(s.pathId).toBe("branch");
  expect(trainPose(s, tracks)).toMatchObject({ x: 2.5, y: 5 });
});
it("crossing with a missing exit stops straight rather than turning", () => {
  const cross: Track = { id: "x", type: "crossing", x: 1, y: 5, rotation: 0 };
  const tracks = [line[0], cross, straight("south", 1, 6, 1)];
  const s = run(tracks, engine());
  expect(s).toMatchObject({
    pieceId: "x",
    pathId: "main",
    distance: 1,
    running: false,
  });
  expect(trainPose(s, tracks)).toMatchObject({ x: 2, y: 5.5, heading: 0 });
});
