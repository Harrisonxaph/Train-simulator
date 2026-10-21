"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type {
  Camera,
  Track,
  Tool,
  Network,
  TrainState,
  TrainKind,
  TrackType,
  PathId,
} from "@/lib/railway/types";
import { trackAtCell } from "@/lib/railway/footprints";
import { isSwitch, nearestActivePath } from "@/lib/railway/geometry";
import { canPlace } from "@/lib/railway/editor";
import { advanceTrain } from "@/lib/railway/simulation";
import {
  renderBoard,
  renderOverlay,
  type RenderOptions,
} from "@/lib/rendering";
import { Icon } from "./Icon";
export type BoardHandle = {
  zoom: (factor: number) => void;
  fit: () => void;
  paletteStart: (
    pointerId: number,
    x: number,
    y: number,
    type: TrackType,
  ) => void;
};
type Props = {
  tracks: Track[];
  network: Network;
  tool: Tool;
  rotation: Track["rotation"];
  selected: string | null;
  driving: boolean;
  trainRef: MutableRefObject<TrainState | null>;
  trainKind: TrainKind;
  onSelect: (id: string | null) => void;
  onPlace: (track: Track) => void;
  onMove: (track: Track) => void;
  onTrainPlace: (track: Track, pathId?: PathId) => void;
  onSimulation: (state: TrainState | null) => void;
  onEnded: () => void;
  onWheelSound: () => void;
  onRotate: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFeedback: (text: string) => void;
};
type Gesture = {
  id: number;
  kind: "pan" | "place" | "move" | "select" | "train" | "palette";
  sx: number;
  sy: number;
  camera: Camera;
  track?: Track;
  type?: TrackType;
  moved: boolean;
  grab?: { x: number; y: number };
};
export const RailwayBoard = forwardRef<BoardHandle, Props>(
  function RailwayBoard(props, ref) {
    const canvas = useRef<HTMLCanvasElement>(null),
      container = useRef<HTMLDivElement>(null),
      latest = useRef(props);
    latest.current = props;
    const cameraRef = useRef<Camera>({ scale: 35, ox: 0, oy: 0 });
    const [camera, setCamera] = useState(cameraRef.current);
    const size = useRef({ w: 800, h: 530 }),
      gesture = useRef<Gesture | null>(null),
      ghost = useRef<Track | null>(null),
      hasSized = useRef(false);
    const setCam = (c: Camera) => {
      cameraRef.current = c;
      setCamera(c);
    };
    const fit = () => {
      const { w, h } = size.current;
      const scale = Math.min((w - 32) / 20, (h - 32) / 20);
      setCam({ scale, ox: w / 2 - 10 * scale, oy: h / 2 - 10 * scale });
    };
    const zoom = (factor: number) => {
      const c = cameraRef.current,
        { w, h } = size.current,
        scale = Math.max(12, Math.min(110, c.scale * factor)),
        ratio = scale / c.scale;
      setCam({
        scale,
        ox: w / 2 - (w / 2 - c.ox) * ratio,
        oy: h / 2 - (h / 2 - c.oy) * ratio,
      });
    };
    useImperativeHandle(ref, () => ({
      zoom,
      fit,
      paletteStart: (id, x, y, type) => {
        gesture.current = {
          id,
          kind: "palette",
          sx: x,
          sy: y,
          camera: cameraRef.current,
          type,
          moved: false,
        };
      },
    }));
    useEffect(() => {
      const el = container.current!,
        c = canvas.current!;
      const resize = () => {
        const rect = el.getBoundingClientRect(),
          old = size.current;
        // Layout transitions can briefly hide the board. Keep its drawable buffer
        // and camera until ResizeObserver reports a usable size again.
        if (rect.width <= 0 || rect.height <= 0) return;
        size.current = { w: rect.width, h: rect.height };
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        c.width = Math.round(rect.width * dpr);
        c.height = Math.round(rect.height * dpr);
        if (!hasSized.current) {
          const scale = Math.max(
            12,
            Math.min(rect.width / 15.5, rect.height / 12.5),
          );
          setCam({
            scale,
            ox: rect.width / 2 - 10 * scale,
            oy: rect.height / 2 - 10 * scale,
          });
          hasSized.current = true;
        } else {
          const cam = cameraRef.current;
          setCam({
            ...cam,
            ox: cam.ox + (rect.width - old.w) / 2,
            oy: cam.oy + (rect.height - old.h) / 2,
          });
        }
      };
      const observer = new ResizeObserver(resize);
      observer.observe(el);
      resize();
      return () => observer.disconnect();
    }, []);
    useEffect(() => {
      const el = canvas.current!;
      const hit = (x: number, y: number) => {
        const r = el.getBoundingClientRect(),
          c = cameraRef.current;
        return {
          x: Math.floor((x - r.left - c.ox) / c.scale),
          y: Math.floor((y - r.top - c.oy) / c.scale),
          inside: x >= r.left && x <= r.right && y >= r.top && y <= r.bottom,
        };
      };
      const isTrackTool = (tool: Tool): tool is TrackType =>
        tool !== "select" && tool !== "pan" && tool !== "train";
      const candidate = (x: number, y: number, g?: Gesture | null): Track => {
        const cell = hit(x, y),
          p = latest.current;
        return {
          ...g?.track,
          id: g?.track?.id || "ghost",
          type:
            g?.track?.type ||
            g?.type ||
            (isTrackTool(p.tool) ? p.tool : "straight"),
          x: cell.x - (g?.grab?.x || 0),
          y: cell.y - (g?.grab?.y || 0),
          rotation: g?.track?.rotation ?? p.rotation,
        };
      };
      const move = (e: PointerEvent) => {
        const g = gesture.current,
          p = latest.current;
        if (g && g.id !== e.pointerId) return;
        if (g) {
          g.moved ||= Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > 5;
          if (g.kind === "pan") {
            setCam({
              ...g.camera,
              ox: g.camera.ox + e.clientX - g.sx,
              oy: g.camera.oy + e.clientY - g.sy,
            });
            return;
          }
          if (
            g.kind === "move" ||
            g.kind === "place" ||
            (g.kind === "palette" && g.moved)
          )
            ghost.current = hit(e.clientX, e.clientY).inside
              ? candidate(e.clientX, e.clientY, g)
              : null;
        } else if (!p.driving && isTrackTool(p.tool))
          ghost.current = hit(e.clientX, e.clientY).inside
            ? candidate(e.clientX, e.clientY)
            : null;
      };
      const up = (e: PointerEvent) => {
        const g = gesture.current;
        if (!g || g.id !== e.pointerId) return;
        gesture.current = null;
        ghost.current = null;
        const p = latest.current,
          cell = hit(e.clientX, e.clientY);
        if (!cell.inside) return;
        if (g.kind === "pan") {
          if (p.driving && !g.moved && g.track && isSwitch(g.track))
            p.onSelect(g.track.id);
          return;
        }
        if (g.kind === "train") {
          const t = trackAtCell(p.tracks, cell.x, cell.y);
          if (t) {
            const r = el.getBoundingClientRect(),
              c = cameraRef.current;
            p.onTrainPlace(
              t,
              nearestActivePath(t, {
                x: (e.clientX - r.left - c.ox) / c.scale,
                y: (e.clientY - r.top - c.oy) / c.scale,
              }),
            );
          } else p.onFeedback("Tap a track to place your engine.");
          return;
        }
        if (p.driving) return;
        if (g.kind === "move" && g.moved) {
          p.onMove(candidate(e.clientX, e.clientY, g));
          return;
        }
        if (g.kind === "place" || (g.kind === "palette" && g.moved))
          p.onPlace(candidate(e.clientX, e.clientY, g));
      };
      const cancel = (e: PointerEvent) => {
        if (gesture.current?.id === e.pointerId) {
          gesture.current = null;
          ghost.current = null;
        }
      };
      const down = (e: PointerEvent) => {
        if (gesture.current) return;
        if (e.button !== 0 && e.button !== 1) return;
        e.preventDefault();
        el.focus({ preventScroll: true });
        el.setPointerCapture(e.pointerId);
        const p = latest.current,
          cell = hit(e.clientX, e.clientY),
          track = trackAtCell(p.tracks, cell.x, cell.y);
        const kind =
          e.button === 1 || e.shiftKey || p.tool === "pan"
            ? "pan"
            : p.driving
              ? p.tool === "train"
                ? "train"
                : "pan"
              : p.tool === "select"
                ? track
                  ? "move"
                  : "select"
                : p.tool === "train"
                  ? "train"
                  : "place";
        if (!p.driving && p.tool === "select") p.onSelect(track?.id || null);
        gesture.current = {
          id: e.pointerId,
          kind,
          sx: e.clientX,
          sy: e.clientY,
          camera: cameraRef.current,
          track:
            kind === "move" || (p.driving && track && isSwitch(track))
              ? track
              : undefined,
          grab:
            kind === "move" && track
              ? { x: cell.x - track.x, y: cell.y - track.y }
              : undefined,
          moved: false,
        };
        if (kind === "place") ghost.current = candidate(e.clientX, e.clientY);
      };
      const wheel = (e: WheelEvent) => {
        e.preventDefault();
        const r = el.getBoundingClientRect(),
          px = e.clientX - r.left,
          py = e.clientY - r.top,
          c = cameraRef.current,
          scale = Math.max(
            12,
            Math.min(110, c.scale * Math.exp(-e.deltaY * 0.001)),
          );
        setCam({
          scale,
          ox: px - ((px - c.ox) * scale) / c.scale,
          oy: py - ((py - c.oy) * scale) / c.scale,
        });
      };
      const leave = () => {
        if (!gesture.current) ghost.current = null;
      };
      const interrupted = () => {
        gesture.current = null;
        ghost.current = null;
      };
      window.addEventListener("blur", interrupted);
      el.addEventListener("pointerdown", down);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cancel);
      el.addEventListener("wheel", wheel, { passive: false });
      el.addEventListener("pointerleave", leave);
      return () => {
        window.removeEventListener("blur", interrupted);
        el.removeEventListener("pointerdown", down);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", cancel);
        el.removeEventListener("wheel", wheel);
        el.removeEventListener("pointerleave", leave);
      };
    }, []);
    useEffect(() => {
      ghost.current = null;
    }, [props.tool, props.rotation, props.driving]);
    useEffect(() => {
      const ctx = canvas.current!.getContext("2d")!;
      const cache = document.createElement("canvas"),
        cacheCtx = cache.getContext("2d")!;
      let cachedTracks: Track[] | null = null,
        cachedCamera: Camera | null = null,
        cachedSelected: string | null | undefined,
        cachedDriving: boolean | undefined,
        cachedDpr = 0;
      let raf = 0,
        last = 0,
        lastStatus = 0,
        lastWheel = 0;
      const resetTime = () => {
        last = 0;
        if (document.hidden) {
          gesture.current = null;
          ghost.current = null;
        }
      };
      document.addEventListener("visibilitychange", resetTime);
      const frame = (now: number) => {
        const p = latest.current;
        const dt =
          last && !document.hidden
            ? Math.min(0.05, Math.max(0, (now - last) / 1000))
            : 0;
        last = now;
        const before = p.trainRef.current;
        if (before?.running) {
          const next = advanceTrain(before, p.tracks, p.network, dt);
          p.trainRef.current = next;
          if (!next.running) p.onEnded();
          if (now - lastWheel > 360) {
            lastWheel = now;
            p.onWheelSound();
          }
        }
        if (now - lastStatus > 100) {
          lastStatus = now;
          p.onSimulation(p.trainRef.current);
        }
        const { w, h } = size.current,
          dpr = Math.min(window.devicePixelRatio || 1, 2);
        const g = ghost.current;
        const options: RenderOptions = {
          tracks: p.tracks,
          network: p.network,
          camera: cameraRef.current,
          width: w,
          height: h,
          selected: p.selected,
          ghost: g,
          valid: g
            ? canPlace(
                p.tracks,
                g,
                gesture.current?.kind === "move" ? g.id : undefined,
              )
            : false,
          train: p.trainRef.current,
          kind: p.trainKind,
          time: now / 1000,
          showEnds: !p.driving,
        };
        if (
          cachedTracks !== p.tracks ||
          cachedCamera !== cameraRef.current ||
          cachedSelected !== p.selected ||
          cachedDriving !== p.driving ||
          cachedDpr !== dpr ||
          cache.width !== canvas.current!.width ||
          cache.height !== canvas.current!.height
        ) {
          cache.width = canvas.current!.width;
          cache.height = canvas.current!.height;
          cacheCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          renderBoard(cacheCtx, options);
          cachedTracks = p.tracks;
          cachedCamera = cameraRef.current;
          cachedSelected = p.selected;
          cachedDriving = p.driving;
          cachedDpr = dpr;
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(cache, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderOverlay(ctx, options);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      return () => {
        cancelAnimationFrame(raf);
        document.removeEventListener("visibilitychange", resetTime);
      };
    }, []);
    return (
      <div
        ref={container}
        className={`board-wrap ${props.tool === "pan" ? "panning" : ""}`}
      >
        <canvas
          ref={canvas}
          role="application"
          aria-label="Railway construction board"
          aria-describedby="board-instructions"
          tabIndex={0}
          data-scale={camera.scale}
          data-ox={camera.ox}
          data-oy={camera.oy}
          onKeyDown={(e) => {
            if (e.key === "r" || e.key === "R") {
              e.preventDefault();
              props.onRotate();
            }
            if (e.key === "Delete" || e.key === "Backspace") {
              e.preventDefault();
              props.onDelete();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === "z") {
              e.preventDefault();
              if (e.shiftKey) props.onRedo();
              else props.onUndo();
            }
            if (e.key === "+" || e.key === "=") zoom(1.2);
            if (e.key === "-") zoom(1 / 1.2);
            if (
              ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                e.key,
              )
            ) {
              e.preventDefault();
              const c = cameraRef.current;
              setCam({
                ...c,
                ox:
                  c.ox +
                  (e.key === "ArrowLeft"
                    ? c.scale
                    : e.key === "ArrowRight"
                      ? -c.scale
                      : 0),
                oy:
                  c.oy +
                  (e.key === "ArrowUp"
                    ? c.scale
                    : e.key === "ArrowDown"
                      ? -c.scale
                      : 0),
              });
            }
            if (e.key === "Escape") {
              gesture.current = null;
              ghost.current = null;
              props.onSelect(null);
            }
          }}
        />
        <div className="board-label">
          <span className="live-dot" />{" "}
          {props.driving ? "All aboard!" : "Your little railway"}{" "}
          <span className="board-label-separator">/</span>
          <span>20 × 20</span>
        </div>
        <div className="board-compass" aria-hidden="true">
          <span>N</span>
          <svg width="23" height="32" viewBox="0 0 23 32">
            <path d="m11.5 2 6 25-6-4-6 4Z" fill="#45644f" />
            <path d="m11.5 2 6 25-6-4Z" fill="#f5f1d8" />
          </svg>
        </div>
        <div className="board-zoom">
          <button aria-label="Zoom out" onClick={() => zoom(1 / 1.2)}>
            <Icon name="minus" size={18} />
          </button>
          <span>{Math.round((camera.scale / 35) * 100)}%</span>
          <button aria-label="Zoom in" onClick={() => zoom(1.2)}>
            <Icon name="plus" size={18} />
          </button>
          <i />
          <button aria-label="Fit board" onClick={fit}>
            <Icon name="fit" size={18} />
          </button>
        </div>
        <p id="board-instructions" className="sr-only">
          Choose a track, then tap or drag onto the board. Select a piece to
          move it. R rotates, Delete removes, Control Z undoes. Use Pan to move
          the view. Keyboard placement is available under Place by grid.
        </p>
      </div>
    );
  },
);
