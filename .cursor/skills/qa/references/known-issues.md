# Known recurring bugs (re-check when touching the area)

Append one line per bug the user reports twice. Remove when verified fixed AND covered by a repeatable check.

- **Modal opens with a jump** (reported repeatedly, still open as of 2026-10-21). Check every modal/sheet you touch with the `motion` step: expect verdict SMOOTH, no direction reversals, no size change after settle. Start with the shared `FormModal`.
- **SMS card: choosing the vehicle category does not behave like manual expense entry** (reported 2026-10-20, not fixed). Parity-check the SMS category selection against the manual expense form; prefer the same shared category component.
