# Little Railways Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for inline execution or superpowers:subagent-driven-development for delegated execution. Track steps below as work proceeds.

**Goal:** Deliver a playable railway editor and simulator completing Milestones 1 and 2, with a sample oval and local persistence.

**Architecture:** Next.js presents accessible React controls around a Canvas 2D board. Pure TypeScript modules own railway geometry, connections, simulation, placement, history and save validation. Animation state stays outside React's render cycle.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Canvas 2D, Vitest, Playwright and LocalStorage.

**Spec:** [Approved design](design.md).

## Global Constraints

- The board has 20 by 20 cells.
- Only one track may occupy a cell.
- Maintain at least 50 undo actions and redo until a new edit.
- Drive mode locks track editing.
- No backend, authentication, paid services or external assets are required.
- Do not create a hosted Sites project as part of this local build.
- Stations, long pieces, scenery, challenges and junctions belong to a subsequent expansion and must not appear as nonfunctional controls.

## Review Focus

- Cancelling a pointer gesture must leave tracks and history unchanged.
- Loading malformed or overlapping saved tracks must preserve the current valid layout.
- Returning from a background tab must not advance the train by the hidden duration.
- Editing a railway must invalidate train positions on removed segments safely.
- Movement across many segments in one update must preserve distance and never jump components.

## File Structure

- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`: application shell and responsive styling.
- `components/RailwayGame.tsx`: mode, editing actions, controls and persistence integration.
- `components/RailwayBoard.tsx`: pointer gestures, camera, resize and animation lifecycle.
- `lib/railway/types.ts`: shared geometry, graph, layout and simulation types.
- `lib/railway/geometry.ts`: endpoints, rotation, path lengths and sampling.
- `lib/railway/network.ts`: connection compatibility, graph and connected components.
- `lib/railway/editor.ts`: placement validation and immutable history.
- `lib/railway/simulation.ts`: deterministic train traversal.
- `lib/railway/persistence.ts`, `sample.ts`: validated saves and sample layout.
- `lib/rendering.ts`, `lib/audio.ts`: procedural board/vehicle graphics and synthesised sounds.
- `tests/*.test.ts`, `e2e/railway.spec.ts`: unit and browser acceptance tests.
- `README.md`: setup, controls, deployment, status and future work.

### Task 1: Tested track geometry and network

**Files:** package/configuration files; `lib/railway/{types,geometry,network,sample}.ts`; `tests/geometry.test.ts`; `tests/network.test.ts`.

**Interfaces:**
- `Track = { id: string; type: 'straight' | 'curve'; x: number; y: number; rotation: 0 | 1 | 2 | 3 }`.
- `Endpoint = { pieceId: string; end: 0 | 1; x: number; y: number; dx: number; dy: number }`.
- `endpoints(track: Track): [Endpoint, Endpoint]`, `pathLength(track: Track): number`, `samplePath(track: Track, distance: number): { x: number; y: number; heading: number }`.
- `compatible(a: Endpoint, b: Endpoint): boolean`, `buildNetwork(tracks: Track[]): Network`.
- `Network` exposes endpoint adjacency, connected component IDs, open endpoints and closed components. `sampleLayout()` returns a complete oval.

- [x] Scaffold dependencies and scripts for dev, build, typecheck, unit tests and E2E tests. Keep dependencies limited to the requested stack.
- [x] Write failing unit tests: straight endpoints are opposite cell-edge midpoints; curve endpoints are adjacent; all rotations preserve lengths and rotate tangents; equal-position opposed tangents connect; equal-position aligned tangents do not; separated endpoints do not connect; sample oval is one closed component; removing a sample piece creates two open ends; isolated tracks remain separate components.
- [x] Run `npm test -- tests/geometry.test.ts tests/network.test.ts`; confirm failure before implementation.
- [x] Implement explicit geometry with a cell size of one world unit and a half-cell curve radius. Use circular arc sampling, quarter-turn transforms and an endpoint tolerance of `1e-6`. Build adjacency from compatible endpoints and components by graph traversal.
- [x] Run the two suites and `npm run typecheck`; require passes.

### Task 2: Editing, history and safe saving

**Files:** `lib/railway/editor.ts`, `lib/railway/persistence.ts`, `tests/editor.test.ts`, `tests/persistence.test.ts`.

**Interfaces:**
- `canPlace(tracks: Track[], candidate: Track, ignoreId?: string): boolean` rejects noninteger coordinates, bounds violations and occupied cells.
- `History` contains `past`, `present` and `future` track arrays; `commit(history, tracks)`, `undo(history)`, `redo(history)` return immutable history values.
- `SavedLayout` contains `version: 1`, tracks, selected train type, nullable starting track position and mute preference.
- `encodeSave(layout: SavedLayout): string`, `decodeSave(raw: string): SavedLayout` throw descriptive validation errors without altering caller state.

- [x] Write failing tests for all four board boundaries, overlap, allowed adjacent placement, moving while ignoring the original ID, undo/redo, history capacity of 50 and future invalidation after a new edit.
- [x] Write failing save tests for round trip, corrupt JSON, wrong versions, duplicate IDs, invalid rotations, overlapping cells, missing train segment and oversized track arrays.
- [x] Run these suites and confirm failures, implement the modules, then require passing tests and typecheck.
- [x] Save validation accepts at most 400 tracks, validates finite numeric train positions against segment length, and never mutates supplied data. Keep the existing board if a manual load fails.

### Task 3: Deterministic train simulator

**Files:** `lib/railway/simulation.ts`, `tests/simulation.test.ts`.

**Interfaces:**
- `TrainState` stores piece ID, distance, direction (`1 | -1`), speed, target speed, running state and lap count.
- `advanceTrain(state: TrainState, tracks: Track[], network: Network, dt: number): TrainState` returns the next state without mutating inputs.
- `trainPose(state: TrainState, tracks: Track[]): { x: number; y: number; heading: number } | null` samples the current track and traversal direction.

- [x] Write failing tests for movement on a straight, an arc midpoint, forward/reverse segment entry, overshoot through multiple segments, safe stopping at both open ends, repeated sample laps, disconnected nearby tracks, pause and a deleted current segment.
- [x] Run the simulator suite and confirm failures.
- [x] Implement delta-time distance integration, acceleration toward the target, adjacency traversal with remaining distance, tangent-aligned orientation and safe endpoint clamping. Reject nonfinite or negative time; bound time at the animation boundary and bound traversal iterations defensively.
- [x] Run all unit tests and typecheck; require passes.

### Task 4: Playable Canvas editor

**Files:** `app/{layout,page}.tsx`, `app/globals.css`, `components/{RailwayGame,RailwayBoard}.tsx`, `lib/rendering.ts`, initial `e2e/railway.spec.ts`.

**Interfaces:** Board receives tracks, tool, rotation, selected track, camera, editing callbacks and train simulation references. Camera uses `screen = world * scale + offset`; invert that transform for pointer input. Rendering consumes geometry samples from Task 1.

- [x] Write browser tests for placing straight and curved pieces, invalid overlap, rotating, moving, deleting, undo/redo and cancelling a drag outside the board. Use accessible control names and observable board coordinates.
- [x] Build the responsive shell and procedural miniature railway rendering: grass, grid, sleepers, two rails, endpoint feedback, selection and placement ghost.
- [x] Implement palette drag plus tap placement, pointer capture, cancelled-gesture recovery, selection/move, valid rotation, delete, confirmed clear and history controls. Commit only valid completed gestures.
- [x] Implement pan, zoom and fit with explicit world/screen conversion, ResizeObserver and capped device-pixel ratio. Provide keyboard rotation/deletion and labelled large buttons.
- [x] Run browser editor tests where available and typecheck. Verify portrait and desktop layouts. If a browser cannot run, record the precise limitation rather than claiming a pass.

### Task 5: Drive controls, sample and persistence integration

**Files:** `components/{RailwayGame,RailwayBoard}.tsx`, `lib/rendering.ts`, `lib/audio.ts`, `e2e/railway.spec.ts`.

**Interfaces:** React owns mode and commands; a ref owns live TrainState. requestAnimationFrame passes elapsed seconds into `advanceTrain`. A throttled read-only board status exposes current train position and running state for accessibility and acceptance tests.

- [x] Add failing E2E coverage for sample loading, steam selection, track placement of the train, Play, changing position, Pause, stable paused position and Stop restoring the start.
- [x] Implement steam/diesel/electric procedural designs and selection. Place a train only by selecting a valid track. Build/Drive mode switching pauses safely; Drive prevents construction edits.
- [x] Wire Play, Pause, Stop, Reverse while paused, Reset train and Slow/Normal/Fast controls to real simulation state. Reset timestamps on visibility changes and cancel animation on unmount. Safely clear invalid train placements after edits.
- [x] Integrate automatic and manual versioned saving/loading. Guard unavailable storage and preserve corrupt saved data until an explicit user save or recovery choice. Start new players with the sample oval and train; offer confirmed empty-board creation.
- [x] Add skippable six-step guidance, loop celebration, muted/unmuted synthesised placement and locomotive horns. Initialise audio only after interaction and persist mute.
- [x] Add browser tests for refresh persistence, malformed saved data, Drive editing lock and background/resume timestamp handling. Run all available suites and typecheck.

### Task 6: Release verification and documentation

**Files:** `README.md`, relevant configuration and test fixes.

- [x] Run `npm test`, `npm run typecheck`, `npm run build` and `npm run test:e2e` where supported. Resolve failures and rerun affected checks.
- [x] Exercise the acceptance sequence: construct an oval using straight/curve tools, observe loop detection, place a steam train, complete repeated laps, pause/stop, edit and save. Record which actions were tested automatically and which manually.
- [x] Review changed TSX components for hooks, accessibility, event cleanup and animation rerenders. Review geometry invariants and invalid-input recovery against the approved spec.
- [x] Write README commands, controls, architecture, tests and Vercel deployment instructions. List expansion features explicitly as outstanding. State browser-verification limitations if any.
- [x] Report completion only for verified implemented features, with exact test results and remaining work.

## Plan self-review

All approved design sections map to Tasks 1–6. No junction/scenery/long-piece placeholders enter the first release. Review-focus cases map respectively to Tasks 4, 2/5, 5, 3/5 and 3. All module signatures above share the same Track and TrainState definitions.
