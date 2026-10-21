import type {
  Camera,
  Track,
  TrainKind,
  TrainState,
  Network,
  PathId,
} from "./railway/types";
import {
  endpoints,
  pathLength,
  samplePath,
  paths,
  activePaths,
  isSwitch,
  rotatePoint,
} from "./railway/geometry";
import { trainPose } from "./railway/simulation";
import { endpointKey, compatible } from "./railway/network";
import { footprint, footprintBounds } from "./railway/footprints";
type C = CanvasRenderingContext2D;
function round(
  ctx: C,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}
function circle(ctx: C, x: number, y: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}
function path(ctx: C, t: Track, offset = 0, pathId: PathId = "main") {
  const length = pathLength(t, pathId),
    steps =
      t.type === "curve" ? 18 : isSwitch(t) && pathId === "branch" ? 36 : 1;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const p = samplePath(t, (length * i) / steps, pathId);
    const x = p.x - Math.sin(p.heading) * offset,
      y = p.y + Math.cos(p.heading) * offset;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}
function drawRailPath(
  ctx: C,
  t: Track,
  ghost = false,
  pathId: PathId = "main",
) {
  ctx.save();
  if (ghost) ctx.globalAlpha = 0.6;
  path(ctx, t, 0, pathId);
  ctx.lineCap = "butt";
  ctx.strokeStyle = "#60875755";
  ctx.lineWidth = 0.58;
  ctx.stroke();
  const length = pathLength(t, pathId),
    count = t.type === "curve" ? 6 : Math.ceil(length * 7);
  for (let i = 0; i < count; i++) {
    const p = samplePath(t, (length * (i + 0.5)) / count, pathId);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.heading);
    ctx.shadowColor = "#263d3530";
    ctx.shadowBlur = 0.06;
    ctx.shadowOffsetY = 0.045;
    round(ctx, -0.04, -0.26, 0.08, 0.52, 0.018, "#9c7950");
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#c5a777";
    ctx.fillRect(-0.03, -0.23, 0.018, 0.46);
    ctx.restore();
  }
  for (const offset of [-0.155, 0.155]) {
    path(ctx, t, offset, pathId);
    ctx.strokeStyle = "#435c59";
    ctx.lineWidth = 0.078;
    ctx.stroke();
    path(ctx, t, offset - 0.012, pathId);
    ctx.strokeStyle = "#e4e8da";
    ctx.lineWidth = 0.029;
    ctx.stroke();
  }
  ctx.restore();
}
export function drawTrack(ctx: C, t: Track, ghost = false) {
  if (t.type === "straight" || t.type === "curve") {
    drawRailPath(ctx, t, ghost);
    return;
  }
  const active = activePaths(t)[0].id;
  const ordered = paths(t).sort(
    (a, b) => Number(a.id === active) - Number(b.id === active),
  );
  for (const p of ordered) {
    ctx.save();
    if (isSwitch(t) && p.id !== active) ctx.globalAlpha *= 0.42;
    drawRailPath(ctx, t, ghost, p.id);
    ctx.restore();
  }
  if (isSwitch(t)) {
    const p = rotatePoint(0.72, 0.5, t.rotation);
    ctx.save();
    ctx.translate(t.x + p.x, t.y + p.y);
    ctx.rotate((t.rotation * Math.PI) / 2);
    ctx.strokeStyle = "#d2b874";
    ctx.lineWidth = 0.045;
    ctx.beginPath();
    ctx.moveTo(-0.13, 0);
    ctx.lineTo(
      0.12,
      t.switchState === "branch"
        ? t.type === "switch-left"
          ? -0.12
          : 0.12
        : 0,
    );
    ctx.stroke();
    circle(ctx, -0.13, 0, 0.045, "#486950");
    ctx.restore();
  }
  if (t.type === "crossing")
    for (const x of [0.35, 0.65])
      for (const y of [0.35, 0.65])
        circle(ctx, t.x + x, t.y + y, 0.025, "#b2b39a");
}
function tree(ctx: C, x: number, y: number, size = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = "#294e4120";
  ctx.beginPath();
  ctx.ellipse(0.15, 0.23, 0.5, 0.26, -0.3, 0, Math.PI * 2);
  ctx.fill();
  round(ctx, -0.055, -0.05, 0.11, 0.48, 0.02, "#8d7551");
  circle(ctx, 0, -0.2, 0.4, "#4a7951");
  circle(ctx, -0.18, -0.34, 0.3, "#63955c");
  circle(ctx, 0.15, -0.46, 0.31, "#7eaa68");
  circle(ctx, -0.06, -0.63, 0.23, "#96b979");
  ctx.restore();
}
function terrain(ctx: C, tracks: Track[]) {
  const g = ctx.createLinearGradient(0, 0, 20, 20);
  g.addColorStop(0, "#b6ce8b");
  g.addColorStop(0.5, "#c0d69a");
  g.addColorStop(1, "#aac786");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 20, 20);
  ctx.strokeStyle = "#68885a15";
  ctx.lineWidth = 0.016;
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 20);
    ctx.moveTo(0, i);
    ctx.lineTo(20, i);
  }
  ctx.stroke();
  let seed = 139;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 1300; i++) {
    const x = random() * 20,
      y = random() * 20;
    ctx.fillStyle = i % 3 === 0 ? "#f0edc236" : "#69884e22";
    ctx.fillRect(x, y, 0.025 + random() * 0.025, 0.025);
  }
  const clear = (x: number, y: number, r = 1) =>
    !tracks
      .flatMap(footprint)
      .some((t) => Math.abs(t.x + 0.5 - x) < r && Math.abs(t.y + 0.5 - y) < r);
  // Background details fade out near constructed track; they never participate in the graph.
  if (clear(10.3, 10, 1.6)) {
    ctx.save();
    ctx.translate(10.3, 10);
    ctx.rotate(-0.3);
    ctx.fillStyle = "#91b67a";
    ctx.beginPath();
    ctx.ellipse(0, 0.02, 1.38, 0.84, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e3d9ad";
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.24, 0.73, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7fb9ad";
    ctx.beginPath();
    ctx.ellipse(0, -0.03, 1.12, 0.63, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c4ded0";
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    ctx.ellipse(-0.05, -0.1, 0.75, 0.36, 0, 3.2, 5.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0.3, 0.1, 0.45, 0.19, 0, 0.1, 1.9);
    ctx.stroke();
    ctx.restore();
  }
  const trees = [
    [3.2, 4.2, 1],
    [4, 4.8, 0.8],
    [3.1, 5.4, 0.7],
    [16.8, 6.5, 1.1],
    [17.5, 7.3, 0.8],
    [3.4, 13.7, 1],
    [4.1, 14.7, 0.8],
    [16.6, 15.2, 1.2],
    [15.7, 15.7, 0.7],
    [8, 9.7, 0.75],
    [7.7, 10.8, 0.55],
    [12.8, 11.4, 0.7],
    [10, 3.5, 0.65],
  ];
  for (const [x, y, s] of trees) if (clear(x, y, 0.8)) tree(ctx, x, y, s);
  for (let i = 0; i < 36; i++) {
    const x = 2 + random() * 16,
      y = 2 + random() * 16;
    if (clear(x, y, 0.65)) {
      circle(ctx, x, y, 0.045, i % 2 ? "#f7ebaa" : "#eef0cf");
      circle(ctx, x + 0.09, y + 0.06, 0.035, "#f1e5c2");
    }
  }
}
export function drawLocomotive(
  ctx: C,
  kind: TrainKind,
  x: number,
  y: number,
  heading: number,
  time = 0,
  running = false,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  ctx.shadowColor = "#1d3b3a35";
  ctx.shadowBlur = 0.14;
  ctx.shadowOffsetY = 0.12;
  round(ctx, -0.48, -0.25, 0.96, 0.5, 0.13, "#374c49");
  ctx.shadowColor = "transparent";
  for (const wx of [-0.29, 0.06, 0.33]) {
    round(ctx, wx - 0.09, -0.3, 0.18, 0.1, 0.035, "#344440");
    round(ctx, wx - 0.09, 0.2, 0.18, 0.1, 0.035, "#344440");
  }
  if (kind === "steam") {
    round(ctx, -0.46, -0.22, 0.38, 0.44, 0.055, "#ab4541");
    round(ctx, -0.43, -0.25, 0.3, 0.5, 0.055, "#c45145");
    round(ctx, -0.34, -0.15, 0.14, 0.3, 0.025, "#d2ded0");
    round(ctx, -0.33, -0.13, 0.11, 0.26, 0.02, "#456a69");
    round(ctx, -0.08, -0.18, 0.47, 0.36, 0.13, "#c65b48");
    round(ctx, -0.02, -0.17, 0.07, 0.34, 0.02, "#e9c378");
    round(ctx, 0.26, -0.18, 0.055, 0.36, 0.01, "#e9c378");
    circle(ctx, 0.33, 0, 0.13, "#af4d3e");
    circle(ctx, 0.33, 0, 0.07, "#53605a");
    circle(ctx, 0.05, 0, 0.085, "#e4bc69");
    round(ctx, 0.39, -0.2, 0.09, 0.4, 0.025, "#b8a175");
    ctx.fillStyle = "#f7de91";
    ctx.fillRect(0.46, -0.09, 0.04, 0.18);
    if (running) {
      ctx.save();
      ctx.rotate(-heading);
      for (let i = 0; i < 4; i++) {
        const progress = (time * 0.55 + i * 0.25) % 1;
        ctx.globalAlpha = (1 - progress) * 0.4;
        circle(
          ctx,
          -0.05 - progress * 0.65,
          -0.28 - progress * 0.75,
          0.08 + progress * 0.15,
          "#fffdf1",
        );
      }
      ctx.restore();
    }
  } else if (kind === "diesel") {
    round(ctx, -0.45, -0.22, 0.9, 0.44, 0.095, "#588fba");
    round(ctx, -0.24, -0.19, 0.58, 0.38, 0.045, "#73a6cc");
    round(ctx, -0.38, -0.18, 0.18, 0.36, 0.035, "#c5dde0");
    round(ctx, -0.36, -0.14, 0.12, 0.28, 0.02, "#355d71");
    ctx.fillStyle = "#3d6b92";
    for (let i = 0; i < 4; i++)
      ctx.fillRect(i * 0.09 - 0.08, -0.13, 0.035, 0.26);
    round(ctx, 0.36, -0.18, 0.08, 0.36, 0.02, "#e7c47c");
  } else {
    round(ctx, -0.48, -0.22, 0.96, 0.44, 0.18, "#e8e5d5");
    round(ctx, 0.12, -0.22, 0.34, 0.44, 0.12, "#e8bb50");
    round(ctx, 0.16, -0.16, 0.14, 0.32, 0.05, "#547679");
    for (let i = 0; i < 3; i++)
      round(ctx, -0.37 + i * 0.16, -0.14, 0.11, 0.28, 0.025, "#769c9c");
    ctx.strokeStyle = "#787e75";
    ctx.lineWidth = 0.025;
    ctx.strokeRect(-0.12, -0.1, 0.16, 0.2);
  }
  ctx.restore();
}
export type RenderOptions = {
  tracks: Track[];
  network: Network;
  camera: Camera;
  width: number;
  height: number;
  selected: string | null;
  ghost: Track | null;
  valid: boolean;
  train: TrainState | null;
  kind: TrainKind;
  time: number;
  showEnds: boolean;
};
export function renderBoard(ctx: C, o: RenderOptions) {
  const { width, height, camera, tracks } = o;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#e6ead8";
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(camera.ox, camera.oy);
  ctx.scale(camera.scale, camera.scale);
  ctx.shadowColor = "#35493922";
  ctx.shadowBlur = 0.4;
  round(ctx, -0.1, -0.1, 20.2, 20.2, 0.23, "#94ae78");
  ctx.shadowColor = "transparent";
  terrain(ctx, tracks);
  for (const t of tracks) {
    if (t.id === o.selected) {
      const b = footprintBounds(t);
      round(
        ctx,
        b.x + 0.02,
        b.y + 0.02,
        b.width - 0.04,
        b.height - 0.04,
        0.12,
        "#fff7d366",
        "#f8f1bf",
      );
      ctx.lineWidth = 0.02;
    }
    drawTrack(ctx, t);
  }
  if (o.showEnds) {
    for (const ep of tracks.flatMap(endpoints)) {
      const linked = o.network.links.has(endpointKey(ep.pieceId, ep.end));
      if (linked) circle(ctx, ep.x, ep.y, 0.045, "#4c806a");
      else {
        circle(ctx, ep.x, ep.y, 0.075, "#fff4cb");
        circle(ctx, ep.x, ep.y, 0.033, "#c7a667");
      }
    }
  }
  ctx.restore();
}

/** Only moving objects and placement feedback are redrawn each frame. */
export function renderOverlay(ctx: C, o: RenderOptions) {
  const { camera, tracks } = o;
  ctx.save();
  ctx.translate(camera.ox, camera.oy);
  ctx.scale(camera.scale, camera.scale);
  if (o.ghost) {
    const t = o.ghost;
    const b = footprintBounds(t);
    ctx.lineWidth = 0.045;
    round(
      ctx,
      b.x + 0.02,
      b.y + 0.02,
      b.width - 0.04,
      b.height - 0.04,
      0.1,
      o.valid ? "#f8f8d46b" : "#eaa5a575",
      o.valid ? "#fffce5" : "#b8564e",
    );
    drawTrack(ctx, t, true);
    if (o.valid) {
      const others = tracks.filter((p) => p.id !== t.id).flatMap(endpoints);
      for (const ep of endpoints(t)) {
        if (others.some((other) => compatible(ep, other))) {
          circle(ctx, ep.x, ep.y, 0.12, "#f8f8d4");
          circle(ctx, ep.x, ep.y, 0.07, "#427b5b");
        }
      }
    }
  }
  if (o.train) {
    const p = trainPose(o.train, tracks);
    if (p)
      drawLocomotive(ctx, o.kind, p.x, p.y, p.heading, o.time, o.train.running);
  }
  ctx.restore();
}
