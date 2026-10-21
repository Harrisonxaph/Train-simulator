# SDD ledger — plan: /workspace/docs/superpowers/plans/2026-10-21-little-railways.md
Execution: inline, approved by user.
Ruling: /workspace has no actual Git repository (empty read-only .git stub). Use the new isolated /workspace/little-railways project and its own Git repository; keep design and plan in /workspace/docs. Cost: no history from the surrounding workspace can be linked.
Pre-flight: Task 1 Track/Network consumed by Tasks 2–5; types consistent.
Pre-flight: Task 2 SavedLayout and Task 3 TrainState share a starting track position; persistence will save only start, never moving state.
Pre-flight: Task 4 camera and Task 5 simulation share world units; render conversion stays at Canvas boundary.
Task 1: in progress.
Task 1: complete — geometry and network suites passed, typecheck passed.
Task 2: complete — editor and save suites passed, typecheck passed.
Task 3: complete — simulator suite passed; full suite 48/48 green after observed RED (47 failing, corrupt-JSON rejection already passed because stub throws).
Task 4/5: in progress; browser acceptance test attempted before UI exists.
Task 4: editor acceptance tests pass for desktop and phone-sized contexts, including drag/move/rotate/delete, outside-drop cancellation and touch resizing. Static Canvas layer added to avoid redrawing terrain and sleepers every frame.
Task 5: sample, train controls, local persistence, tutorial and synthesised sounds implemented. Core 8 browser checks green; extra drag, keyboard and touch checks green after fixing test locator ambiguity.
Task 3 refinement: acceleration invariance test observed RED (distance difference 0.0032 between frame rates), then GREEN with exact piecewise integration; suite 49/49.
Task 5 refinement: interrupted pointer gesture test observed RED; blur/visibility now cancel gestures atomically. Hidden-tab time test green.
Task 6: final verification in progress. UI separated into BuildingBox and ConductorPanel for maintainability.
Task 4: complete — real UI construction, drag, touch, keyboard, history and cancellation checks pass in desktop and phone contexts.
Task 5: complete — all 18 Playwright checks pass, including constructed loop laps, save/reload, corrupt-save preservation and background-tab recovery.
Task 6: unit49/49, typecheck green, diff whitespace check green; final fresh review and post-review production build pending.
Final fresh review: two P2 persistence/recovery findings; no deferred minors.
Final fix pass: invalid start after history geometry replacement — browser test observed RED (Save fails), then validate restored geometry and clear invalid placement.
Final fix pass: manual corrupt-load overwrite — browser test observed RED (record overwritten after mute), then disable autosave on failed manual Load.
Final verification pending: rebuilt production app with both fixes; unit49/49 and typecheck green.
Phone quick transport: viewport/reachability regression observed RED then GREEN; reuses existing controls, no simulation changes.

Final: fixed invalid start after history geometry replacement — undo-after-load browser test RED→GREEN in both contexts; full suite 23 passed / 1 intentional skip.
Final: fixed manual corrupt-load overwrite — failed-manual-load browser test RED→GREEN in both contexts; full suite 23 passed / 1 intentional skip.
Task 6: complete — 49/49 Vitest, TypeScript pass, next build pass, production Playwright 23 passed / 1 intentional skip, whitespace check pass. Visual/performance QA: no runtime errors or horizontal overflow; sample average frame interval 16.67 ms in desktop/phone headless Chromium. Physical Safari/iOS untested.
Final review: fresh reviewer completed; two important findings fixed in one pass. Deferred minors: none.
