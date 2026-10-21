# Little Railways — shared project context

Verified 2026-10-21 against main `44cd95e` (merged incomplete-route safety follow-up).
This is an index to existing detailed documentation, not a second design spec.
Read [README.md](README.md) for controls, architecture, commands and release scope;
[AGENTS.md](AGENTS.md) contains the exact geometry/save/safety invariants.

## Objective and implemented state

A child-friendly, browser-local miniature railway sandbox. Current source in
`lib/railway/`, `components/RailwayGame.tsx` and `components/RailwayBoard.tsx`
implements a 20×20 board, empty startup, straight/curve/crossing tracks, two-cell
switches, track placement/editing/history, actual route connectivity, deterministic
single-train traversal, safe braking/stopping and validated versioned saves.
Crossing axes are independent; only aligned switch routes are traversable.
Track edits remain locked in Drive mode, and occupied switches cannot change.
Existing saves and corrupt-record protection must be preserved.

## Architecture and deployment

Next.js 15 / React 19 / TypeScript, Tailwind and Canvas 2D. `app/` is the shell;
`lib/railway/` is pure geometry/network/editor/simulation/persistence;
`components/` orchestrates UI, rendering and interaction. Vitest tests are under
`tests/`; Playwright desktop/mobile Chromium checks are under `e2e/`.
Actual dependency versions are pinned by package-lock.json; package.json defines
all commands. No account, database, paid API or application credentials are needed.
README describes a Vercel Next.js deployment with browser-local saves. Current
Vercel dashboard/production state is not verified by this workflow task.

## Existing approved design and evidence

- [Original design](docs/design.md), [implementation plan](docs/implementation-plan.md)
  and [release review](docs/archive/review.md).
- [V1.1 approved routing design](docs/superpowers/specs/2026-10-21-v1.1-track-routing-design.md)
  and [progress ledger](docs/archive/v1.1-progress.md).
- [Incomplete-track safety verification](docs/track-safety-verification.md).

These already record detailed decisions and completed milestones. Historical
"feature branch/not merged" delivery notes are snapshots; audit main now contains
the V1.1/safety merges. Do not copy old test counts as fresh results.

## Limits and future considerations

One locomotive is intentional: multi-train collision avoidance, additional
carriages, station/long-track/scenery/challenge scope remains deferred as described
in README. No new feature priority or approval is established here. Physical
Safari/iOS remains unverified; Chromium phone emulation is not device testing.
There is no checked-in CI on the audited baseline; this workflow PR adds PR-only
checks without application or deployment edits. TASKS.md indexes outstanding work;
DECISIONS.md records workflow choices and links existing design evidence.
