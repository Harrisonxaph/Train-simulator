# Little Railways — first playable release

Status: approved by the user. Implemented scope and verification are recorded in README.md.

## Goal and release boundary

Build a child-friendly, mobile railway sandbox in which a player constructs a real connected railway and runs a locomotive along its geometry. Complete Milestones 1 and 2 first. Include a sample oval, three locomotive appearances, local saving, basic synthesised sound and concise onboarding if the core release is stable. Stations, long pieces, scenery, challenges and junctions belong to a subsequent expansion and must not appear as nonfunctional controls.

## Architecture

Use Next.js, React, TypeScript and Tailwind. Render the board with Canvas 2D; React renders accessible controls. Use React state for construction and a mutable simulation state for animation. No backend, authentication, paid services or external assets are required. Keep the project runnable locally and deployable to Vercel. Do not create a hosted Sites project as part of this local build.

Separate modules implement geometry, placement, graph construction, simulation, history, persistence, audio and rendering. Geometry and simulation are pure TypeScript and have no React or DOM dependency. Canvas animation uses requestAnimationFrame and does not rerender React every frame.

## Board and editing

The board has 20 by 20 cells. Each track occupies one cell in this release. A straight joins opposite edge midpoints; a curve is a circular quarter arc joining adjacent edge midpoints with matching endpoint tangents. Four quarter-turn rotations are supported. Only one track may occupy a cell.

Build mode provides straight, curve, select/move and pan tools. Toolbar pieces support dragging and tap-to-place. A translucent ghost displays valid or invalid placement. Grid snapping aligns piece origins; compatible endpoint matches receive a visible highlight. Empty endpoints remain allowed. Reject out-of-bounds placement and occupied cells without changing history.

Selecting a track exposes rotation and deletion. A move is one atomic history action. Maintain at least 50 undo actions and redo until a new edit. Clearing the board requires confirmation. Camera zoom and pan operate in screen space independently of world geometry, with pointer capture and touch-action suppression confined to the board. Keyboard controls and labelled large buttons provide alternatives to dragging.

## Connections and routes

Each endpoint contains position, outward tangent and piece identifier. Join endpoints only when their positions match within a small numerical tolerance and tangents oppose. Graph edges represent track paths; adjacency records the next piece and which end is entered. Rebuild the graph only after construction changes.

Calculate connected components, open ends and closed components. For the initial two-endpoint pieces, a component is a valid loop when every endpoint is matched. Announce loop completion with friendly feedback. Disconnected components never connect through proximity alone.

## Locomotive simulation

A locomotive stores current piece, distance, traversal direction, speed, target speed, state and starting position. A path sampler returns world position and tangent for any distance. Straights use linear interpolation and curves use circular interpolation.

Advance distance using bounded delta time. Consume remaining distance across connected pieces, orient traversal by the entered endpoint and preserve overshoot. Open ends clamp motion to the endpoint and stop safely. A traversal guard prevents malformed graphs causing infinite update loops. Pausing the tab resets the animation timestamp so returning does not cause a large jump.

Drive mode locks track editing. Selecting a locomotive and tapping track sets its start position. Play validates placement, Pause freezes immediately, Stop resets to the start, Reverse changes direction while paused, and speed controls set slow, normal or fast targets. Reset train restores its starting location. Sample loading provides a connected oval and an already placed locomotive.

## Presentation and feedback

Use a soft grassy board, subtle texture, wooden sleepers, metallic double rails, shadows and original colourful locomotive drawings. Keep the board central, the compact utility controls above it and a large track palette below it. Adapt controls for phone portrait and tablet/desktop layouts. Draw all assets procedurally.

Use brief messages for invalid placement, missing train placement, open ends, saves and loop completion. Synthesise placement clicks and locomotive horns after interaction. Persist mute state. Background music is absent. Introduce the select/place/curve/loop/train/play flow with skippable guidance.

## Persistence and recovery

Use versioned LocalStorage data containing track types, integer positions, rotations, selected locomotive, starting track position and mute preference. Validate schema, bounds, identifiers, uniqueness and overlap before accepting a load. Corrupt data produces a friendly recovery message and a playable sample without silently overwriting the corrupt record. Handle unavailable storage without crashing. Manual Save and Load accompany debounced autosaving.

## Verification and delivery

Vitest covers straight and curve endpoints, rotation, compatible and incompatible connections, placement rejection, loop and open-end detection, straight and curve motion, segment transitions, safe end stopping, repeated loop traversal, save round trips, invalid saves and undo/redo. Junction testing is deferred with junction implementation.

Provide a Playwright test loading the sample, placing a locomotive, playing, asserting its position changes and pausing. Expose a read-only status suitable for observing simulation without screen-coordinate assumptions. Run unit tests, TypeScript checks and production build. Run Playwright where browser support is available and explicitly report any unavailable verification.

Deliver source, package configuration, sample layout, tests and README with local setup, controls, Vercel instructions, completed features, outstanding expansion work and future recommendations. A release is accepted only after a train repeatedly traverses a constructed loop without leaving its tracks.
