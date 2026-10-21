"use client";
import { useState } from "react";
import type { Track, Tool } from "@/lib/railway/types";
import { Icon } from "./Icon";
import { TrackPreview } from "./TrackPreview";
type Props = {
  mode: "build" | "drive";
  tool: Tool;
  rotation: Track["rotation"];
  selected: string | null;
  tracks: Track[];
  selectTool: (t: Tool) => void;
  paletteStart: (
    id: number,
    x: number,
    y: number,
    type: "straight" | "curve",
  ) => void;
  pan: () => void;
  rotate: () => void;
  remove: () => void;
  sample: () => void;
  setSelected: (id: string | null) => void;
  setFeedback: (s: string) => void;
  placeTrain: (t: Track) => void;
  place: (t: Track) => void;
  move: (t: Track) => void;
};
export function BuildingBox({
  mode,
  tool,
  rotation,
  selected,
  tracks,
  selectTool,
  paletteStart,
  pan,
  rotate,
  remove,
  sample,
  setSelected,
  setFeedback,
  placeTrain,
  place,
  move,
}: Props) {
  const [gridX, setGridX] = useState(10),
    [gridY, setGridY] = useState(10);
  return (
    <section
      className={`building-box ${mode === "drive" ? "locked" : ""}`}
      aria-label="Track building tools"
    >
      <div className="box-heading">
        <div>
          <span className="eyebrow">YOUR BUILDING BOX</span>
          <h2>
            {mode === "build"
              ? "A little piece of possibility."
              : "Enjoy the journey."}
          </h2>
        </div>
        <span className="box-hint">
          {mode === "build"
            ? "Choose, drag & connect"
            : "Switch to Build to change your railway"}
        </span>
      </div>
      <div className="tools-row">
        <button
          className={`piece-tool ${tool === "straight" && mode === "build" ? "selected" : ""}`}
          aria-label="Straight track"
          aria-pressed={tool === "straight" && mode === "build"}
          disabled={mode === "drive"}
          onPointerDown={(e) => {
            if (mode === "drive") return;
            selectTool("straight");
            e.currentTarget.setPointerCapture(e.pointerId);
            paletteStart(e.pointerId, e.clientX, e.clientY, "straight");
          }}
          onClick={() => selectTool("straight")}
        >
          <TrackPreview
            type="straight"
            rotation={tool === "straight" ? rotation : 0}
          />
          <span>
            Straight <small>KEEP GOING</small>
          </span>
          {tool === "straight" && mode === "build" && (
            <i>
              <Icon name="check" size={11} />
            </i>
          )}
        </button>
        <button
          className={`piece-tool ${tool === "curve" && mode === "build" ? "selected" : ""}`}
          aria-label="Curve track"
          aria-pressed={tool === "curve" && mode === "build"}
          disabled={mode === "drive"}
          onPointerDown={(e) => {
            if (mode === "drive") return;
            selectTool("curve");
            e.currentTarget.setPointerCapture(e.pointerId);
            paletteStart(e.pointerId, e.clientX, e.clientY, "curve");
          }}
          onClick={() => selectTool("curve")}
        >
          <TrackPreview
            type="curve"
            rotation={tool === "curve" ? rotation : 0}
          />
          <span>
            Curve <small>A NEW DIRECTION</small>
          </span>
          {tool === "curve" && mode === "build" && (
            <i>
              <Icon name="check" size={11} />
            </i>
          )}
        </button>
        <div className="tool-separator" />
        <div className="small-tools">
          <button
            disabled={mode === "drive"}
            className={tool === "select" ? "selected" : ""}
            aria-label="Select and move"
            aria-pressed={tool === "select"}
            onClick={() => selectTool("select")}
          >
            <Icon name="cursor" />
            <span>Select</span>
          </button>
          <button
            className={tool === "pan" ? "selected" : ""}
            aria-label="Pan board"
            aria-pressed={tool === "pan"}
            onClick={() => {
              pan();
            }}
          >
            <Icon name="hand" />
            <span>Pan</span>
          </button>
        </div>
        <div className="small-tools">
          <button
            disabled={mode === "drive"}
            aria-label="Rotate"
            title="Rotate (R)"
            onClick={rotate}
          >
            <Icon name="rotate" />
            <span>Rotate</span>
          </button>
          <button
            disabled={mode === "drive" || !selected}
            aria-label="Delete selected piece"
            onClick={remove}
          >
            <Icon name="trash" />
            <span>Remove</span>
          </button>
        </div>
        <div className="sample-card">
          <span>Need a little inspiration?</span>
          <button aria-label="Load Meadow Loop" onClick={sample}>
            Try the Meadow Loop <Icon name="arrow" size={15} />
          </button>
        </div>
      </div>
      <details className="grid-placement">
        <summary>
          Place by grid <span>⌨</span>
        </summary>
        <div className="grid-inputs">
          <label>
            Column{" "}
            <input
              type="number"
              min={1}
              max={20}
              value={gridX}
              onChange={(e) => setGridX(Number(e.target.value))}
            />
          </label>
          <label>
            Row{" "}
            <input
              type="number"
              min={1}
              max={20}
              value={gridY}
              onChange={(e) => setGridY(Number(e.target.value))}
            />
          </label>
          <button
            disabled={mode === "drive" && tool !== "train"}
            onClick={() => {
              const t = tracks.find(
                (t) => t.x === gridX - 1 && t.y === gridY - 1,
              );
              if (tool === "train") {
                if (t) placeTrain(t);
                else setFeedback("Choose a square with track for your engine.");
              } else if (tool === "select") {
                setSelected(t?.id || null);
                setFeedback(
                  t
                    ? "Piece selected. Rotate or Remove to change it."
                    : "No piece at that grid position.",
                );
              } else
                place({
                  id: "grid",
                  type: tool === "curve" ? "curve" : "straight",
                  x: gridX - 1,
                  y: gridY - 1,
                  rotation,
                });
            }}
          >
            {" "}
            {tool === "train"
              ? "Place engine"
              : tool === "select"
                ? "Select piece"
                : "Place piece"}
          </button>
          {selected && mode === "build" && (
            <button
              onClick={() => {
                const t = tracks.find((t) => t.id === selected);
                if (t) move({ ...t, x: gridX - 1, y: gridY - 1 });
              }}
            >
              Move selected here
            </button>
          )}
        </div>
      </details>
    </section>
  );
}
