import { it, expect } from "vitest";
import {
  advanceTrain,
  trainPose,
  createTrain,
} from "../lib/railway/simulation";
import { buildNetwork } from "../lib/railway/network";
import { sampleLayout } from "../lib/railway/sample";
import { pathLength } from "../lib/railway/geometry";
import type { Track, TrainState } from "../lib/railway/types";
const a: Track = { id: "a", type: "straight", x: 0, y: 0, rotation: 0 };
const train = (distance = 0, direction: 1 | -1 = 1): TrainState => ({
  ...createTrain({ pieceId: "a", distance, direction }),
  speed: 1,
  targetSpeed: 1,
  running: true,
});
it("moves along a straight using delta time", () => {
  const s = advanceTrain(train(), [a], buildNetwork([a]), 0.25);
  expect(s.distance).toBeCloseTo(0.25);
  expect(trainPose(s, [a])).toMatchObject({ x: 0.25, y: 0.5, heading: 0 });
});
it("moves along a circular curve", () => {
  const c = { ...a, type: "curve" as const };
  const s = advanceTrain(train(), [c], buildNetwork([c]), Math.PI / 8);
  const p = trainPose(s, [c])!;
  expect(p.x).toBeCloseTo(Math.SQRT1_2 / 2);
  expect(p.heading).toBeCloseTo(Math.PI / 4);
});
it("transitions to the connected piece with overshoot", () => {
  const b = { ...a, id: "b", x: 1 };
  const s = advanceTrain(train(0.9), [a, b], buildNetwork([a, b]), 0.3);
  expect(s.pieceId).toBe("b");
  expect(s.distance).toBeCloseTo(0.2);
  expect(s.direction).toBe(1);
});
it("enters the correct end of a rotated connected piece", () => {
  const b = { ...a, id: "b", x: 1, rotation: 2 as const };
  const s = advanceTrain(train(0.9), [a, b], buildNetwork([a, b]), 0.3);
  expect(s.pieceId).toBe("b");
  expect(s.distance).toBeCloseTo(0.8);
  expect(s.direction).toBe(-1);
});
it("reverses across a connection", () => {
  const b = { ...a, id: "b", x: 1 };
  const s = advanceTrain(
    { ...train(0.1, -1), pieceId: "b" },
    [a, b],
    buildNetwork([a, b]),
    0.3,
  );
  expect(s.pieceId).toBe("a");
  expect(s.distance).toBeCloseTo(0.8);
});
it.each([1, -1] as const)(
  "stops safely at an open end in direction %s",
  (direction) => {
    const s = advanceTrain(train(0.5, direction), [a], buildNetwork([a]), 2);
    expect(s.distance).toBe(direction === 1 ? 1 : 0);
    expect(s.running).toBe(false);
    expect(s.speed).toBe(0);
  },
);
it("does not jump to a disconnected track", () => {
  const b = { ...a, id: "b", x: 2 };
  const s = advanceTrain(train(0.9), [a, b], buildNetwork([a, b]), 2);
  expect(s.pieceId).toBe("a");
});
it("preserves distance across multiple segments", () => {
  const tracks = [a, { ...a, id: "b", x: 1 }, { ...a, id: "c", x: 2 }];
  const s = advanceTrain(train(0.2), tracks, buildNetwork(tracks), 2.3);
  expect(s.pieceId).toBe("c");
  expect(s.distance).toBeCloseTo(0.5);
});
it("circulates on the sample for repeated laps", () => {
  const tracks = sampleLayout(),
    n = buildNetwork(tracks),
    length = tracks.reduce((s, t) => s + pathLength(t), 0);
  let s = {
    ...createTrain(
      { pieceId: tracks[0].id, distance: 0, direction: 1 },
      length,
    ),
    running: true,
    speed: 1,
    targetSpeed: 1,
  };
  for (let i = 0; i < 10000; i++) s = advanceTrain(s, tracks, n, 0.02);
  expect(s.running).toBe(true);
  expect(s.laps).toBeGreaterThanOrEqual(6);
  const p = trainPose(s, tracks)!;
  expect(Number.isFinite(p.x)).toBe(true);
});
it("keeps a paused train still", () => {
  const s = { ...train(0.3), running: false };
  expect(advanceTrain(s, [a], buildNetwork([a]), 1)).toEqual(s);
});
it("stops a train whose track was removed", () => {
  const s = advanceTrain(train(), [], buildNetwork([]), 1);
  expect(s.running).toBe(false);
  expect(trainPose(s, [])).toBe(null);
});
it("ignores invalid time", () => {
  const s = train(0.3);
  for (const dt of [-1, NaN, Infinity])
    expect(advanceTrain(s, [a], buildNetwork([a]), dt)).toEqual(s);
});
it("integrates acceleration consistently across different frame rates", () => {
  const tracks = sampleLayout(),
    n = buildNetwork(tracks);
  const run = (dt: number) => {
    let s = {
      ...createTrain({ pieceId: tracks[1].id, distance: 0, direction: 1 }),
      running: true,
    };
    for (let t = 0; t < 3 - 1e-8; t += dt) s = advanceTrain(s, tracks, n, dt);
    return s;
  };
  const coarse = run(0.1),
    fine = run(0.02);
  expect(coarse.travelled).toBeCloseTo(fine.travelled, 8);
  expect(coarse.speed).toBe(fine.speed);
});
