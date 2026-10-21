import { it, expect } from "vitest";
import { switchOccupied, changeSwitchRoute } from "../lib/railway/switches";
import {
  createTrain,
  trainPose,
  advanceTrain,
} from "../lib/railway/simulation";
import { buildNetwork } from "../lib/railway/network";
import type { Track } from "../lib/railway/types";
const sw: Track = {
  id: "sw",
  type: "switch-right",
  x: 5,
  y: 5,
  rotation: 0,
  switchState: "straight",
};
const track = (id: string, x: number, y = 5): Track => ({
  id,
  type: "straight",
  x,
  y,
  rotation: 0,
});
it("blocks a train centred on the switch, even paused", () => {
  expect(
    switchOccupied(
      sw,
      createTrain({ pieceId: "sw", distance: 1, direction: 1 }),
      [sw],
    ),
  ).toBe(true);
});
it.each([
  ["nose", 4, 0.9],
  ["tail", 7, 0.1],
] as const)(
  "blocks %s overhang from a neighbouring segment",
  (_, x, distance) => {
    const t = track("near", x);
    expect(
      switchOccupied(
        sw,
        createTrain({ pieceId: t.id, distance, direction: 1 }),
        [sw, t],
      ),
    ).toBe(true);
  },
);
it.each([0, 1, 2, 3] as const)(
  "checks rotated footprint occupancy %i",
  (rotation) => {
    const t = { ...sw, rotation };
    expect(
      switchOccupied(
        t,
        createTrain({ pieceId: "sw", distance: 0.5, direction: 1 }),
        [t],
      ),
    ).toBe(true);
  },
);
it("permits a safely distant train and preserves its pose/speed", () => {
  const t = track("away", 2),
    tracks = [sw, t],
    train = {
      ...createTrain({ pieceId: t.id, distance: 0.5, direction: 1 }),
      running: true,
      speed: 2,
      targetSpeed: 2,
    };
  const result = changeSwitchRoute(tracks, "sw", "branch", train, null);
  expect(result.blocked).toBe(false);
  expect(result.tracks[0].switchState).toBe("branch");
  expect(trainPose(result.train!, result.tracks)).toEqual(
    trainPose(train, tracks),
  );
  expect(result.train).toMatchObject({
    speed: 2,
    running: true,
    pieceId: "away",
    distance: 0.5,
  });
  expect(tracks[0].switchState).toBe("straight");
});
it("does not mutate blocked switch state or train state", () => {
  const train = createTrain({ pieceId: "sw", distance: 1, direction: 1 }),
    tracks = [sw];
  const r = changeSwitchRoute(tracks, "sw", "branch", train, null);
  expect(r.blocked).toBe(true);
  expect(r.tracks).toBe(tracks);
  expect(r.train).toBe(train);
});
it("rebinds a reset position on the now-inactive path without teleporting a distant train", () => {
  const away = track("away", 2),
    train = createTrain({ pieceId: "away", distance: 0.5, direction: 1 }),
    result = changeSwitchRoute([sw, away], "sw", "branch", train, {
      pieceId: "sw",
      pathId: "main",
      distance: 1,
      direction: 1,
    });
  expect(result.start).toMatchObject({
    pathId: "branch",
    distance: (1 + Math.PI / 4) / 2,
  });
  expect(result.train!.pieceId).toBe("away");
});
