export type Track = {
  id: string;
  type: "straight" | "curve";
  x: number;
  y: number;
  rotation: 0 | 1 | 2 | 3;
};
export type Endpoint = {
  pieceId: string;
  end: 0 | 1;
  x: number;
  y: number;
  dx: number;
  dy: number;
};
export type Link = { pieceId: string; end: 0 | 1 };
export type Network = {
  links: Map<string, Link>;
  components: string[][];
  loops: string[][];
  openEnds: Endpoint[];
};
export type TrainKind = "steam" | "diesel" | "electric";
export type StartPosition = {
  pieceId: string;
  distance: number;
  direction: 1 | -1;
};
export type TrainState = StartPosition & {
  speed: number;
  targetSpeed: number;
  running: boolean;
  travelled: number;
  laps: number;
  lapLength: number;
};
export type SavedLayout = {
  version: 1;
  tracks: Track[];
  trainKind: TrainKind;
  start: StartPosition | null;
  muted: boolean;
};
export type Tool = "select" | "straight" | "curve" | "pan" | "train";
export type Camera = { scale: number; ox: number; oy: number };
