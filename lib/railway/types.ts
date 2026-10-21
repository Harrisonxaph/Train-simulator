export type TrackType =
  "straight" | "curve" | "crossing" | "switch-left" | "switch-right";
export type PathId = "main" | "cross" | "branch";
export type PortId = 0 | 1 | 2 | 3;
export type SwitchState = "straight" | "branch";
export type TraversalPath = { id: PathId; ports: readonly [PortId, PortId] };
export type Pose = { x: number; y: number; heading: number };
export type Track = {
  id: string;
  type: TrackType;
  switchState?: SwitchState;
  x: number;
  y: number;
  rotation: 0 | 1 | 2 | 3;
};
export type Endpoint = {
  pieceId: string;
  end: PortId;
  x: number;
  y: number;
  dx: number;
  dy: number;
};
export type Link = { pieceId: string; end: PortId };
export type Route = {
  pieceId: string;
  pathId: PathId;
  length: number;
  ports: readonly [PortId, PortId];
};
export type RouteLink = { pieceId: string; pathId: PathId; end: 0 | 1 };
export type Network = {
  routes: Map<string, Route>;
  routeLinks: Map<string, RouteLink>;
  links: Map<string, Link>;
  components: string[][];
  loops: string[][];
  openEnds: Endpoint[];
};
export type TrainKind = "steam" | "diesel" | "electric";
export type StartPosition = {
  pathId?: PathId;
  pieceId: string;
  distance: number;
  direction: 1 | -1;
};
export type TrainState = StartPosition & {
  stopReason?: "end" | "invalid";
  speed: number;
  targetSpeed: number;
  running: boolean;
  travelled: number;
  laps: number;
  lapLength: number;
};
export type SavedLayout = {
  version: 2;
  source: "user" | "auto-demo";
  tracks: Track[];
  trainKind: TrainKind;
  start: StartPosition | null;
  muted: boolean;
};
export type Tool = "select" | TrackType | "pan" | "train";
export type Camera = { scale: number; ox: number; oy: number };
