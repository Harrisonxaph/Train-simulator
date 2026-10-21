# Incomplete-track safety follow-up

This focused V1.1 follow-up preserves the existing editor, artwork, controls and single-train model. No dependencies or saved-data schema changes are introduced.

## Changes

The simulator measures the active connected route ahead and splits frame integration at the braking point. It decelerates before an open end where possible and clamps at the endpoint when the remaining distance is too short. Every transition validates the current physical endpoints and active paths as well as the graph link, so a stale graph cannot carry a train onto moved, rotated, removed or inactive track.

Construction still requires Build mode. Unrelated edits preserve the paused train's actual position; extending a stopped route permits Play to continue from that endpoint. Removing or changing its occupied geometry clears placement instead of attaching the train to invalid geometry. Reverse remains available after stopping. Switch occupancy protection and alignment rules are unchanged.

An endpoint stop produces the requested friendly message, a subtle amber dashed ring and a gentle synthesised braking cue. Mute applies to the cue. Invalid current geometry receives a separate placement message, without an endpoint cue.

## Requirement coverage

| Behavior | Verification |
| --- | --- |
| Repeated closed-loop laps | Existing simulator and browser oval tests; extra loop with unrelated open pieces |
| Straight open routes at Slow/Normal/Fast | Progressive speed reduction and exact endpoint assertions for speeds 1, 2 and 4 |
| Curved open route and disconnected gap | Pose and final-piece assertions; existing disconnected-route regressions |
| Incomplete switch branch and inactive routes | Chosen branch ends safely; existing left/right and reverse-alignment tests |
| Crossing cannot turn to the other axis | Missing-exit stop plus existing four-direction crossing tests |
| Future track removal/move/rotation | Stale graph link rejected against current geometry |
| Occupied geometry removed/rotated | Reconciliation clears placement; simulator invalid-position tests |
| Extend and resume | Unit pose preservation and desktop/phone actual editor flow |
| Reverse and repeated Play at endpoint | Unit traversal back to the beginning and browser controls |
| Different frame intervals | Same safe endpoint at 0.02, 0.1 and 0.5 second steps; existing exact loop acceleration test |
| Audio and visual feedback | Phone screenshot inspected; real Web Audio oscillator instrumentation confirms brake tones only when unmuted, no browser runtime errors |

New braking, stale-link and position-preservation tests were observed failing before implementation. The browser regression reproduced the old end message before the UI change. The independent review agent could not run because its usage quota was exhausted; a direct code review and the automated checks are the review evidence for this follow-up. Physical iOS/Safari remains unverified.

Final verification: `npm test` — 127/127 tests in 11 files; `npm run typecheck` — exit 0; `npm run build` — successful production build; full Playwright against `npm start` — 44 passed, 2 intentional desktop skips, 0 failures. No application changes after verification. Delivery remains on the V1.1 feature branch/PR; production is not merged or redeployed.
