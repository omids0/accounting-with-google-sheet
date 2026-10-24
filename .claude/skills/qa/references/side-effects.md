# Side-effect scan

Goal: tell the user what else can break, without being asked. Do it before editing (impact) and after (what actually changed).

## Procedure

1. List every symbol you will change or remove: component, prop, hook, util, type, constant, CSS class, route, storage key, sheet column or tab name.
2. For each, search the whole repo (`src/`, `e2e/`, `workers/`, `docs/`) for importers and usages. Count them. Include re-export facades (root `*Page.tsx`) and tests.
3. For each consumer, decide: unaffected / affected-and-handled / affected-and-NOT-handled.
4. Check the cross-cutting areas below that the change can touch.
5. Report as a list: `symbol → N consumers → risk`. Highlight anything not handled.

## Cross-cutting areas

- **Shared component or hook changed**: every screen that uses it (modals: `FormModal`, `ConfirmDeleteModal`; selects: `CategorySelect`; filters: `useListFilters`).
- **Google Sheets data**: column order, headers, tab names, row ids, existing rows written by older app versions, yearly archive tabs, compact grids and changed-tabs sync. A schema change needs a migration and an old-data check.
- **Persisted state**: localStorage / sessionStorage / IndexedDB keys, Zustand store shape. Dev builds prefix keys with `dev:` (`devStorageIsolation.ts`); never read storage before that import.
- **Import / export / CSV / SMS parsing**: format and duplicate-id handling.
- **Navigation**: tabs and menu entries in `layout/types.ts`, deep links (`?action=expense|income|sms`), back-button behavior, shortcuts.
- **Auth and sync**: token expiry, `handleSheetError` / `isAuthError` paths, offline queue.
- **Money and dates**: Jalali vs Gregorian, Persian digits (`normalizeDigits`), rounding, sign of amounts, totals shown elsewhere (dashboard, reports, wallet).
- **Size and speed**: bundle (`size-limit` has little headroom), re-render of long lists.
- **About page**: user-visible behavior change means update `src/components/about/` (rule `keep-about-page-updated`).
- **Android/Capacitor**: native plugins and the dev APK id.

## Output

Never write "no side effects". Write what you searched and what you found, even if short.
