import { it, expect } from "vitest";
import { compatible, buildNetwork } from "../lib/railway/network";
import { endpoints } from "../lib/railway/geometry";
import { sampleLayout } from "../lib/railway/sample";
import type { Track } from "../lib/railway/types";
const a: Track = { id: "a", type: "straight", x: 1, y: 1, rotation: 0 };
it("connects equal positions with opposing tangents", () => {
  const b = { ...a, id: "b", x: 2 };
  expect(compatible(endpoints(a)[1], endpoints(b)[0])).toBe(true);
});
it("rejects same-facing and separated endpoints", () => {
  const ep = endpoints(a)[1];
  expect(compatible(ep, { ...ep, pieceId: "b" })).toBe(false);
  expect(compatible(ep, { ...ep, pieceId: "b", x: 9, dx: -1 })).toBe(false);
});
it("recognises a closed sample oval", () => {
  const n = buildNetwork(sampleLayout());
  expect(n.components).toHaveLength(1);
  expect(n.loops).toHaveLength(1);
  expect(n.openEnds).toHaveLength(0);
});
it("detects two open ends when a loop piece is removed", () => {
  const tracks = sampleLayout().slice(1);
  expect(buildNetwork(tracks).openEnds).toHaveLength(2);
  expect(buildNetwork(tracks).loops).toHaveLength(0);
});
it("keeps disconnected pieces in separate components", () => {
  const n = buildNetwork([a, { ...a, id: "b", x: 5 }]);
  expect(n.components).toHaveLength(2);
  expect(n.openEnds).toHaveLength(4);
});
it("connects only through explicit endpoints", () => {
  const n = buildNetwork([a, { ...a, id: "b", x: 2, rotation: 1 }]);
  expect(n.components).toHaveLength(2);
});
