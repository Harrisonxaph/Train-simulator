import { it, expect } from "vitest";
import { initialRailway, canAddTrain } from "../lib/railway/startup";
import { decodeSave } from "../lib/railway/persistence";
import { sampleLayout } from "../lib/railway/sample";
it("starts without tracks or a train", () => {
  expect(initialRailway()).toEqual({ tracks: [], start: null });
});
it("requires track before choosing or placing an engine", () => {
  expect(canAddTrain([])).toBe(false);
  expect(canAddTrain(sampleLayout().slice(0, 1))).toBe(true);
});
it("keeps existing unmarked V1 sample saves", () => {
  const tracks = sampleLayout();
  const data = decodeSave(
    JSON.stringify({
      version: 1,
      tracks,
      trainKind: "steam",
      start: { pieceId: "sample-2", distance: 0.5, direction: 1 },
      muted: true,
    }),
  );
  expect(data.tracks).toEqual(tracks);
  expect(data.start).toMatchObject({ pieceId: "sample-2", distance: 0.5 });
  expect(data.muted).toBe(true);
});
