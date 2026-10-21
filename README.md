# Little Railways — My Train Set

A playable, browser-local miniature railway sandbox. Build a railway from straight, curved, crossing and switching tracks, place an original locomotive, and watch it follow the railway you actually made.

## Run locally

Requires Node.js 20.9 or newer (Node 22 or 24 LTS recommended).

```sh
git clone https://github.com/Harrisonxaph/Train-simulator.git
cd Train-simulator
npm ci
npm run dev
```

Open **http://localhost:3000**. No account, API key, backend, external artwork or paid service is needed. Dependencies are free and open source. For a production server:

```sh
npm run build
npm start
```

## Play

New players start with an empty grassy board and no locomotive. Build some track, choose an engine, place it on the railway, then press **Play**. The **Sample railway** button still loads the complete Meadow Loop and steam engine when you want an immediate ride. Existing valid saved railways load automatically.

- **Build:** choose Straight, Curve, Crossing, Left switch or Right switch, then tap a grassy square or drag from the building box. Pieces snap to exact grid positions; green endpoint highlights confirm compatible connections. Rotate changes the next piece’s orientation.
- **Select:** tap a piece to select it, drag to move it, or use Rotate and Remove. Invalid drops and drops outside the board leave the railway unchanged.
- **Crossings:** the horizontal and vertical rails are independent. Trains travel straight across; they never turn onto the intersecting line. When placing an engine directly on a crossing, tap near the desired rail or choose its route in Place by grid.
- **Switches:** left and right switches occupy two cells. Select one or use **Switch to control**, then choose **Straight** or **Branch**. Only the aligned route is traversable, including reverse entry. Controls remain available in Drive mode, but a switch cannot change while the engine or its overhang occupies it.
- **Pan:** drag the view. Zoom with the +/− buttons or mouse wheel. Fit shows the whole 20 × 20 board. Holding Shift or using the middle mouse button also pans.
- **Undo / Redo:** recover up to 50 construction actions. New clears the board after confirmation; Undo can restore it. The sparkle button loads the sample railway, and Undo can restore the previous layout.
- **Drive:** choose the steam, diesel or electric engine and tap any track to place it. Only one locomotive runs at a time. Construction tools are locked in Drive mode.
- **Play / Pause:** start or freeze the train. On phones, a fixed quick-control bar keeps Play/Pause, Stop and Horn reachable while viewing the board. **Stop / Reset** return it to its saved starting point. **Reverse** works while paused. Slow, Normal and Fast change its target speed. Open tracks are allowed: the train brakes and stops at the end, with a gentle cue and subtle endpoint marker. Reverse returns along the same route. Switch to Build and extend the railway; editing other pieces preserves the paused engine’s position so Play can continue forward. Changing or removing its occupied geometry clears placement safely.
- **Horn:** each engine has an original synthesised sound. The top speaker button mutes sound and remembers your preference. There is no background music.
- **Save / Load:** use the disk and folder buttons. Valid layouts also save automatically after 600 ms without a change. Save data belongs to this browser and origin; clearing browser storage removes it. Load restores the current saved snapshot, not a separate backup slot.

### Keyboard and accessibility

Controls have accessible names and visible focus rings. Expand **Place by grid**, enter a column and row (1–20), then place a track. Select mode lets the same form select a piece; a selected piece can be moved to the entered grid position. After choosing an engine, the form places it on an existing track. With the board focused: **R** rotates, **Delete/Backspace** removes the selection, **Ctrl/Cmd+Z** undoes, **Ctrl/Cmd+Shift+Z** redoes, arrow keys pan, +/− zoom, and Escape cancels the current gesture. The clear confirmation supports Escape and traps keyboard focus. A skippable six-step guide introduces construction and driving.

## Implemented release scope

**Milestones 1 and 2 are implemented**, with selected Milestone 3 features:

- Canvas board with separate world/screen coordinates, responsive camera, mouse/touch/pen pointer events, valid/invalid ghosts and endpoint feedback.
- Straight, circular quarter-curve and independent crossing paths, plus two-cell left/right switches in every rotation; full footprints enforce occupied cells and board bounds.
- Explicit endpoint positions and outward tangents; compatible endpoint graph, connected components, open ends and complete loop detection.
- Distance-based, frame-rate-independent train traversal along actual constructed geometry, smooth tangent headings, overshoot between segments, safe end stops and repeated loop laps.
- Three original locomotive designs, steam smoke, transport controls and synthesised feedback.
- Build/Drive separation, 50-action history, sample layout, tutorial, versioned save validation, manual and automatic local saving, persistent train choice/start and mute.
- Visibility interruption recovery, cancelled gesture recovery, resize handling and an application error boundary.
- Cached static scenery/track rendering, capped device pixel ratio and animation refs instead of frame-by-frame React state updates. Decorative trees and a pond are ambient artwork, not placeable scenery.

A train on a single isolated track is permitted and stops safely at its endpoint. Removing its starting track clears the train placement; moving or rotating its track resets it safely. No collision system for multiple trains is claimed: only one train exists, and track overlap is rejected.

A versioned example save is included at `examples/meadow-loop.json`; the live sample is generated by `lib/railway/sample.ts`.

## Tests

```sh
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Vitest covers endpoints, every rotation, circular interpolation, compatible/incompatible connections, loops, open ends, bounds/overlap, history, save round trips and corrupt saves, forward/reverse traversal, safe stopping, repeated laps and acceleration at different frame rates.

Playwright runs the same acceptance checks in desktop Chromium and Chromium with an iPhone-sized touch viewport. It loads and drives the sample, constructs an oval through the real editor, completes a lap, pauses/resets, drags/moves/rotates/removes tracks, cancels invalid and interrupted gestures, uses keyboard grid placement, checks Drive locks, restores saved data, preserves corrupt saves, handles hidden-tab time and resizes to portrait/landscape. Phone emulation does **not** claim physical iOS/Safari validation.

In restricted environments, set `PLAYWRIGHT_BROWSERS_PATH` to a writable directory for both browser installation and test execution. This project was checked with `/tmp/little-railways-browsers`; ordinary local installations can use Playwright’s default cache.

## Verified in this workspace

- **127/127 Vitest tests pass.**
- **44 Playwright checks pass** against the production build in desktop and phone-sized Chromium. Two phone-only checks (quick controls and touch palette swiping) intentionally skip the desktop project.
- TypeScript checking and `next build` pass.
- Browser acceptance covers creating an oval, detecting its loop, placing an engine, completing a lap, pausing, resetting, editing and saving. The pure simulator test continues for at least six laps.
- V1 sample-animation QA observed approximately 60 frames/second in headless Chromium. V1.1 desktop/phone visual checks reported no runtime errors or horizontal page overflow; this is not a physical-device benchmark.
- Both review findings in `docs/review.md` were reproduced failing before the fixes and pass in the final browser suite.

## Architecture

| Module | Responsibility |
| --- | --- |
| `lib/railway/types.ts` | Shared tracks, endpoints, graph, train and save types |
| `geometry.ts` | Quarter-turn transforms, endpoints and distance-to-pose sampling |
| `network.ts` | Position/tangent matching and component/loop analysis |
| `editor.ts`, `footprints.ts` | Multi-cell placement constraints and immutable undo/redo |
| `switches.ts` | Live switch occupancy and safe route changes |
| `simulation.ts` | Pure delta-time integration and graph traversal |
| `persistence.ts` | Versioned, bounded save validation |
| `sample.ts` | Connected sample oval |
| `components/RailwayGame.tsx` | Commands, application state and persistence orchestration |
| `RailwayBoard.tsx` | Camera, pointer gestures, resize and animation lifecycle |
| `BuildingBox.tsx`, `ConductorPanel.tsx` | Accessible construction and driving controls |
| `lib/rendering.ts`, `lib/audio.ts` | Original procedural visuals and sounds |

World units equal one grid cell. A straight is one unit long; a curve has radius 0.5 and length π/4. Endpoints connect only at equal positions (tolerance 10⁻⁶) with opposing tangents. Crossings contain two independent paths. Switches have a length-2 straight path and a length-1 + π/4 branch (straight approach followed by a radius-0.5 arc). The graph distinguishes physical ports from active traversal paths and is rebuilt after track or alignment changes, never each animation frame. Simulation consumes remaining distance across linked segments and derives heading from each path’s tangent. Large display-time gaps are capped at the animation boundary; tab visibility resets its timestamp.

Save version 2 validates every field, track ID, rotation, multi-cell footprint, active path and starting distance, and persists switch alignment. Version 1 saves migrate in memory without discarding user progress. Saves explicitly marked as automatically generated demo data start empty while preserving the original record until an explicit Save, sample or New action. Unmarked legacy layouts are preserved because their provenance cannot be determined safely. Invalid loads preserve the current board. A corrupt saved record encountered on startup or manual Load is preserved and autosaving disabled until an explicit Save, sample load or new board action replaces it. Storage failure leaves the game playable and reports the saving limitation.

## Deploy to Vercel

1. Put the contents of this `little-railways` directory in a Git repository and import it into Vercel. If the repository contains the surrounding workspace, set **Root Directory** to `little-railways`.
2. Select the **Next.js** framework preset. Use `npm ci` to install and `npm run build` to build. Keep the default Next.js output directory.
3. Choose a supported Node.js version (22 or 24), then deploy. There are no environment variables, database migrations or external service credentials.

The result can use Vercel’s free tier subject to its terms. Saving remains local to each visitor’s browser. V1.1 is delivered on a feature branch for review; merging into the production branch can trigger the existing Vercel Git deployment.

## Genuinely outstanding

The approved first release deliberately defers Milestone 4: two-cell long straights, station track/platform and station building, placeable scenery, three railway challenge badges, additional trains/carriages and train-to-train collision avoidance. Consequently, the sample oval has no station yet. Advanced magnetic auto-rotation is also absent: snapping preserves the orientation the player chooses.

For a future update, add station and long-track geometry using the existing multi-cell footprints. Add challenges once lap events and user-built completion rules have a persistent progression model. Test physical iPhones/iPads with Safari and add pinch-to-zoom and optional offline/PWA installation before expanding the world.

## Coding agents

Read [AGENTS.md](./AGENTS.md) before changing the project. [agent.md](./agent.md) points to the same guide under the additionally requested filename.
