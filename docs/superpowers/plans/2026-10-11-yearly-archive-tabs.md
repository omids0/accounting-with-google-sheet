# Yearly Archive Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Once a form tab holds more than 5,000 rows, past-year rows move into
`<tab> <Jalali year>` archive tabs. Sync then downloads only the current year, while every
report still sees every year.

**Architecture:**
- Pure helpers in `recordArchive.ts`: naming, year of a row, sweep planning.
- `recordArchiveSweep.ts` performs the move as copy → verify → delete.
- Sync treats archive tabs, found through the change-token read, as a cold tier.
- `fetchRecords` merges the base tab with its archives.
- Outbox updates and deletes that miss a moved row fall back to the archives.

**Spec:** `docs/superpowers/specs/2026-10-10-sheet-grid-and-yearly-archive-design.md`, Part 2
(updated 2026-10-11).

## Global Constraints

- `ARCHIVE_THRESHOLD_ROWS = 5000`, counted as data rows in the base tab, excluding the header.
- Archive name: `` `${form.sheetName} ${year}` ``, Latin digits. A configured form whose
  `sheetName` equals an archive name is never treated as an archive.
- Never delete a base row before its copy is confirmed in the archive by `شناسه`, through a
  fresh read.
- The sweep runs only when the whole outbox is empty.
- Files stay ≤ 300 lines. Commit format: `<type>/ACCT-0/ACCT-0/<description>`.

## Review Focus

1. **Rows without a valid date.** They stay in the base tab and are never counted as past
   years.
2. **A crash after the archive append but before the base delete.** The re-run appends no
   duplicates, and reads dedupe by id.
3. **A row edited or deleted on another device during the sweep.** The base re-read maps ids
   to their current row numbers, and rows that vanished are skipped.
4. **A queued update for a row that has moved.** The outbox resolves it in the archive tab.
5. **Hand-made tabs with a year suffix but no matching form.** They are ignored.

## Tasks

### Task 1: `recordArchive.ts` pure helpers
- `ARCHIVE_THRESHOLD_ROWS`
- `archiveSheetName(base, year)`
- `parseArchiveSheetName(title, forms): { form, year } | null`
- `rowJalaliYear(row, columnMap, dateFieldId): number | null`
- `planYearSweep(allRows, form, currentYear): Map<number, string[][]> | null`. Returns null
  below the threshold or when there are no past-year rows.

Tests:
- naming round trip
- a non-form tab
- a form literally named like an archive
- Persian digits are rejected
- invalid or missing date → null
- below the threshold → null
- grouping by year
- current-year and future rows stay

### Task 2: Change-token entries know their title, and archive discovery
- `RevisionEntry.title`.
- `listArchiveSheets(revisions, forms): string[]` in `recordArchive.ts`.

Tests:
- titles are preserved
- only form archives are listed

### Task 3: Cold tier in `planSheetFetch` and the pull
- `planSheetFetch` input gains `coldSheets` and `coldMissing`. Rules follow the spec table.
- The pull computes them from the revisions plus the mirror.

Tests:
- hand edit → hot tabs plus missing archives only
- daily safety net → everything
- unknown tokens → everything
- a token moved on an archive → only that archive

### Task 4: Records merge the base tab and its archives
- `SheetRecord.sheetName`.
- `fetchRecords` unions the base tab and the archives in the mirror, deduped by id with the
  base copy winning.
- `updateRecord` / `deleteRecord` take an optional `sheetName` (default: the base tab).
- Callers pass `record.sheetName`.

Tests:
- union and dedupe
- update targets the archive tab

### Task 5: The sweep (`recordArchiveSweep.ts`)
`sweepFormArchives(spreadsheetId, form)`. Steps:
1. Plan the sweep from the mirror.
2. For each year, ensure the archive tab exists, with the header copied from the base tab.
3. Fresh read of the archive; append only the missing ids.
4. Fresh read again to verify every id is present.
5. Fresh read of the base tab, then one `batchUpdate` of descending, merged
   `deleteDimension` ranges.
6. Stamp tokens on both tabs.
7. Update the mirror and bump the write versions.

`sweepArchivesAfterPull(spreadsheetId)` runs it for every form, and only when the outbox is
empty.

Tests:
- happy path
- a re-run after a crash between append and delete
- a verification miss deletes nothing
- a row deleted meanwhile is skipped
- contiguous ranges are merged
- below the threshold, nothing is sent

### Task 6: Outbox fallback to archives
In `executeOutboxOperation`, an `update` or `delete` that hits `RowConflictError` on a form
base tab searches that form's archive tabs by id, using the cached sheet titles, and applies
the operation there.

Tests:
- an update lands in the archive
- a delete of a row found nowhere is still a no-op

### Task 7: Wiring, About page, verification
- Run the sweep after a pull, next to the grid compaction.
- About page: add a sync note and bump the version.
- Run types, lint, test, lines and build. Then the final review.
