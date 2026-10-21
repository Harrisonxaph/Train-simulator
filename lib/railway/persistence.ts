import type { SavedLayout, Track, StartPosition } from "./types";
import { canPlace } from "./editor";
import { pathLength } from "./geometry";
export const SAVE_KEY = "little-railways-v1";
function invalid(): never {
  throw new Error(
    "This saved railway could not be read. Your current board is safe.",
  );
}
function object(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
export function decodeSave(raw: string): SavedLayout {
  let s: unknown;
  try {
    s = JSON.parse(raw);
  } catch {
    return invalid();
  }
  if (
    !object(s) ||
    s.version !== 1 ||
    !Array.isArray(s.tracks) ||
    s.tracks.length > 400 ||
    !["steam", "diesel", "electric"].includes(s.trainKind as string) ||
    typeof s.muted !== "boolean"
  )
    return invalid();
  const tracks: Track[] = [],
    ids = new Set<string>();
  for (const v of s.tracks) {
    if (
      !object(v) ||
      typeof v.id !== "string" ||
      v.id.length < 1 ||
      v.id.length > 100 ||
      ids.has(v.id) ||
      (v.type !== "straight" && v.type !== "curve") ||
      !Number.isInteger(v.rotation) ||
      Number(v.rotation) < 0 ||
      Number(v.rotation) > 3 ||
      typeof v.x !== "number" ||
      typeof v.y !== "number"
    )
      return invalid();
    const t: Track = {
      id: v.id,
      type: v.type,
      x: v.x,
      y: v.y,
      rotation: v.rotation as Track["rotation"],
    };
    if (!canPlace(tracks, t)) return invalid();
    tracks.push(t);
    ids.add(t.id);
  }
  let start: StartPosition | null = null;
  if (s.start !== null) {
    const v = s.start;
    if (
      !object(v) ||
      typeof v.pieceId !== "string" ||
      typeof v.distance !== "number" ||
      !Number.isFinite(v.distance) ||
      (v.direction !== 1 && v.direction !== -1)
    )
      return invalid();
    const t = tracks.find((t) => t.id === v.pieceId);
    if (!t || v.distance < 0 || v.distance > pathLength(t)) return invalid();
    start = {
      pieceId: v.pieceId,
      distance: v.distance,
      direction: v.direction,
    };
  }
  return {
    version: 1,
    tracks,
    trainKind: s.trainKind as SavedLayout["trainKind"],
    start,
    muted: s.muted,
  };
}
export function encodeSave(s: SavedLayout): string {
  const raw = JSON.stringify(s);
  decodeSave(raw);
  return raw;
}
