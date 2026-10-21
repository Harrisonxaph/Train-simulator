"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  SavedLayout,
  Track,
  TrainKind,
  TrainState,
  StartPosition,
  Tool,
} from "@/lib/railway/types";
import { sampleLayout } from "@/lib/railway/sample";
import { buildNetwork } from "@/lib/railway/network";
import { pathLength } from "@/lib/railway/geometry";
import {
  canPlace,
  initialHistory,
  commit,
  undo,
  redo,
  type History,
} from "@/lib/railway/editor";
import { createTrain } from "@/lib/railway/simulation";
import { decodeSave, encodeSave, SAVE_KEY } from "@/lib/railway/persistence";
import { RailwayAudio } from "@/lib/audio";
import { RailwayBoard, type BoardHandle } from "./RailwayBoard";
import { Icon, type IconName } from "./Icon";
import { BuildingBox } from "./BuildingBox";
import { ConductorPanel } from "./ConductorPanel";
const defaultStart: StartPosition = {
  pieceId: "sample-2",
  distance: 0.5,
  direction: 1,
};
function IconButton({
  name,
  label,
  onClick,
  disabled = false,
}: {
  name: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="icon-button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon name={name} />
    </button>
  );
}
export default function RailwayGame() {
  const [history, setHistory] = useState<History>(() =>
    initialHistory(sampleLayout()),
  );
  const tracks = history.present;
  const network = useMemo(() => buildNetwork(tracks), [tracks]);
  const [mode, setMode] = useState<"build" | "drive">("build"),
    [tool, setTool] = useState<Tool>("straight"),
    [rotation, setRotation] = useState<Track["rotation"]>(0),
    [selected, setSelected] = useState<string | null>(null);
  const [kind, setKind] = useState<TrainKind>("steam"),
    [start, setStart] = useState<StartPosition | null>(defaultStart),
    [muted, setMuted] = useState(false),
    [speed, setSpeed] = useState(2);
  const trainRef = useRef<TrainState | null>(createTrain(defaultStart)),
    [trainStatus, setTrainStatus] = useState<TrainState | null>(
      trainRef.current,
    );
  const [feedback, setFeedback] = useState(
      "A little railway, ready for its first adventure.",
    ),
    [hydrated, setHydrated] = useState(false),
    [autoAllowed, setAutoAllowed] = useState(true),
    [saveStatus, setSaveStatus] = useState("Saved on this device");
  const [confirmClear, setConfirmClear] = useState(false),
    [tour, setTour] = useState<number | null>(null);
  const board = useRef<BoardHandle>(null),
    audio = useRef<RailwayAudio | null>(null),
    previousLoops = useRef(1);
  const getAudio = () => {
    audio.current ??= new RailwayAudio();
    audio.current.muted = muted;
    return audio.current;
  };
  const advanceTour = (stage: number) =>
    setTour((t) => (t === stage ? (stage === 5 ? null : stage + 1) : t));
  const dismissTour = () => {
    setTour(null);
    try {
      localStorage.setItem("little-railways-tour", "done");
    } catch {}
  };
  const applyLayout = (s: SavedLayout) => {
    setHistory((h) => commit(h, s.tracks));
    setKind(s.trainKind);
    setStart(s.start);
    setMuted(s.muted);
    trainRef.current = s.start ? createTrain(s.start) : null;
    setTrainStatus(trainRef.current);
    setSelected(null);
    setMode("build");
    setTool("straight");
    setRotation(0);
  };
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        try {
          const s = decodeSave(raw);
          setHistory(initialHistory(s.tracks));
          setKind(s.trainKind);
          setStart(s.start);
          setMuted(s.muted);
          trainRef.current = s.start ? createTrain(s.start) : null;
          setTrainStatus(trainRef.current);
          setFeedback("Welcome back, little conductor. Your railway is ready.");
        } catch {
          setAutoAllowed(false);
          setSaveStatus("Saved file needs a fresh start");
          setFeedback(
            "Your saved railway could not be read. Try the sample; Save will replace the old file.",
          );
        }
      }
      if (localStorage.getItem("little-railways-tour") !== "done") setTour(0);
    } catch {
      setSaveStatus("Saving unavailable in this browser");
      setAutoAllowed(false);
      setFeedback("You can still play! This browser cannot save your railway.");
    }
    setHydrated(true);
    return () => {
      audio.current?.dispose();
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    if (!hydrated || !autoAllowed) return;
    setSaveStatus("Saving…");
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(
          SAVE_KEY,
          encodeSave({ version: 1, tracks, trainKind: kind, start, muted }),
        );
        setSaveStatus("Saved on this device");
      } catch {
        setSaveStatus("Could not save on this device");
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [tracks, kind, start, muted, hydrated, autoAllowed]);
  useEffect(() => {
    if (network.loops.length > previousLoops.current) {
      setFeedback("Amazing! You’ve built a complete railway!");
      audio.current?.celebrate();
    }
    previousLoops.current = network.loops.length;
    if (network.loops.length && tour === 3) setTour(4);
  }, [network.loops.length, tour]); // eslint-disable-line react-hooks/exhaustive-deps
  const updateTrain = (state: TrainState | null) => {
    trainRef.current = state;
    setTrainStatus(state);
  };
  const resetForTracks = (next: Track[]) => {
    const startTrack = start ? next.find((t) => t.id === start.pieceId) : null;
    // History can restore a shorter geometry under an ID from an imported save.
    if (
      start &&
      startTrack &&
      start.distance >= 0 &&
      start.distance <= pathLength(startTrack)
    ) {
      updateTrain(createTrain(start));
    } else {
      setStart(null);
      updateTrain(null);
    }
  };
  const edit = (next: Track[]) => {
    setHistory((h) => commit(h, next));
    resetForTracks(next);
  };
  const place = (candidate: Track) => {
    if (mode !== "build") return;
    if (!canPlace(tracks, candidate)) {
      setFeedback("Find an empty square on the grassy board.");
      return;
    }
    const t = { ...candidate, id: crypto.randomUUID() };
    const next = [...tracks, t];
    edit(next);
    const n = buildNetwork(next);
    const connected = [...n.links.keys()].some((k) => k.startsWith(`${t.id}:`));
    getAudio().place(connected);
    setFeedback(
      connected
        ? "A perfect fit! Keep your railway growing."
        : "Track down! What shall we build next?",
    );
    if (tool === "straight") advanceTour(1);
    if (tool === "curve") advanceTour(2);
  };
  const move = (t: Track) => {
    if (mode !== "build") return;
    if (!canPlace(tracks, t, t.id)) {
      setFeedback("That square is busy. Try an empty one.");
      return;
    }
    const old = tracks.find((p) => p.id === t.id);
    if (old?.x === t.x && old.y === t.y) return;
    edit(tracks.map((p) => (p.id === t.id ? t : p)));
    getAudio().place();
    setFeedback("Just the right spot.");
  };
  const rotate = () => {
    if (mode !== "build") return;
    if (selected) {
      const t = tracks.find((t) => t.id === selected);
      if (t) {
        edit(
          tracks.map((p) =>
            p.id === selected
              ? { ...p, rotation: ((p.rotation + 1) % 4) as Track["rotation"] }
              : p,
          ),
        );
        getAudio().place();
      }
    } else setRotation((r) => ((r + 1) % 4) as Track["rotation"]);
  };
  const remove = () => {
    if (mode !== "build" || !selected) return;
    edit(tracks.filter((t) => t.id !== selected));
    setSelected(null);
    setFeedback("A little more room for imagination.");
  };
  const historyAction = (action: "undo" | "redo") => {
    if (mode !== "build") return;
    const next = action === "undo" ? undo(history) : redo(history);
    setHistory(next);
    resetForTracks(next.present);
    setSelected(null);
  };
  const changeMode = (next: "build" | "drive") => {
    if (trainRef.current)
      updateTrain({ ...trainRef.current, running: false, speed: 0 });
    setMode(next);
    setSelected(null);
    setTool(next === "build" ? "select" : "pan");
    setFeedback(
      next === "build"
        ? "Choose a track below, or select a piece to move it."
        : "Choose an engine, tap a track, and you’re ready to roll.",
    );
  };
  const chooseEngine = (next: TrainKind) => {
    if (trainRef.current)
      updateTrain({ ...trainRef.current, running: false, speed: 0 });
    setKind(next);
    setMode("drive");
    setTool("train");
    setSelected(null);
    setFeedback("Tap a track to place your engine.");
    advanceTour(4);
  };
  const placeTrain = (track: Track) => {
    const position: StartPosition = {
      pieceId: track.id,
      distance: pathLength(track) / 2,
      direction: 1,
    };
    setStart(position);
    updateTrain(createTrain(position));
    setTool("pan");
    setFeedback("Your engine is ready. Press Play to begin!");
    getAudio().place(true);
  };
  const play = () => {
    if (!start || !trainRef.current) {
      setMode("drive");
      setTool("train");
      setFeedback("Choose an engine, then tap a track to place it.");
      return;
    }
    const component = network.loops.find((c) =>
      c.includes(trainRef.current!.pieceId),
    );
    const length = component
      ? tracks
          .filter((t) => component.includes(t.id))
          .reduce((s, t) => s + pathLength(t), 0)
      : 0;
    updateTrain({
      ...trainRef.current,
      running: true,
      targetSpeed: speed,
      lapLength: length,
    });
    setMode("drive");
    setTool("pan");
    setSelected(null);
    getAudio().place(true);
    setFeedback(
      component
        ? "Off we go! There’s a whole little world to explore."
        : "Off we go! Your engine will stop at the end of the track.",
    );
    if (tour === 5) dismissTour();
  };
  const pause = () => {
    if (trainRef.current)
      updateTrain({ ...trainRef.current, running: false, speed: 0 });
    setFeedback("Taking a little breather. Press Play when you’re ready.");
  };
  const stop = () => {
    updateTrain(start ? createTrain(start) : null);
    setFeedback("Back at the beginning. Another adventure?");
  };
  const reverse = () => {
    if (!trainRef.current || trainRef.current.running) return;
    updateTrain({
      ...trainRef.current,
      direction: trainRef.current.direction === 1 ? -1 : 1,
      speed: 0,
    });
    setFeedback("This way to a new adventure!");
  };
  const manualSave = () => {
    try {
      localStorage.setItem(
        SAVE_KEY,
        encodeSave({ version: 1, tracks, trainKind: kind, start, muted }),
      );
      setAutoAllowed(true);
      setSaveStatus("Saved on this device");
      setFeedback("Railway saved. It will be here when you come back.");
    } catch {
      setFeedback(
        "We couldn’t save this time. Your railway is still here to play.",
      );
    }
  };
  const load = () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        setFeedback("No saved railway yet. Build a little, then press Save.");
        return;
      }
      applyLayout(decodeSave(raw));
      setAutoAllowed(true);
      setFeedback("Your saved railway is back on track.");
    } catch {
      // Preserve the damaged record until an explicit recovery action, just as on startup.
      setAutoAllowed(false);
      setSaveStatus("Saved file needs a fresh start");
      setFeedback(
        "Your saved railway could not be read. Your current board is safe. Save to replace the old file.",
      );
    }
  };
  const sample = () => {
    const sample = sampleLayout();
    edit(sample);
    setStart(defaultStart);
    updateTrain(createTrain(defaultStart));
    setKind("steam");
    setSelected(null);
    setMode("build");
    setTool("straight");
    setRotation(0);
    setAutoAllowed(true);
    setFeedback("The Meadow Loop is ready. Press Play for a little journey.");
  };
  const clear = () => {
    edit([]);
    setStart(null);
    updateTrain(null);
    setSelected(null);
    setMode("build");
    setTool("straight");
    setRotation(0);
    setAutoAllowed(true);
    setConfirmClear(false);
    setFeedback("A fresh patch of grass. What will you dream up?");
  };
  const changeSpeed = (value: number) => {
    setSpeed(value);
    if (trainRef.current)
      updateTrain({ ...trainRef.current, targetSpeed: value });
  };
  const onSimulation = useCallback(
    (s: TrainState | null) => setTrainStatus(s),
    [],
  );
  const selectTool = (t: Tool) => {
    if (mode === "drive") return;
    setSelected(null);
    setTool(t);
    if (t === "straight" || t === "curve") {
      if (t !== tool) setRotation(0);
      advanceTour(0);
    }
  };
  return (
    <div className={`game-shell ${mode === "drive" ? "is-driving" : ""}`}>
      <header className="site-header">
        <div className="brand">
          <div className="brand-mark">
            <Icon name="train" size={29} />
            <span className="smoke-dot" />
          </div>
          <div className="brand-name">
            little railways<span>MY TRAIN SET</span>
          </div>
        </div>
        <nav className="mode-switch" aria-label="Game mode">
          <button
            className={mode === "build" ? "active" : ""}
            aria-label="Build mode"
            aria-pressed={mode === "build"}
            onClick={() => changeMode("build")}
          >
            <Icon name="rotate" size={18} /> <span>Build</span>
          </button>
          <button
            className={mode === "drive" ? "active" : ""}
            aria-label="Drive mode"
            aria-pressed={mode === "drive"}
            onClick={() => changeMode("drive")}
          >
            <Icon name="train" size={18} /> <span>Drive</span>
          </button>
        </nav>
        <div className="header-actions">
          <span className="local-label">
            <span className="tiny-dot" /> Your world, saved here
          </span>
          <IconButton
            name={muted ? "mute" : "sound"}
            label={muted ? "Unmute sound" : "Mute sound"}
            onClick={() => {
              const next = !muted;
              setMuted(next);
              if (audio.current) audio.current.muted = next;
            }}
          />
          <IconButton
            name="help"
            label="Show tutorial"
            onClick={() => setTour(0)}
          />
        </div>
      </header>
      <main className="main-content">
        <div className="welcome-row">
          <div>
            <div className="eyebrow">
              <span /> A LITTLE WORLD OF YOUR OWN
            </div>
            <h1>
              Small tracks. <em>Big adventures.</em>
            </h1>
          </div>
          <div className="welcome-note">
            <Icon name="leaf" size={24} />
            <span>
              No rush. No rules.
              <br />
              <strong>Just your imagination.</strong>
            </span>
          </div>
        </div>
        <div className="game-layout">
          <section className="railway-workspace" aria-label="Railway editor">
            <div className="workspace-toolbar">
              <div className="layout-name">
                <Icon name="train" size={19} />
                <strong>My railway</strong>
                <span className="mode-tag">
                  {mode === "build" ? "BUILDING" : "EXPLORING"}
                </span>
              </div>
              <div className="utility-controls">
                <IconButton
                  name="undo"
                  label="Undo"
                  onClick={() => historyAction("undo")}
                  disabled={mode === "drive" || !history.past.length}
                />
                <IconButton
                  name="redo"
                  label="Redo"
                  onClick={() => historyAction("redo")}
                  disabled={mode === "drive" || !history.future.length}
                />
                <span className="toolbar-divider" />
                <IconButton
                  name="save"
                  label="Save railway"
                  onClick={manualSave}
                />
                <IconButton name="load" label="Load railway" onClick={load} />
                <IconButton
                  name="spark"
                  label="Sample railway"
                  onClick={sample}
                />
                <button
                  className="new-button"
                  aria-label="New board"
                  onClick={() => setConfirmClear(true)}
                >
                  <Icon name="plus" size={16} />
                  <span>New</span>
                </button>
              </div>
            </div>
            <div className="board-area">
              <RailwayBoard
                ref={board}
                tracks={tracks}
                network={network}
                tool={tool}
                rotation={rotation}
                selected={selected}
                driving={mode === "drive"}
                trainRef={trainRef}
                trainKind={kind}
                onSelect={setSelected}
                onPlace={place}
                onMove={move}
                onTrainPlace={placeTrain}
                onSimulation={onSimulation}
                onEnded={() =>
                  setFeedback(
                    "End of the line! Add more track or reverse your engine.",
                  )
                }
                onWheelSound={() => audio.current?.wheel()}
                onRotate={rotate}
                onDelete={remove}
                onUndo={() => historyAction("undo")}
                onRedo={() => historyAction("redo")}
                onFeedback={setFeedback}
              />
              <div className="board-bottom-badge">
                <Icon
                  name={network.loops.length ? "check" : "leaf"}
                  size={14}
                />
                {network.loops.length
                  ? "A happy, connected railway"
                  : "A little room to grow"}
              </div>
            </div>
            <div className="board-status">
              <div>
                <span className="stat-dot" />
                <span>
                  <b data-testid="piece-count">{tracks.length}</b> pieces
                </span>
                <span className="stat-separator">·</span>
                <span>
                  <b data-testid="loop-count">{network.loops.length}</b>{" "}
                  {network.loops.length === 1 ? "loop" : "loops"}
                </span>
                <span className="stat-separator">·</span>
                <span>{network.openEnds.length} open ends</span>
              </div>
              <span className="save-indicator">
                <Icon name="check" size={13} />
                {saveStatus}
              </span>
            </div>
            <BuildingBox
              mode={mode}
              tool={tool}
              rotation={rotation}
              selected={selected}
              tracks={tracks}
              selectTool={selectTool}
              paletteStart={(...args) => board.current?.paletteStart(...args)}
              pan={() => {
                setTool("pan");
                setSelected(null);
              }}
              rotate={rotate}
              remove={remove}
              sample={sample}
              setSelected={setSelected}
              setFeedback={setFeedback}
              placeTrain={placeTrain}
              place={place}
              move={move}
            />
          </section>
          <ConductorPanel
            kind={kind}
            start={!!start}
            speed={speed}
            trainStatus={trainStatus}
            tour={tour}
            chooseEngine={chooseEngine}
            changeSpeed={changeSpeed}
            pause={pause}
            play={play}
            stop={stop}
            reverse={reverse}
            horn={() => getAudio().horn(kind)}
            dismissTour={dismissTour}
            tourNext={() =>
              tour === 5
                ? dismissTour()
                : setTour((t) => (t === null ? null : t + 1))
            }
          />
        </div>
        <div className="feedback-strip" role="status" aria-live="polite">
          <span className="feedback-icon">
            <Icon name={network.loops.length ? "check" : "spark"} size={17} />
          </span>
          <p>{feedback}</p>
          <span className="feedback-signoff">HAPPY LITTLE JOURNEYS</span>
        </div>
        <footer className="page-footer">
          <span>
            <Icon name="leaf" size={13} /> Made for curious little conductors.
          </span>
          <span>
            Your imagination. Your railway.{" "}
            <span className="footer-heart">♥</span>
          </span>
        </footer>
      </main>
      {mode === "drive" && (
        <div
          className="mobile-transport"
          role="group"
          aria-label="Quick train controls"
        >
          <span className="mobile-transport-title">
            <Icon name="train" size={20} />
            <span>ALL ABOARD</span>
          </span>
          <button
            className="mobile-play"
            aria-label={trainStatus?.running ? "Pause train" : "Play train"}
            onClick={trainStatus?.running ? pause : play}
          >
            <Icon name={trainStatus?.running ? "pause" : "play"} size={19} />
            {trainStatus?.running ? "Pause" : "Play"}
          </button>
          <button aria-label="Stop train" disabled={!start} onClick={stop}>
            <Icon name="stop" size={18} />
            <span>Stop</span>
          </button>
          <button
            aria-label="Sound train horn"
            onClick={() => getAudio().horn(kind)}
          >
            <Icon name="sound" size={18} />
            <span>Toot!</span>
          </button>
        </div>
      )}
      {confirmClear && (
        <div className="modal-backdrop" onClick={() => setConfirmClear(false)}>
          <section
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setConfirmClear(false);
              if (e.key === "Tab") {
                const focusable =
                  e.currentTarget.querySelectorAll<HTMLButtonElement>("button");
                if (e.shiftKey && document.activeElement === focusable[0]) {
                  e.preventDefault();
                  focusable[focusable.length - 1].focus();
                } else if (
                  !e.shiftKey &&
                  document.activeElement === focusable[focusable.length - 1]
                ) {
                  e.preventDefault();
                  focusable[0].focus();
                }
              }
            }}
          >
            <div className="dialog-icon">
              <Icon name="leaf" size={30} />
            </div>
            <h2 id="clear-title">A fresh little beginning?</h2>
            <p>
              This clears your railway. You can always bring it back with Undo.
            </p>
            <div>
              <button autoFocus onClick={() => setConfirmClear(false)}>
                Keep building
              </button>
              <button
                className="primary-button"
                aria-label="Clear board"
                onClick={clear}
              >
                Clear board
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
