"use client";
import type { TrainKind, TrainState } from "@/lib/railway/types";
import { Icon } from "./Icon";
import { TrainPreview } from "./TrackPreview";
import { engines, tourSteps } from "./game-content";
type Props = {
  kind: TrainKind;
  start: boolean;
  speed: number;
  trainStatus: TrainState | null;
  tour: number | null;
  chooseEngine: (k: TrainKind) => void;
  changeSpeed: (n: number) => void;
  pause: () => void;
  play: () => void;
  stop: () => void;
  reverse: () => void;
  horn: () => void;
  dismissTour: () => void;
  tourNext: () => void;
};
export function ConductorPanel({
  kind,
  start,
  speed,
  trainStatus,
  tour,
  chooseEngine,
  changeSpeed,
  pause,
  play,
  stop,
  reverse,
  horn,
  dismissTour,
  tourNext,
}: Props) {
  const isRunning = !!trainStatus?.running;
  return (
    <aside className="conductor-panel">
      <section className="engine-section">
        <div className="panel-title">
          <div>
            <span className="eyebrow">YOUR TRAVELLING COMPANION</span>
            <h2>Meet your engine.</h2>
          </div>
          <span className="collection-count">
            {String(engines.findIndex((e) => e.kind === kind) + 1).padStart(
              2,
              "0",
            )}{" "}
            / 03
          </span>
        </div>
        <div
          className="engine-collection"
          role="group"
          aria-label="Choose a locomotive"
        >
          {engines.map((e) => (
            <button
              key={e.kind}
              className={`engine-card ${kind === e.kind ? "selected" : ""}`}
              aria-label={e.name}
              aria-pressed={kind === e.kind}
              onClick={() => chooseEngine(e.kind)}
            >
              <div className={`engine-art ${e.kind}`}>
                <TrainPreview kind={e.kind} />
              </div>
              <div className="engine-name">
                <strong>{e.nickname}</strong>
                <span>
                  {e.kind === "steam"
                    ? "Classic steam"
                    : e.kind === "diesel"
                      ? "Diesel locomotive"
                      : "Electric passenger"}
                </span>
              </div>
              <span className="engine-radio">
                {kind === e.kind && <Icon name="check" size={11} />}
              </span>
            </button>
          ))}
        </div>
        <p className="engine-hint">
          <Icon name="cursor" size={14} /> Choose an engine, then tap a track.
        </p>
      </section>
      <section className="drive-section" aria-label="Train controls">
        <div className="drive-heading">
          <h3>Ready to roll?</h3>
          <span className={`running-badge ${isRunning ? "running" : ""}`}>
            <span />
            {isRunning ? "ON THE MOVE" : start ? "ALL SET" : "ADD AN ENGINE"}
          </span>
        </div>
        <div className="speed-label">
          <span>Set your pace</span>
          <span
            className="speed-bars"
            aria-label={`Speed: ${speed === 1 ? "Slow" : speed === 2 ? "Normal" : "Fast"}`}
          >
            <i />
            <i className={speed >= 2 ? "filled" : ""} />
            <i className={speed >= 4 ? "filled" : ""} />
          </span>
        </div>
        <div className="speed-options" role="group" aria-label="Train speed">
          {[
            { label: "Slow", value: 1 },
            { label: "Normal", value: 2 },
            { label: "Fast", value: 4 },
          ].map((s) => (
            <button
              key={s.value}
              className={speed === s.value ? "active" : ""}
              aria-pressed={speed === s.value}
              onClick={() => changeSpeed(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="play-controls">
          <button
            className="play-button"
            aria-label={isRunning ? "Pause" : "Play"}
            onClick={isRunning ? pause : play}
          >
            <Icon name={isRunning ? "pause" : "play"} size={20} />
            {isRunning ? "Pause" : "Let’s go!"}
          </button>
          <button
            className="stop-button"
            aria-label="Stop"
            title="Stop and return to the start"
            disabled={!start}
            onClick={stop}
          >
            <Icon name="stop" />
          </button>
        </div>
        <div className="extra-controls">
          <button aria-label="Horn" onClick={horn}>
            <Icon name="sound" size={18} />
            <span>{kind === "steam" ? "Toot toot!" : "Horn"}</span>
          </button>
          <button
            aria-label="Reverse"
            disabled={!start || isRunning}
            onClick={reverse}
          >
            <Icon name="reverse" size={18} />
            <span>Reverse</span>
          </button>
          <button aria-label="Reset train" disabled={!start} onClick={stop}>
            <Icon name="reset" size={18} />
            <span>Reset</span>
          </button>
        </div>
        <div
          role="note"
          aria-label="Train status"
          data-testid="train-status"
          data-piece={trainStatus?.pieceId || "none"}
          data-stop-reason={trainStatus?.stopReason || "none"}
          data-path={trainStatus?.pathId || "main"}
          className="train-telemetry sr-only"
          data-position={
            trainStatus
              ? `${trainStatus.pieceId}:${trainStatus.distance.toFixed(3)}`
              : "none"
          }
          data-running={String(isRunning)}
          data-laps={trainStatus?.laps || 0}
        >
          {isRunning ? "Train moving" : "Train paused"}.{" "}
          {trainStatus?.laps || 0} laps.
        </div>
      </section>
      {tour !== null ? (
        <section className="tour-card" aria-label="Interactive tutorial">
          <div className="tour-top">
            <span>
              <Icon name="spark" size={15} /> LITTLE CONDUCTOR’S GUIDE
            </span>
            <button aria-label="Skip tour" onClick={dismissTour}>
              <Icon name="close" size={15} />
            </button>
          </div>
          <div className="tour-progress">
            {tourSteps.map((_, i) => (
              <i className={i <= tour ? "done" : ""} key={i} />
            ))}
          </div>
          <h3>{tourSteps[tour].title}</h3>
          <p>{tourSteps[tour].text}</p>
          <div className="tour-footer">
            <span>STEP {tour + 1} OF 6</span>
            <button onClick={tourNext}>
              Next <Icon name="arrow" size={14} />
            </button>
          </div>
        </section>
      ) : (
        <section className="quiet-card">
          <div className="quiet-illustration" aria-hidden="true">
            <Icon name="leaf" size={31} />
            <span>✦</span>
          </div>
          <h3>
            There’s no wrong way
            <br />
            to take the scenic route.
          </h3>
          <p>
            Make a loop, follow a bend,
            <br />
            see where your imagination goes.
          </p>
        </section>
      )}
    </aside>
  );
}
