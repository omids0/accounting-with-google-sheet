# Sheet Grid Compaction and Yearly Archive Tabs — Design

Date: 2026-10-10
Branch: `feature/ACCT-0/ACCT-0/sheet-grid-yearly-archive`

## Goal

Keep the Google Sheets backend fast and far below Google's limits as data grows for years,
controlled entirely from the client app, without touching existing users' data.

Two independent parts, shipped as two PRs in this order:

1. **Grid compaction.** Every tab is exactly as wide as its schema and has no large block of
   empty rows. This protects the 10M-cell spreadsheet limit.
2. **Yearly archive tabs.** Past-year rows of each form tab (هزینه, درآمد, …) move into
   `<tab> <year>` tabs that the routine sync does not re-download. This keeps sync payloads
   and latency flat as years accumulate.

## Decisions

| Topic | Decision |
|-------|----------|
| Schema | The existing `SheetSpec { sheetName, headers }` list is the single source of truth: `MODULE_SHEET_SPECS` plus form specs from `buildHeaders`. No new schema format. |
| Columns outside the schema | A column that holds any data is never deleted, even without a header. The app ignores it; whoever added it owns it. Only fully empty columns are removed. |
| Data safety | Every destructive step works from a fresh read, only removes cells proven empty or proven copied, and is idempotent. |
| Archive naming | `<form sheetName> <Jalali year>` with Latin digits, e.g. `هزینه 1404`. |
| Year of a row | Jalali year of the form's date field. Rows with no valid date stay in the base tab. |
| Base tab | Keeps its current name and holds the current year (and any future-dated rows). It is never renamed, so settings and other devices keep working. |
| Writes | New records always append to the base tab, as today. A sweep moves past-year rows later. |
| Reads | `fetchRecords(form)` returns base plus all archive rows. Every report keeps working unchanged. |
| Sync | Archive tabs are a cold tier. They are downloaded when missing locally, when their change token moved, or at most once per 24 h. |

## Context in the current code

- Tabs are created with Google's default grid of 1000 rows × 26 columns
  (`sheetsEnsure.ts:91-103`, `sheetsCreate.ts:26-31`). About 30 tabs means about 780k empty
  cells before the first record.
- Income/expense rows use about 9 columns; module tabs use 2–15.
- `writeSheetHeaders` builds the end column with `String.fromCharCode(64 + n)`, which breaks
  past 26 columns (`sheetsEnsure.ts:135`). `columnLetter` already exists for this.
- Sync reads `A:Z` (`SHEET_FULL_RANGE`, `sheetsRows.ts:19`).
- Change tokens (`accounting_rev`, `sheetRevisions.ts`) live only in session memory. A cold
  start downloads every tab. When Drive's `modifiedTime` is older than 10 min, or no token
  moved, the pull also downloads every tab (`sheetSyncPull.ts:33-43`). Download size
  therefore grows with total history, not with recent activity.
- `aggregateMonthlyNet` sums records across all years for the opening balance
  (`openingBalanceDerive.ts:18-21`). The dashboard, records list and category tree also read
  all rows. Reads must therefore keep seeing every year.
- Writes target a row number, guarded by `resolveTargetRow`, which falls back to a lookup by
  the `شناسه` id column (`sheetsRowGuard.ts:78-105`).
- Record update/delete callers: `recordsMutations.ts`, `vehicleExpenseActions.ts`,
  `paymentTransactions.ts`, `migrateLegacyMachineExpenseCategory.ts`. All of them pass a
  record that came from `fetchRecords`.

---

## Part 1 — Grid compaction

### Units

- **`src/services/sheetGrid.ts`** (new)
  - `planGridTrim(input): GridTrimPlan`. Pure function. Input per tab: `sheetId`,
    `gridProperties` (`rowCount`, `columnCount`, `frozenRowCount`), schema width, last
    non-empty row, last non-empty column. Output: `deleteDimension` requests or nothing.
  - `ensureGridSize(spreadsheetId, sheetName, minRows, minCols)`. Sends `appendDimension`
    only when the cached grid is smaller than needed.
  - A grid-properties cache per spreadsheet, filled by the metadata call that already runs
    on every pull (see below).
- **`src/services/migrateCompactGrids.ts`** (new). One-time migration per spreadsheet, wired
  like the existing migrations (`sheetSyncLifecycle.ts:164-168`) with a localStorage flag
  `accounting_grid_compact_v1_<spreadsheetId>`.

### Getting grid sizes without a new request

`fetchSheetRevisions` already reads `sheets.properties(sheetId,title)` on every pull. Extend
its `fields` to `properties(sheetId,title,gridProperties)` and store the grid sizes in the
grid cache. There is no extra round trip.

### New tabs

- `batchAddSheetTabs` and `createSpreadsheetInner` pass
  `gridProperties: { rowCount: 2, columnCount: headers.length, frozenRowCount: 1 }`.
- `rowCount` is 2, not 1, because Sheets refuses a grid whose only rows are frozen.
- `writeSheetHeaders` uses `columnLetter`.

### Compaction of existing tabs (the migration)

The migration runs right after a successful pull, while the local mirror is fresh, and only
when the outbox is empty. Steps:

1. **Read grid sizes** from the grid cache.
2. **Compute target width** per tab: `schemaWidth = headers.length` (base tab) or the header
   row width (archive tabs and unknown tabs).
3. **Probe the columns that would be deleted.** One `values:batchGet` with, for every tab
   where `columnCount > targetWidth`, the range `'<tab>'!<targetWidth+1 letter>:<last letter>`.
   - Any returned value raises that tab's target width to its last non-empty column.
   - The response length also gives the last data row in those columns.
   - Normally every range is empty, so the response is tiny.
4. **Compute target height:** `lastDataRow + ROW_BUFFER`, where `lastDataRow` is the larger
   of the mirror's row count and the probe's row count, and `ROW_BUFFER = 50`.
   - Rows are trimmed only when the surplus exceeds `ROW_BUFFER * 2`.
   - **Why a buffer:** `deleteDimension` uses absolute indices. An append from another device
     between our read and our delete lands at `lastDataRow + 1`. Fifty rows of margin make
     that race harmless. The cost is about 450 cells per tab.
5. **Send one `batchUpdate`** with all `deleteDimension` requests, columns and rows per tab,
   each list in descending index order.
6. **Set the flag** only after the `batchUpdate` succeeds. A failure leaves the flag unset,
   and the next pull retries. Re-running on another device is harmless, because trimmed tabs
   produce an empty plan.

### Writes that need a larger grid

- `append` with `INSERT_ROWS` grows the grid by itself, so no change is needed.
- `appendHeaderColumn` (column migrations) calls `ensureGridSize(…, cols + 1)` before writing.
- The outbox `replace` operation calls `ensureGridSize(…, rows.length + 1, width)` before
  `replaceSheetDataRowsApi`.
- `writeSheetHeaders` calls `ensureGridSize(…, 1, headers.length)`.

The plan's first task verifies against the real API whether `values.update` past the grid
edge fails. The explicit `ensureGridSize` stays either way, because it costs nothing when
the grid is already big enough.

### Read range

`SHEET_FULL_RANGE = 'A:Z'` is replaced by a per-tab range built from the tab's width:
`'<tab>'!A:<columnLetter(max(schemaWidth, 26))>`. Never reading less than today means no
regression for tabs with hand-added columns.

### Error handling

- A failure in the migration is logged and swallowed. Sync continues, and the next pull
  retries.
- An `ensureGridSize` failure fails the write. The write stays in the outbox, as today.

### Tests (vitest)

`planGridTrim`:
- default 1000×26 grid with 10 data rows
- a hand-added data column past the schema
- a frozen-row edge case
- an already-trimmed grid, which must produce an empty plan
- a surplus below the buffer threshold

Migration:
- it sends one `batchUpdate`
- it sets the flag only on success
- it skips work while the outbox is non-empty

Also: `writeSheetHeaders` with more than 26 headers.

---

## Part 2 — Yearly archive tabs

### Units

- **`src/services/recordArchive.ts`** (new). Pure helpers:
  - `archiveSheetName(base, year)`
  - `parseArchiveSheetName(title, forms)`. Returns `{ form, year }` only when the base is a
    configured form's `sheetName`. A user form literally named `هزینه 1404` is therefore
    never mistaken for an archive.
  - `rowJalaliYear(row, form, columnMap)`. Uses the form's date field and the existing Jalali
    conversion (`utils/jalaliConvert.ts`, `normalizeSheetDate`).
  - `planYearSweep(baseRows, form, currentYear)`. Returns past-year rows grouped by year.
- **`src/services/recordArchiveSweep.ts`** (new). Runs the move against the API.
- **`src/services/sheetsRecords.ts`** (changed)
  - `SheetRecord` gains `sheetName`.
  - `fetchRecords` unions the base tab and the form's archive tabs, and dedupes by `id`; the
    base copy wins.
  - `updateRecord` / `deleteRecord` take the record's `sheetName` and target that tab.
- **`src/services/sheetSyncSheetNames.ts`** (changed). Splits known tabs into a hot tier
  (today's list) and a cold tier (archive tabs found in the cached sheet titles).

### Sweep (move past-year rows out of the base tab)

**Trigger.** After a pull, per form, when an in-memory check of the base rows finds a row
with Jalali year below the current one. The check needs no API call, so steady state costs
nothing. The sweep also requires the outbox for the base tab to be empty.

The first run for existing users is the same sweep. It moves each past year's rows into its
own archive tab. No separate migration exists.

Steps for each past year `Y` found in the base tab:

1. **Ensure the archive tab** `<base> Y` exists. Its header row is a copy of the base tab's
   header row, not the schema, so hand-mapped or older column layouts survive. It is created
   with an exact grid (Part 1).
2. **Fresh read** of the archive tab. Append only the rows whose `شناسه` is not already
   there. This makes the step idempotent after a crash.
3. **Fresh read** of the archive tab again. Confirm that every row being moved is present by
   id. If any is missing, stop. Nothing is deleted.
4. **Fresh read** of the base tab. Map each moved id to its current row number. Rows whose id
   is no longer present (deleted meanwhile) are skipped.
5. **One `batchUpdate`** deletes those rows. It uses `deleteDimension` requests in descending
   index order, merged into contiguous ranges. The single request is atomic.
6. **Stamp change tokens** on both tabs with the existing revision stamping, so other devices
   re-pull.
7. **Update the local mirror** for both tabs from the fresh reads, minus the deleted rows.
   Then bump the write versions so an in-flight pull cannot overwrite the result.

**Two devices sweeping at once.** A duplicate id in an archive is possible. It is harmless,
because reads dedupe by id. The next sweep removes extra copies inside the archive with the
same verify-then-delete pattern.

### Edits after a move

- Another device may hold a queued `update`/`delete` that targets a base row which has moved.
  `resolveTargetRow` already falls back to an id lookup. Extend that fallback: when the id is
  not in the given tab and the tab is a form base tab, search that form's archive tabs and
  apply the operation there.
- Editing an archived record's date into another year does not move it. Reads union every
  tab, so placement affects only sync cost, never correctness. This avoids a cross-tab move
  on every edit.

### Sync cold tier

- The regular pull (`pickSheetsToFetch`) uses only hot-tier tabs.
- The cold tier is fetched per archive tab when any of these hold:
  - the tab is not in the IndexedDB mirror
  - its change token differs from the token persisted at its last download
  - its last download is older than 24 h; this is the safety net for hand edits, which do
    not stamp tokens
- Last-download token and time per archive tab are persisted with the mirror. This differs
  from hot-tier tokens, which stay session-only as today.
- Result: a cold start or a 10-minute refresh downloads only the current year.

### UI and About page

- No UI change. Records, reports and the dashboard behave the same.
- Update the About page group for Google Sheets / sync: past years are kept in tabs named
  with the year, for example `هزینه 1404`, and the app manages them automatically.

### Error handling

- Any sweep failure stops before step 5. Data stays in the base tab, with possibly an extra
  copy in the archive, which reads dedupe. The sweep retries on the next pull.
- A failed cold-tier download keeps the mirror's copy and retries on the next pull.

### Tests (vitest)

- `parseArchiveSheetName`:
  - a configured form
  - a non-form tab with a year suffix
  - Persian digits are not matched
- `planYearSweep`:
  - an Esfand/Farvardin boundary
  - a missing date
  - a future-dated row
- Sweep with a mocked API:
  - happy path
  - a crash after the append, then a re-run that appends no duplicates
  - a verification miss, which deletes nothing
  - a row deleted meanwhile
  - contiguous range merging
- `fetchRecords`:
  - the union across tabs
  - dedupe by id
  - `sheetName` set on each record
- The row-guard fallback finds a moved row in its archive.
- Cold-tier selection: missing, token moved, stale over 24 h, fresh.

---

## Out of scope

- Lazy-loading archives, i.e. not downloading old years until a report needs them. The
  opening balance needs all years. Storing yearly closing totals could remove that need
  later.
- Archiving module tabs (vehicle history, timesheet entries, dang items). Their volume is far
  lower. The same helpers can be reused if needed.
- Persisting hot-tier change tokens across cold starts.
