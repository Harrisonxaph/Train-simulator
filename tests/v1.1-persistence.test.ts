import { it, expect } from "vitest";
import { decodeSave, encodeSave } from "../lib/railway/persistence";
import { loadStartup } from "../lib/railway/startup";
import { sampleLayout } from "../lib/railway/sample";
import type { SavedLayout } from "../lib/railway/types";
const saved = (): SavedLayout => ({
  version: 2,
  source: "user",
  tracks: [
    {
      id: "sw",
      type: "switch-left",
      x: 5,
      y: 5,
      rotation: 0,
      switchState: "branch",
    },
    { id: "c", type: "crossing", x: 8, y: 5, rotation: 0 },
  ],
  trainKind: "electric",
  start: { pieceId: "c", pathId: "cross", distance: 0.5, direction: -1 },
  muted: true,
});
it("migrates V1 data without losing layouts or preferences", () => {
  const tracks = sampleLayout();
  const s = decodeSave(
    JSON.stringify({
      version: 1,
      tracks,
      trainKind: "diesel",
      start: { pieceId: "sample-2", distance: 0.5, direction: -1 },
      muted: true,
    }),
  );
  expect(s).toMatchObject({
    version: 2,
    source: "user",
    tracks,
    trainKind: "diesel",
    start: { pathId: "main", distance: 0.5, direction: -1 },
    muted: true,
  });
});
it("round trips paths and switch state in V2", () => {
  expect(decodeSave(encodeSave(saved()))).toEqual(saved());
});
it.each(["alignment", "path", "footprint", "distance", "inactive", "source"])(
  "rejects invalid V2 %s",
  (reason) => {
    const s = saved();
    if (reason === "alignment") s.tracks[0].switchState = "bad" as "straight";
    if (reason === "path") s.start!.pathId = "branch";
    if (reason === "footprint") s.tracks[1].x = 6;
    if (reason === "distance") s.start!.distance = 4;
    if (reason === "inactive")
      s.start = { pieceId: "sw", pathId: "main", distance: 0.5, direction: 1 };
    if (reason === "source") s.source = "bad" as "user";
    expect(() => decodeSave(JSON.stringify(s))).toThrow();
  },
);
it("preserves unmarked old demo-shaped saves as user progress", () => {
  const tracks = sampleLayout(),
    raw = JSON.stringify({
      version: 1,
      tracks,
      trainKind: "steam",
      start: null,
      muted: false,
    }),
    result = loadStartup(raw);
  expect(result.layout.tracks).toEqual(tracks);
  expect(result.protectRecord).toBe(false);
});
it("recognises explicit automatic-demo provenance without overwriting the record", () => {
  const s = saved();
  s.source = "auto-demo";
  const raw = JSON.stringify(s),
    r = loadStartup(raw);
  expect(r.layout.tracks).toEqual([]);
  expect(r.layout.start).toBe(null);
  expect(r.protectRecord).toBe(true);
  expect(JSON.parse(raw).tracks).toHaveLength(2);
});
