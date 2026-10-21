import { it, expect } from "vitest";
import { encodeSave, decodeSave } from "../lib/railway/persistence";
import { sampleLayout } from "../lib/railway/sample";
import type { SavedLayout } from "../lib/railway/types";
const saved = (): SavedLayout => ({
  version: 1,
  tracks: sampleLayout(),
  trainKind: "steam",
  start: { pieceId: "sample-0", distance: 0.4, direction: 1 },
  muted: false,
});
it("round trips a versioned layout", () => {
  expect(decodeSave(encodeSave(saved()))).toEqual(saved());
});
it("rejects corrupt JSON", () => {
  expect(() => decodeSave("{bad")).toThrow();
});
it.each([
  "version",
  "rotation",
  "duplicate",
  "overlap",
  "train",
  "length",
  "finite",
  "kind",
  "count",
])("rejects invalid %s", (reason) => {
  const s = saved();
  let value: unknown = s;
  if (reason === "version") value = { ...s, version: 9 };
  if (reason === "rotation") s.tracks[0].rotation = 5 as 0;
  if (reason === "duplicate") s.tracks[1].id = s.tracks[0].id;
  if (reason === "overlap") {
    s.tracks[1].x = s.tracks[0].x;
    s.tracks[1].y = s.tracks[0].y;
  }
  if (reason === "train") s.start!.pieceId = "missing";
  if (reason === "length") s.start!.distance = 5;
  if (reason === "finite")
    value = { ...s, start: { ...s.start, distance: "bad" } };
  if (reason === "kind") value = { ...s, trainKind: "unknown" };
  if (reason === "count") s.tracks = Array(401).fill(s.tracks[0]);
  expect(() => decodeSave(JSON.stringify(value))).toThrow();
});
