# Phase 0 — end-user brief

Write this BEFORE the first edit. Keep it short, in plain words. If you cannot fill a line, you do not understand the task yet: read code or ask the user.

1. **Who and where**: which user, on which screen, on phone (375px) by default. What did they just do before this?
2. **The flow**: numbered taps from entry to done. Count taps; fewer than the closest existing flow, or equal.
3. **What they see in each state**: first load, loading, empty, filled, error, offline, long Persian text, large numbers, dark mode.
4. **What must feel the same**: name the sibling flow (for example manual expense entry for SMS cards) and list behaviors that must match: field order, defaults, selection UI, validation, feedback, focus.
5. **What can go wrong for the user**: double tap, back button, closing mid-way, losing typed data, wrong sheet row written.
6. **Done means**: 2–4 observable facts a person could check on screen. These become the screenshots in phase 2.

Then run `side-effects.md` and `parity.md`. Report real risks to the user BEFORE coding, not after.
