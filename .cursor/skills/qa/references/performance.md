# Performance review

The user feels performance as jank, slow opening, laggy lists, big downloads. Check what the change can affect.

## Per change

- **Opening and transitions**: modal/page opens within ~100 ms of the tap, no dropped frames (`motion` step reports `droppedFrameGaps`, `layoutShift`). Animate `transform`/`opacity`, not `top/height/width`. Reserve space for async content to avoid layout shift.
- **Re-renders**: new object/array/function props created inline in a hot path, context or store selectors that return a new object each time (Zustand: select primitives or use shallow compare), missing `key`s, state held too high so the whole page re-renders per keystroke.
- **Long lists** (transactions, SMS cards, checks): large lists need windowing or pagination; no per-row heavy work; no layout reads inside loops; search input debounced.
- **Work on the main thread**: parsing, sorting, aggregation over all sheet rows belongs in memoized selectors or services, not in render. Watch long tasks (`navigation-perf.spec.ts` has an observer to copy).
- **Network**: no duplicate Sheets calls, batch with `values:batchGet`, respect the changed-tabs sync; no request in a render path.
- **Bundle**: `npm run size-limit` has little headroom (limit raised several times; ask the user before raising again). Lazy-load heavy screens/charts, avoid importing whole libraries, check the build output sizes after adding a dependency.
- **Images/fonts**: sizes, subsetting (the repo has a subset-font script), no layout shift on font load.
- **Memory/leaks**: listeners, timers, subscriptions cleaned up in effects.

## Evidence

- Motion numbers from `qa-shoot.mjs` for any animated element.
- `npm run build` + `npm run size-limit` result when imports changed.
- For list or navigation changes, run `npx playwright test e2e/navigation-perf.spec.ts` (needs port 4173 free) or compare before/after with the runner.
- `npm run lighthouse` only before a push (slow).

For React specifics: `ui-ux-pro-max` → `--domain react` (rerender, memo, waterfall, bundle) and Quick Reference §3.

## Verdict

Name each concern with measured data or a code reference. "Probably fine" is not allowed; say "not measured" instead.
