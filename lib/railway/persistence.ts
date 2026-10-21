import type {
  SavedLayout,
  Track,
  StartPosition,
  TrackType,
  PathId,
} from "./types";
import { canPlace } from "./editor";
import { isSwitch } from "./geometry";
import { revalidateStart } from "./simulation";
export const SAVE_KEY = "little-railways-v1"; // Retain the key so existing players' V1 layouts are discovered.
const trackTypes: TrackType[] = [
  "straight",
  "curve",
  "crossing",
  "switch-left",
  "switch-right",
];
function invalid(): never {
  throw Error(
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
    (s.version !== 1 && s.version !== 2) ||
    !Array.isArray(s.tracks) ||
    s.tracks.length > 400 ||
    !["steam", "diesel", "electric"].includes(s.trainKind as string) ||
    typeof s.muted !== "boolean"
  )
    return invalid();
  if (s.version === 2 && s.source !== "user" && s.source !== "auto-demo")
    return invalid();
  const tracks: Track[] = [],
    ids = new Set<string>();
  for (const v of s.tracks) {
    if (
      !object(v) ||
      typeof v.id !== "string" ||
      !v.id.length ||
      v.id.length > 100 ||
      ids.has(v.id) ||
      !trackTypes.includes(v.type as TrackType) ||
      (s.version === 1 && v.type !== "straight" && v.type !== "curve") ||
      !Number.isInteger(v.rotation) ||
      Number(v.rotation) < 0 ||
      Number(v.rotation) > 3 ||
      typeof v.x !== "number" ||
      typeof v.y !== "number"
    )
      return invalid();
    const t: Track = {
      id: v.id,
      type: v.type as TrackType,
      x: v.x,
      y: v.y,
      rotation: v.rotation as Track["rotation"],
    };
    if (isSwitch(t)) {
      if (v.switchState !== "straight" && v.switchState !== "branch")
        return invalid();
      t.switchState = v.switchState;
    }
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
    const pathId = s.version === 1 ? "main" : v.pathId;
    if (pathId !== "main" && pathId !== "cross" && pathId !== "branch")
      return invalid();
    start = revalidateStart(
      {
        pieceId: v.pieceId,
        pathId: pathId as PathId,
        distance: v.distance,
        direction: v.direction,
      },
      tracks,
    );
    if (!start) return invalid();
  }
  return {
    version: 2,
    source: s.source === "auto-demo" ? "auto-demo" : "user",
    tracks,
    trainKind: s.trainKind as SavedLayout["trainKind"],
    start,
    muted: s.muted,
  };
}
export function encodeSave(layout: SavedLayout): string {
  const raw = JSON.stringify(layout);
  decodeSave(raw);
  return raw;
}
