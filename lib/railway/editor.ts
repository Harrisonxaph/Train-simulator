import type { Track } from "./types";
import { BOARD_SIZE } from "./geometry";
export type History = { past: Track[][]; present: Track[]; future: Track[][] };
export function canPlace(
  tracks: Track[],
  candidate: Track,
  ignoreId?: string,
): boolean {
  return (
    Number.isInteger(candidate.x) &&
    Number.isInteger(candidate.y) &&
    candidate.x >= 0 &&
    candidate.y >= 0 &&
    candidate.x < BOARD_SIZE &&
    candidate.y < BOARD_SIZE &&
    !tracks.some(
      (t) => t.id !== ignoreId && t.x === candidate.x && t.y === candidate.y,
    )
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
