import type { Track } from "./types";
export function sampleLayout(): Track[] {
  const tracks: Track[] = [];
  const add = (
    type: Track["type"],
    x: number,
    y: number,
    rotation: Track["rotation"],
  ) => tracks.push({ id: `sample-${tracks.length}`, type, x, y, rotation });
  // Clockwise oval: top-left joins east/south, top-right west/south.
  add("curve", 5, 6, 3);
  for (let x = 6; x < 14; x++) add("straight", x, 6, 0);
  add("curve", 14, 6, 0);
  for (let y = 7; y < 13; y++) add("straight", 14, y, 1);
  add("curve", 14, 13, 1);
  for (let x = 13; x > 5; x--) add("straight", x, 13, 0);
  add("curve", 5, 13, 2);
  for (let y = 12; y > 6; y--) add("straight", 5, y, 1);
  return tracks;
}
