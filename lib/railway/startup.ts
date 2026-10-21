import type { Track } from "./types";
export const EMPTY_MESSAGE =
  "Let’s build your railway! Choose a track to get started.";
export const NO_TRACK_MESSAGE = "Build some track before adding your train!";
export function initialRailway(): { tracks: Track[]; start: null } {
  return { tracks: [], start: null };
}
export function canAddTrain(tracks: Track[]): boolean {
  return tracks.length > 0;
}
import type { SavedLayout } from "./types";
import { decodeSave } from "./persistence";
export function loadStartup(raw: string | null): {
  layout: SavedLayout;
  protectRecord: boolean;
} {
  const saved = raw
    ? decodeSave(raw)
    : {
        version: 2 as const,
        source: "user" as const,
        tracks: [],
        start: null,
        trainKind: "steam" as const,
        muted: false,
      };
  if (saved.source === "auto-demo")
    return {
      layout: { ...saved, source: "user", tracks: [], start: null },
      protectRecord: true,
    };
  return { layout: saved, protectRecord: false };
}
