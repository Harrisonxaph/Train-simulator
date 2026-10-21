# First playable release review

A separate reviewer inspected the approved design and implementation. Geometry, graph traversal, normal gesture cancellation, visibility handling and active-track removal had no established important findings.

Two P2 findings were reproduced by the implementing agent in Playwright against the pre-fix production build:

1. Undo after loading a valid save could restore a shorter path under the same ID, retaining an out-of-range train start and preventing saving. The regression test failed on the expected Save confirmation. The controller now revalidates the start against the restored path length and clears incompatible train placement.
2. A failed manual Load could leave autosave enabled, replacing the corrupt record after a preference change. The regression test observed the malformed record being overwritten. Failed manual loads now suspend autosaving and retain the record until explicit Save, sample loading or a new board.

Both fixes are covered by browser regressions in desktop and phone contexts. The reviewer’s attempted independent browser launch was blocked by its sandbox; executable reproduction and verification were performed by the implementing agent. The review itself was read-only. No minor findings were deferred.

Final verification: 49 unit tests pass; 23 production-browser checks pass with one intentional desktop skip; TypeScript and production build pass. Both regression cases pass in desktop and phone contexts.
