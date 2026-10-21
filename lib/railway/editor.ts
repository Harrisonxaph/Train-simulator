import type { Track } from "./types";
import { BOARD_SIZE } from "./geometry";
import { footprint } from "./footprints";
export type History = { past: Track[][]; present: Track[]; future: Track[][] };
export function canPlace(
  tracks: Track[],
  candidate: Track,
  ignoreId?: string,
): boolean {
  if (
    !Number.isInteger(candidate.x) ||
    !Number.isInteger(candidate.y) ||
    !Number.isInteger(candidate.rotation) ||
    candidate.rotation < 0 ||
    candidate.rotation > 3
  )
    return false;
  const occupied = new Set(
    tracks
      .filter((t) => t.id !== ignoreId)
      .flatMap(footprint)
      .map((c) => `${c.x},${c.y}`),
  );
  return footprint(candidate).every(
    (c) =>
      c.x >= 0 &&
      c.y >= 0 &&
      c.x < BOARD_SIZE &&
      c.y < BOARD_SIZE &&
      !occupied.has(`${c.x},${c.y}`),
  );
}
export function initialHistory(tracks: Track[]): History {
  return { past: [], present: tracks, future: [] };
}
export function commit(h: History, tracks: Track[]): History {
  return {
    past: [...h.past, h.present].slice(-50),
    present: tracks,
    future: [],
  };
}
export function undo(h: History): History {
  return h.past.length
    ? {
        past: h.past.slice(0, -1),
        present: h.past[h.past.length - 1],
        future: [h.present, ...h.future],
      }
    : h;
}
export function redo(h: History): History {
  return h.future.length
    ? {
        past: [...h.past, h.present].slice(-50),
        present: h.future[0],
        future: h.future.slice(1),
      }
    : h;
}
