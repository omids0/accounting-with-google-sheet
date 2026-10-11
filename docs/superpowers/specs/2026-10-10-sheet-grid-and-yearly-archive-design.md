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
  - `planGridTrim(input): DeleteDimensionRequest[]`. Pure function. Input per tab: grid info
    (`sheetId`, `rowCount`, `columnCount`, `frozenRowCount`), schema width, last non-empty
    row, last non-empty column. Output: `deleteDimension` requests, or none.
  - `fetchGridInfo(spreadsheetId)`. One metadata GET for all tabs.
  - `withGridGrowth(spreadsheetId, sheetName, minRows, minColumns, write)`. Runs the write.
    Only on a 400 «exceeds grid limits» error, it grows the grid with `appendDimension` and
    retries once. A successful write costs no extra request.
- **`src/services/migrateCompactGrids.ts`** (new). One-time migration per spreadsheet, kept in
  localStorage under `accounting_grid_compact_migration_v1` like the existing migrations.
  It runs after a successful pull.

### Sheet ranges

- Reads and appends use the quoted whole-sheet reference `'<tab>'` instead of `<tab>!A:Z`.
- A range that names columns past a narrow grid could be rejected. A whole-sheet reference
  never is, and it also reads hand-added columns past Z.
- Quoting is also required for Part 2 tab names that contain a space.
- `dangSplit.ts` reads its header with `1:1` instead of `A1:Z1`.

### New tabs

- `batchAddSheetTabs` and `createSpreadsheetInner` pass
  `gridProperties: { rowCount: 2, columnCount: headers.length, frozenRowCount: 1 }`.
- `rowCount` is 2, not 1, because Sheets refuses a grid whose only rows are frozen.
- `writeSheetHeaders` uses `columnLetter`.

### Compaction of existing tabs (the migration)

The migration runs right after a successful pull, while the local mirror is fresh, and only
when the outbox is empty. It only touches tabs in the app's schema. Tabs the user created
are never changed. Steps:

1. **Read grid sizes** with `fetchGridInfo`, including frozen rows and columns.
2. **Propose a trim** per tab from the local mirror's data extent. A tab with no mirror copy
   counts as empty. The mirror only proposes: it can be stale or partial.
   - Width: `max(schemaWidth, lastDataColumn, frozenColumnCount + 1)`.
   - Height: `max(lastDataRow + ROW_BUFFER, frozenRowCount + 1)`, with `ROW_BUFFER = 50`.
     Rows are trimmed only when the grid has more than `lastDataRow + 2 * ROW_BUFFER` rows.
   - **Why a buffer:** `deleteDimension` uses absolute indices. An append from another device
     between our read and our delete lands at `lastDataRow + 1`. Fifty rows of margin make
     that race harmless. The cost is about 450 cells per tab.
3. **Read live every region the trim would remove**, in one `values:batchGet`: the columns
   past the target width and the rows past the target height.
   - **If any of a tab's regions has a value, or returns no answer, that tab is skipped
     entirely.**
   - Normally every region is empty, so the response is tiny.
4. **Re-check the outbox.** If a local write was queued during the probe, stop without
   setting the flag.
5. **Send one `batchUpdate`** with every `deleteDimension` request. Each tab gets at most one
   column range and one row range, both cut from the end.
   - If Sheets refuses the combined batch (400), each tab is sent on its own, and a tab that
     is still refused is left as it is.
6. **Set the flag** after the trims are sent. A network failure leaves the flag unset, and
   the next pull retries. Re-running on another device is harmless, because trimmed tabs
   produce an empty plan.

### Writes that need a larger grid

These writes are wrapped in `withGridGrowth`:

- `appendSheetRowApi`. `INSERT_ROWS` adds rows, but not columns.
- `updateSheetRowApi`.
- The write step of `replaceSheetDataRowsApi` (outbox `replace`). Its trailing clear ignores
  «exceeds grid limits», because nothing exists past the grid edge.
- `appendHeaderColumn` (column migrations).

Reason: `values.update` past the grid edge fails with «exceeds grid limits».

### Error handling

- A failure in the migration is swallowed silently, because the repo's lint rules forbid
  `console`. Sync continues, and the next pull retries.
- A failed grid growth fails the write. The write stays in the outbox, as today.

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

**Trigger (updated 2026-10-11).** After a pull, per form, from an in-memory check of the base
rows. The check needs no API call, so steady state costs nothing. All of these must hold:

- The base tab holds more than `ARCHIVE_THRESHOLD_ROWS = 5000` data rows.
- At least one row has a Jalali year below the current one.
- The whole outbox is empty.

Users with small sheets never get archive tabs, and their sheet stays simple.

- **Why 5,000:** benchmark of the real parse path on synthetic 9-column rows, about
  34 bytes per row on the wire after gzip. A 5,000-row tab is about 170 KB per download;
  20,000 rows is about 680 KB.
- In-app processing stays under 100 ms even at 20,000 rows, so the network is the cost.
- Once the threshold is reached, every past year moves out, so the base tab holds roughly the
  current year.

The first run for existing users is the same sweep. No separate migration exists.

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

### Sync cold tier (updated 2026-10-11)

The changed-tabs sync (merged in PR #125) already persists change tokens with the mirror, so
an archive tab whose token did not move is never downloaded. Only the "download everything"
plans need a cold-tier rule.

- **Archive tabs are discovered from the change-token read.** `fetchSheetRevisions` already
  lists every tab on each pull, and `RevisionEntry` gains the real `title`. A tab is an
  archive when `parseArchiveSheetName` matches it.
- **`planSheetFetch` gets `coldSheets`, the archive tabs:**

  | Plan | Archives included |
  |------|-------------------|
  | Token moved on an archive tab | that archive tab |
  | Hand edit, or the 15-minute suspect window | only archive tabs missing from the mirror |
  | Daily safety net (24 h), unknown tokens, no mirror | all archive tabs |

- **Result:** a hand edit, or another device's write, downloads only the current year.
  Archive tabs come down once and then once a day at most.

### Reads

`fetchRecords(form)` reads the base tab and every archive tab of that form held in the mirror.
It dedupes by `id`, keeping the base copy, and tags each record with its `sheetName`.
Archive tabs not yet in the mirror are fetched on demand, as the base tab is today.

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
