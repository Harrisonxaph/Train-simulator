"use client";
import { useEffect, useRef } from "react";
import { drawTrack, drawLocomotive } from "@/lib/rendering";
import { footprintBounds } from "@/lib/railway/footprints";
import type { TrainKind, TrackType } from "@/lib/railway/types";
export function TrackPreview({
  type,
  rotation = 0,
}: {
  type: TrackType;
  rotation?: 0 | 1 | 2 | 3;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!,
      ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, 144, 100);
    ctx.save();
    const track = {
      id: "preview",
      type,
      x: 0,
      y: 0,
      rotation,
      switchState: "straight" as const,
    };
    const b = footprintBounds(track);
    if (b.width === 1 && b.height === 1) {
      ctx.translate(35, 12);
      ctx.scale(76, 76);
    } else {
      const scale = Math.min(112 / b.width, 76 / b.height);
      ctx.translate(
        72 - (b.x + b.width / 2) * scale,
        50 - (b.y + b.height / 2) * scale,
      );
      ctx.scale(scale, scale);
    }
    drawTrack(ctx, track);
    ctx.restore();
  }, [type, rotation]);
  return (
    <canvas
      ref={ref}
      width={144}
      height={100}
      className="track-preview"
      aria-hidden="true"
    />
  );
}
export function TrainPreview({ kind }: { kind: TrainKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!,
      ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, 180, 85);
    ctx.save();
    ctx.translate(90, 43);
    ctx.scale(130, 100);
    drawLocomotive(ctx, kind, 0, 0, 0);
    ctx.restore();
  }, [kind]);
  return (
    <canvas
      ref={ref}
      width={180}
      height={85}
      className="train-preview"
      aria-hidden="true"
    />
  );
}
