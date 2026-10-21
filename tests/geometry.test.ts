import { describe, it, expect } from "vitest";
import { endpoints, pathLength, samplePath } from "../lib/railway/geometry";
import type { Track } from "../lib/railway/types";
const track = (
  type: Track["type"] = "straight",
  rotation: Track["rotation"] = 0,
): Track => ({ id: "a", type, x: 2, y: 3, rotation });
describe("track geometry", () => {
  it("gives explicit opposite endpoints for a straight", () => {
    const [a, b] = endpoints(track());
    expect(a).toMatchObject({
      x: 2,
      y: 3.5,
      dx: -1,
      dy: 0,
      pieceId: "a",
      end: 0,
    });
    expect(b).toMatchObject({ x: 3, y: 3.5, dx: 1, dy: 0, end: 1 });
  });
  it("gives adjacent curve endpoints with tangents", () => {
    const [a, b] = endpoints(track("curve"));
    expect(a).toMatchObject({ x: 2, y: 3.5, dx: -1, dy: 0 });
    expect(b).toMatchObject({ x: 2.5, y: 4, dx: 0, dy: 1 });
    expect(pathLength(track("curve"))).toBeCloseTo(Math.PI / 4);
  });
  it.each([0, 1, 2, 3] as const)(
    "rotates geometry and keeps lengths for rotation %i",
    (r) => {
      const t = track("curve", r),
        [a, b] = endpoints(t);
      const start = samplePath(t, 0),
        end = samplePath(t, pathLength(t));
      expect(start.x).toBeCloseTo(a.x);
      expect(start.y).toBeCloseTo(a.y);
      expect(end.x).toBeCloseTo(b.x);
      expect(end.y).toBeCloseTo(b.y);
      expect(Math.cos(start.heading)).toBeCloseTo(-a.dx);
      expect(Math.sin(end.heading)).toBeCloseTo(b.dy);
      expect(pathLength(t)).toBeCloseTo(Math.PI / 4);
    },
  );
  it("turns horizontal into vertical", () => {
    const [a, b] = endpoints(track("straight", 1));
    expect(a.x).toBeCloseTo(2.5);
    expect(a.y).toBeCloseTo(3);
    expect(b.y).toBeCloseTo(4);
  });
  it("samples a true circular arc", () => {
    const p = samplePath(track("curve"), Math.PI / 8);
    expect(p.x).toBeCloseTo(2 + Math.SQRT1_2 / 2);
    expect(p.y).toBeCloseTo(4 - Math.SQRT1_2 / 2);
    expect(p.heading).toBeCloseTo(Math.PI / 4);
  });
});
