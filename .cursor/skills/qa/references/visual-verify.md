# Visual verification — see the real app

Reading code is not testing. After every UI or behavior change, run the built app in real Chrome, perform the user's flow, save screenshots, and LOOK at them (Read the PNG files).

## Run

```bash
# dist/ must match the current code. The build needs a client id baked in or the app
# shows an OAuth setup screen; any value works because Google is mocked.
VITE_GOOGLE_CLIENT_ID=qa.apps.googleusercontent.com npm run build
node .cursor/skills/qa/scripts/qa-shoot.mjs --steps steps.json
```

In a new worktree `node_modules` must be copied from the main checkout first (not `npm install`).

Options: `--viewport 375x812` (default), `--dark`, `--reduced-motion`, `--out <dir>`, `--port 4180`, `--base <url>` (use an already running server), `--data sheets.json`, `--headed`.

The runner starts `vite preview` on port 4180 (4173 belongs to e2e), blocks the service worker, mocks Google APIs, seeds a signed-in state, prints a JSON report and saves PNGs plus `report.json`. Exit code 1 means a step failed (`fatal`), so a failure is never a pass.

## steps.json

An array; each item has exactly one key:

```json
[
  { "goto": "/" },
  { "shot": "home" },
  { "click": "text=ثبت هزینه" },
  { "wait": 400 },
  { "shot": "modal-open" },
  { "motion": { "name": "open", "trigger": "text=ثبت هزینه", "watch": "[role=dialog]", "ms": 800 } },
  { "fill": ["input[name=amount]", "125000"] },
  { "press": "Escape" },
  { "eval": "document.querySelectorAll('[role=dialog]').length" }
]
```

Locators are Playwright selectors (`text=…`, `role=button[name="…"]`, CSS). Find real labels and routes in `src/components/layout/types.ts` and the feature folder; the app uses path routes (`/`, deep links `/?action=expense`).

`--data sheets.json` maps sheet tab title to rows (`{ "Expenses": [["id","..."]] }`) so lists are not empty; read the service in `src/services/` for the column order. The helper already marks onboarding finished; to see the first-run wizard, add an `eval` step that removes the `accounting_onboarding_v1` key and reload.

## What to capture (minimum)

1. The state BEFORE the change flow (so the diff is visible).
2. Each step of the user's flow from the brief's "Done means".
3. Empty, filled, error states that the change can influence.
4. Dark mode and one second viewport (for example `--viewport 768x1024`) when layout changed.
5. For any modal, sheet, drawer or transition: a `motion` step. Verdict must be `SMOOTH`; read `maxVerticalStepPx`, `directionReversals`, `sizeChangesAfterSettle`, `droppedFrameGaps`, `layoutShift`. JUMPY = defect, fix it, rerun.
6. Compare behavior with the sibling flow in the same run (parity): same steps, same screenshots.

## Judging

- Open every PNG with Read and describe what you see; compare with the intended result. Say what is wrong even if small.
- `consoleErrors` and `pageErrors` in the report must be empty or explained.
- Motion numbers catch jumps that a still image cannot; they do not prove taste. List the animation as "check by eye" for the user when it is a new design.

## Limits (say them honestly)

- Mocked Google responses: real Sheets behavior (auth, quotas, real rows) is not exercised. Name what the mock cannot prove.
- Headless Chrome is not a phone. Real-device checks (keyboard, safe areas, haptics, Android WebView) stay with the user.
- If Chrome or the build is unavailable, report the check as NOT RUN.
