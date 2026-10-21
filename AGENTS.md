# Agent guide — Little Railways

This file guides coding agents working anywhere in this repository. Read `README.md` first for setup, controls, release scope and deployment.

## Product and current scope

Little Railways — My Train Set is a child-friendly, bird’s-eye railway construction game. A player builds tracks and runs a locomotive along the actual connected geometry. Preserve the working Milestones 1 and 2 release and its selected polish features.

Implemented: straight/quarter-curve/crossing tracks and two-cell left/right switches, a 20 × 20 board, pointer and keyboard placement, grid snapping and endpoint feedback, movement/rotation/deletion, 50-action undo/redo, explicit connectivity and loop detection, three locomotive designs, one running train, transport controls, sample oval, tutorial, synthesised audio and validated LocalStorage saves.

Deferred: long multi-cell tracks, station tracks, placeable scenery, challenges, additional trains/carriages and train-to-train collisions. Ambient trees and pond artwork are decorative. Do not present deferred features as complete or add nonfunctional controls.

## Stack and commands

Use Next.js, React, TypeScript, Tailwind CSS and Canvas 2D. Keep runtime state browser-local; no account, paid API, server database or credentials are required. Use Node.js 20.9+; Node 22 or 24 is recommended.

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright projects cover desktop Chromium and an iPhone-sized Chromium touch viewport. Physical Safari/iOS remains unverified. The quick phone transport test intentionally skips the desktop project. If necessary, set `PLAYWRIGHT_BROWSERS_PATH` to a writable directory for both installation and execution.

Do not run `next dev` and `next build` concurrently against the same `.next` directory. Stop the development server before building. To exercise production, run `npm start` after a successful build.

## Code map

- `app/`: page, layout, global styling, icon and error boundary.
- `components/RailwayGame.tsx`: commands, history integration, modes, train state and saving.
- `components/RailwayBoard.tsx`: camera, pointer lifecycle, resizing and animation.
- `components/BuildingBox.tsx`, `ConductorPanel.tsx`: construction and driving UI.
- `lib/railway/types.ts`: shared types.
- `lib/railway/geometry.ts`: transforms, endpoints, path length and distance sampling.
- `lib/railway/network.ts`: compatible connections, graph, components and loops.
- `lib/railway/editor.ts`: placement validation and immutable history.
- `lib/railway/simulation.ts`: deterministic train traversal.
- `lib/railway/persistence.ts`: versioned save encoding and validation.
- `lib/railway/sample.ts`, `examples/meadow-loop.json`: sample oval and example save.
- `lib/rendering.ts`, `lib/audio.ts`: procedural visuals and synthesised feedback.
- `tests/`: Vitest railway logic tests. `e2e/`: Playwright acceptance tests.
- `docs/`: approved design, implementation plan and release review notes.

## Railway invariants

- Keep gameplay logic independent of React, Canvas and browser APIs wherever practical.
- World units equal grid cells. Straights have length 1; quarter-curves have radius 0.5 and length π/4.
- Endpoint connections require matching positions within 10⁻⁶ and opposing outward tangents. Nearby drawings alone never constitute a connection.
- Preserve integer placement, board bounds and non-overlapping full footprints. Switches occupy two rotated cells; retain anchor offsets when dragging the second cell.
- Crossings have two independent paths; never connect perpendicular routes. Switches expose only their active path. Reverse traversal requires alignment.
- Switch controls use the live train ref and protect the engine body including nose/tail overhang. Never change points under an occupied train.
- Build the network after construction or alignment changes, never on every animation frame.
- Advance trains by distance and delta time over the real graph. Preserve overshoot and correct entry direction at transitions. Never jump to an unrelated segment.
- Stop safely at open ends. Allow only one locomotive until a tested occupancy/collision system exists.
- Keep track editing locked in Drive mode. Track removal and history restoration must revalidate the train’s starting segment **and distance against the restored path length**, including reused IDs after loading.
- Pause animation-time accumulation across hidden tabs; cancel interrupted pointer gestures without committing edits.
- Keep world-to-screen camera transformations separate from railway geometry. Cap device pixel ratio and retain the cached static Canvas layer.

## Saving and history

- Keep saves versioned and validate types, IDs, coordinates, rotations, duplicate cells and train position before applying them.
- Write version 2 with path IDs, switch alignment and provenance; migrate version 1 safely. Preserve unmarked legacy layouts. Only records explicitly marked auto-demo may start empty without loading their tracks; preserve their storage until explicit replacement.
- On a corrupt record at startup **or manual Load**, preserve the current playable board and suspend autosaving. Replace the record only following an explicit Save, sample load or new-board action.
- Storage failures must not prevent playing. Never commit credentials or private browser data.
- Keep construction updates immutable and preserve undo/redo semantics; a new edit clears redo.

## UI and accessibility

- Use original procedural train/scenery designs and free dependencies. No copyrighted train characters, ads, login gates or external links in the game interface.
- Use short labels, clear icons, visible focus states, touch-sized controls and friendly feedback.
- Preserve mouse, touch and pen pointer events, pointer cancellation, tap-to-place and the keyboard grid-placement alternative.
- Prevent browser scrolling only on interactive drawing/dragging surfaces. Keep page scrolling usable elsewhere.
- Keep phone transport controls reachable while viewing the board. Respect reduced-motion preferences for nonessential UI effects.
- Initialise audio only after interaction, preserve mute preferences and keep background music off.

## Verification and delivery

- Inspect existing code and relevant tests before changing behavior. Keep changes focused; do not rewrite working systems unnecessarily.
- Add regression coverage for geometry, simulation or persistence fixes. Run the affected tests, then the full unit suite, TypeScript check and production build.
- For editor, camera or transport changes, run the relevant Playwright checks in desktop and phone contexts. Do not describe Chromium phone emulation as physical iOS testing.
- Preserve the acceptance sequence: construct an oval, recognise its loop, place a steam engine, Play through repeated laps, Pause/Stop, edit and save/reload.
- Report actual commands/results and any verification limits. Update README when controls, commands, save format, scope or deployment instructions change.
- Keep `node_modules`, `.next`, browser caches, test reports and local secrets out of Git. Commit the lockfile.
- Deployments, pushes and external service changes require user authorization; follow any authorization already given in the session without asking again.
