import { it, expect } from "vitest";
import {
  endpoints,
  paths,
  activePaths,
  pathLength,
  samplePath,
} from "../lib/railway/geometry";
import { footprint, trackAtCell } from "../lib/railway/footprints";
import {
  canPlace,
  initialHistory,
  commit,
  undo,
  redo,
} from "../lib/railway/editor";
import type { Track, PathId } from "../lib/railway/types";
const t = (type: Track["type"], rotation: Track["rotation"] = 0): Track => ({
  id: "x",
  type,
  x: 5,
  y: 5,
  rotation,
  ...(type.startsWith("switch") ? { switchState: "straight" as const } : {}),
});
it("gives a crossing four physical ports and two independent paths", () => {
  expect(endpoints(t("crossing"))).toHaveLength(4);
  expect(paths(t("crossing")).map((p) => p.ports)).toEqual([
    [0, 1],
    [2, 3],
  ]);
});
it.each([0, 1, 2, 3] as const)(
  "preserves crossing path endpoints/tangents at rotation %i",
  (rotation) => {
    const c = t("crossing", rotation),
      ports = endpoints(c);
    for (const p of paths(c)) {
      expect(pathLength(c, p.id)).toBe(1);
      for (const side of [0, 1] as const) {
        const pose = samplePath(c, side, p.id),
          ep = ports.find((e) => e.end === p.ports[side])!;
        expect(pose.x).toBeCloseTo(ep.x);
        expect(pose.y).toBeCloseTo(ep.y);
        expect(Math.cos(pose.heading) * (side ? 1 : -1)).toBeCloseTo(ep.dx);
        expect(Math.sin(pose.heading) * (side ? 1 : -1)).toBeCloseTo(ep.dy);
      }
    }
  },
);
it.each(["switch-left", "switch-right"] as const)(
  "%s has two-cell aligned geometry",
  (type) => {
    const s = t(type);
    expect(endpoints(s)).toHaveLength(3);
    expect(pathLength(s, "main")).toBe(2);
    expect(pathLength(s, "branch")).toBeCloseTo(1 + Math.PI / 4);
    expect(samplePath(s, 1, "branch")).toMatchObject({
      x: 6,
      y: 5.5,
      heading: 0,
    });
    expect(samplePath(s, pathLength(s, "branch"), "branch").y).toBeCloseTo(
      type === "switch-left" ? 5 : 6,
    );
    expect(activePaths(s).map((p) => p.id)).toEqual(["main"]);
    expect(
      activePaths({ ...s, switchState: "branch" }).map((p) => p.id),
    ).toEqual(["branch"]);
  },
);
it.each(["switch-left", "switch-right"] as const)(
  "%s shares continuous tangent approach",
  (type) => {
    const s = t(type),
      before = samplePath(s, 1 - 1e-7, "branch"),
      after = samplePath(s, 1 + 1e-7, "branch");
    expect(Math.hypot(before.x - after.x, before.y - after.y)).toBeLessThan(
      3e-7,
    );
    expect(Math.abs(before.heading - after.heading)).toBeLessThan(3e-7);
  },
);
it.each([0, 1, 2, 3] as const)(
  "rotates both switch paths and footprint correctly at %i",
  (rotation) => {
    for (const type of ["switch-left", "switch-right"] as const) {
      const s = t(type, rotation),
        eps = endpoints(s);
      expect(footprint(s)).toHaveLength(2);
      for (const p of paths(s)) {
        for (const side of [0, 1] as const) {
          const pose = samplePath(s, side ? pathLength(s, p.id) : 0, p.id),
            ep = eps.find((e) => e.end === p.ports[side])!;
          expect(pose.x).toBeCloseTo(ep.x);
          expect(pose.y).toBeCloseTo(ep.y);
          expect(Math.cos(pose.heading) * (side ? 1 : -1)).toBeCloseTo(ep.dx);
          expect(Math.sin(pose.heading) * (side ? 1 : -1)).toBeCloseTo(ep.dy);
        }
      }
    }
  },
);
it("checks every occupied cell and hits a switch by its second cell", () => {
  const s = t("switch-right");
  expect(footprint(s)).toEqual([
    { x: 5, y: 5 },
    { x: 6, y: 5 },
  ]);
  expect(trackAtCell([s], 6, 5)).toEqual(s);
  expect(canPlace([s], { ...t("straight"), id: "other", x: 6 })).toBe(false);
  expect(canPlace([{ ...t("straight"), id: "other", x: 6 }], s)).toBe(false);
  expect(canPlace([s], s, s.id)).toBe(true);
});
it.each([
  [0, 19, 5],
  [1, 5, 19],
  [2, 0, 5],
  [3, 5, 0],
] as const)(
  "rejects off-board second cell at rotation %i",
  (rotation, x, y) => {
    expect(canPlace([], { ...t("switch-left", rotation), x, y })).toBe(false);
  },
);
it("keeps switch alignment in history and movement", () => {
  const s = { ...t("switch-left"), switchState: "branch" as const };
  const h = commit(initialHistory([s]), [{ ...s, x: 7 }]);
  expect(undo(h).present[0]).toEqual(s);
  expect(redo(undo(h)).present[0]).toMatchObject({
    x: 7,
    switchState: "branch",
  });
});
