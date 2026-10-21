# Little Railways decision index

Do not reconstruct historic dates/reasons. Existing design decisions and
alternatives live in [docs/design.md](docs/design.md),
[the V1.1 design](docs/superpowers/specs/2026-10-21-v1.1-track-routing-design.md)
and [track-safety verification](docs/track-safety-verification.md). AGENTS.md
records the current geometry, switch-occupancy and persistence contracts.

## 2026-10-21 — shared assistant workflow

- Decision: preserve detailed AGENTS.md and the existing agent.md redirect; add
  thin Claude/Gemini/Copilot adapters and project/task/decision indexes.
- Reason: owner requested consistent standards across assistants without competing
  copies of railway rules or overwriting existing unmerged work.
- Affected: documentation and development workflow only.
- Alternative: replacing existing detailed guidance with a generic template was
  rejected because it would lose verified safety and save-format constraints.

## 2026-10-21 — existing commands in PR-only CI

- Decision: add one read-only-token PR/manual workflow using npm ci, Vitest,
  TypeScript checking, production build, existing Playwright config and shared
  documentation checks. No deployment commands or application configuration edits.
- Reason: these checks are already declared in package.json/configs; no appropriate
  existing Actions workflow was present on audited main.
- Affected: `.github/workflows/quality.yml`, workflow-only checker/tests.
- Actual hosted results must be observed; a configured job is not a passing job.

## 2026-10-22 — MIT licence, feature-named tests and archived release docs

- Decision: the owner chose the MIT Licence for the code (LICENSE on main); the README states it, noting audio is synthesised so there are no third-party assets.
- Decision: rename the `v1.1-*` unit tests and `e2e/v1.1.spec.ts` after the feature they cover (`footprints`, `persistence-migration`, `routing`, `startup`, `switches`, `track-routing`). Contents unchanged; Vitest and Playwright discover them by folder.
- Decision: move finished progress ledgers and reviews (`progress.md`, `review.md`, `v1.1-progress.md`, `v1.1-review.md`) to `docs/archive/`; links in PROJECT.md, TASKS.md, README.md and AGENTS.md updated.
- Not done: a separate CI workflow was dropped because `quality.yml` already runs the same checks on pull requests.
- Affected: tests/, e2e/, docs/, README.md, PROJECT.md, TASKS.md, AGENTS.md, DECISIONS.md. No application code changed.
