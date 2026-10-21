import { it, expect } from "vitest";
import type { Track, TrainState } from "../lib/railway/types";
import { buildNetwork, loopLengthFor, routeKey } from "../lib/railway/network";
import {
  createTrain,
  advanceTrain,
  trainPose,
  revalidateStart,
} from "../lib/railway/simulation";
import { pathLength, samplePath } from "../lib/railway/geometry";
const cross: Track = {
  id: "crossing",
  type: "crossing",
  x: 5,
  y: 5,
  rotation: 0,
};
const arm = (
  id: string,
  x: number,
  y: number,
  rotation: Track["rotation"] = 0,
): Track => ({ id, type: "straight", x, y, rotation });
const arms = [
  arm("west", 4, 5),
  arm("east", 6, 5),
  arm("north", 5, 4, 1),
  arm("south", 5, 6, 1),
];
const running = (
  id: string,
  distance: number,
  direction: 1 | -1 = 1,
): TrainState => ({
  ...createTrain({ pieceId: id, distance, direction }),
  speed: 1,
  targetSpeed: 1,
  running: true,
});
it("keeps crossing routes in separate connected components", () => {
  const n = buildNetwork([cross, ...arms]);
  expect(n.components).toHaveLength(2);
  expect(n.openEnds).toHaveLength(4);
});
it.each([
  ["west", "east", 0.9, 1, "main"],
  ["east", "west", 0.1, -1, "main"],
  ["north", "south", 0.9, 1, "cross"],
  ["south", "north", 0.1, -1, "cross"],
] as const)(
  "%s entry crosses straight to %s",
  (from, to, d, direction, pathId) => {
    const tracks = [cross, ...arms],
      n = buildNetwork(tracks);
    const inside = advanceTrain(running(from, d, direction), tracks, n, 0.3);
    expect(inside.pieceId).toBe(cross.id);
    expect(inside.pathId).toBe(pathId);
    const start = trainPose(running(from, d, direction), tracks)!,
      p = trainPose(inside, tracks)!;
    expect(Math.cos(p.heading)).toBeCloseTo(Math.cos(start.heading));
    expect(Math.sin(p.heading)).toBeCloseTo(Math.sin(start.heading));
    const out = advanceTrain(inside, tracks, n, 1);
    expect(out.pieceId).toBe(to);
    expect(out.running).toBe(true);
  },
);
for (const type of ["switch-left", "switch-right"] as const) {
  const sw: Track = {
    id: "switch",
    type,
    x: 5,
    y: 5,
    rotation: 0,
    switchState: "straight",
  };
  const approach = arm("approach", 4, 5),
    straight = arm("straight", 7, 5),
    branch = arm("branch", 6, type === "switch-left" ? 4 : 6, 1);
  it.each(["straight", "branch"] as const)(
    `${type} routes common entry to %s`,
    (alignment) => {
      const tracks = [
          { ...sw, switchState: alignment },
          approach,
          straight,
          branch,
        ],
        n = buildNetwork(tracks);
      let s = advanceTrain(running("approach", 0.9), tracks, n, 0.3);
      expect(s.pathId).toBe(alignment === "straight" ? "main" : "branch");
      expect(s.pieceId).toBe("switch");
      const pose = trainPose(s, tracks)!;
      expect(pose.x).toBeCloseTo(5.2);
      expect(pose.y).toBeCloseTo(5.5);
      s = advanceTrain(s, tracks, n, 2);
      expect(s.pieceId).toBe(alignment === "straight" ? "straight" : "branch");
    },
  );
  it.each(["straight", "branch"] as const)(
    `${type} aligned reverse route %s reaches common`,
    (alignment) => {
      const tracks = [
          { ...sw, switchState: alignment },
          approach,
          straight,
          branch,
        ],
        n = buildNetwork(tracks);
      const from = alignment === "straight" ? "straight" : "branch";
      const direction = from === "branch" && type === "switch-left" ? 1 : -1;
      let s = advanceTrain(
        running(from, direction === 1 ? 0.9 : 0.1, direction),
        tracks,
        n,
        2.3,
      );
      expect(s.pieceId).toBe("approach");
      expect(s.direction).toBe(-1);
    },
  );
  it(`${type} stops before an inactive branch`, () => {
    const tracks = [sw, approach, straight, branch],
      direction = type === "switch-left" ? 1 : -1;
    const s = advanceTrain(
      running("branch", direction === 1 ? 0.9 : 0.1, direction),
      tracks,
      buildNetwork(tracks),
      1,
    );
    expect(s.pieceId).toBe("branch");
    expect(s.running).toBe(false);
  });
  it(`${type} reads a changed alignment at entry`, () => {
    const tracks = [
      { ...sw, switchState: "branch" as const },
      approach,
      straight,
      branch,
    ];
    const s = advanceTrain(
      running("approach", 0.9),
      tracks,
      buildNetwork(tracks),
      0.3,
    );
    expect(s.pathId).toBe("branch");
  });
}
it("clears invalid or inactive train reset paths", () => {
  const sw: Track = {
    id: "sw",
    type: "switch-left",
    x: 5,
    y: 5,
    rotation: 0,
    switchState: "straight",
  };
  expect(
    revalidateStart(
      { pieceId: "sw", pathId: "branch", distance: 0.5, direction: 1 },
      [sw],
    ),
  ).toBe(null);
  expect(
    revalidateStart(
      { pieceId: "sw", pathId: "main", distance: 2.1, direction: 1 },
      [sw],
    ),
  ).toBe(null);
  expect(
    revalidateStart(
      { pieceId: "sw", pathId: "main", distance: 0.5, direction: 1 },
      [sw],
    ),
  ).not.toBe(null);
});
it("detects two independent closed circuits sharing crossings", () => {
  const byCell = new Map<string, Track>();
  let nextId = 0;
  const add = (
    type: Track["type"],
    x: number,
    y: number,
    rotation: Track["rotation"],
  ) => {
    const key = `${x},${y}`,
      old = byCell.get(key);
    byCell.set(
      key,
      old
        ? { ...old, type: "crossing", rotation: 0 }
        : { id: `loop-${nextId++}`, type, x, y, rotation },
    );
  };
  const oval = (x: number, y: number) => {
    add("curve", x, y, 3);
    add("curve", x + 6, y, 0);
    add("curve", x + 6, y + 6, 1);
    add("curve", x, y + 6, 2);
    for (let k = 1; k < 6; k++) {
      add("straight", x + k, y, 0);
      add("straight", x + k, y + 6, 0);
      add("straight", x, y + k, 1);
      add("straight", x + 6, y + k, 1);
    }
  };
  oval(4, 5);
  oval(7, 3);
  const tracks = [...byCell.values()],
    n = buildNetwork(tracks),
    c = tracks.find((t) => t.x === 7 && t.y === 5)!;
  expect(n.loops).toHaveLength(2);
  expect(n.components).toHaveLength(2);
  expect(n.openEnds).toHaveLength(0);
  expect(n.loops.find((l) => l.includes(routeKey(c.id, "main")))).not.toEqual(
    n.loops.find((l) => l.includes(routeKey(c.id, "cross"))),
  );
  expect(loopLengthFor(n, c.id, "main")).toBeCloseTo(20 + Math.PI);
  expect(loopLengthFor(n, c.id, "cross")).toBeCloseTo(20 + Math.PI);
  for (const pathId of ["main", "cross"] as const) {
    let state: TrainState = { ...running(c.id, 0.4), pathId };
    for (let i = 0; i < 5000; i++) state = advanceTrain(state, tracks, n, 0.02);
    expect(state.running).toBe(true);
  }
});
