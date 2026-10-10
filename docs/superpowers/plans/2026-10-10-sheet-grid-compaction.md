# Sheet Grid Compaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every app-owned tab in the spreadsheet is exactly as wide as its schema and keeps
only a small buffer of empty rows, without ever deleting a cell that holds data.

**Architecture:**
- A new `sheetGrid.ts` holds a pure trim planner, a grid metadata reader and a grow-on-demand
  write wrapper.
- New tabs are created at their exact size.
- A one-time migration (`migrateCompactGrids.ts`) runs after a pull. It trims existing tabs
  from the local mirror's data extent, plus a probe of the columns it would delete.
- Reads and appends switch to quoted whole-sheet ranges, so a narrow grid can never make a
  range invalid.

**Tech Stack:** TypeScript, Vitest (jsdom), Google Sheets REST v4 through `apiRequest`.

**Spec:** `docs/superpowers/specs/2026-10-10-sheet-grid-and-yearly-archive-design.md`, Part 1.

## Global Constraints

- Every source file stays ≤ 300 lines (`npm run lines`; Husky blocks larger staged files).
- Never delete a cell that holds a value. A tab whose probed columns hold anything is skipped
  whole.
- Only tabs in `getAllSheetSpecs()` (form tabs plus `MODULE_SHEET_SPECS`) are touched.
- `ROW_BUFFER = 50` empty rows stay under the data. Rows are trimmed only when the grid has
  more than `lastDataRow + 100` rows.
- New tabs: `gridProperties: { rowCount: 2, columnCount: headers.length, frozenRowCount: 1 }`.
- Migration flag key: `accounting_grid_compact_migration_v1`, a map of spreadsheetId to
  `true`, through `getItem`/`setItem` from `./storage`.
- Commit messages: `<type>/ACCT-0/ACCT-0/<description>`, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Run `npx prettier --write` only on the files you touched. Never run it folder-wide.
- No config or tooling changes.

## Review Focus

1. **A tab whose grid is already narrower than 26 columns but whose mirror came from an old
   `A:Z` read.** Expected: the probe still runs for the columns past the target width, and
   trimming stays correct. This is pinned in Task 6 ("probes columns past the data width").
2. **A tab name with an apostrophe or a space.** Expected: the range is quoted, with the
   apostrophe doubled, and the API accepts it. Pinned in Task 3 (`quoteSheetName`).
3. **A replace that grows a compacted list by more than 50 rows.** Expected: the first write
   fails with «exceeds grid limits». The grid grows and the write succeeds without
   surfacing an error. Pinned in Task 2 and Task 5.
4. **A pull that runs while the outbox still holds writes.** Expected: the migration does
   nothing and retries on a later pull. Pinned in Task 6.
5. **A brand-new empty tab** (0 data rows, frozen header). Expected: the plan never deletes
   below `frozenRowCount + 1` rows or below 1 column. Pinned in Task 1.

---

### Task 1: Pure grid trim planner

**Files:**
- Create: `src/services/sheetGrid.ts`
- Test: `src/services/sheetGrid.test.ts`

**Interfaces:**
- Produces:
  - `ROW_BUFFER: number`
  - `interface GridInfo { sheetId: number; title: string; rowCount: number; columnCount: number; frozenRowCount: number }`
  - `interface GridTrimInput { grid: GridInfo; minWidth: number; lastDataRow: number; lastDataColumn: number }`
  - `type DeleteDimensionRequest`
  - `planGridTrim(input: GridTrimInput): DeleteDimensionRequest[]`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import { planGridTrim, ROW_BUFFER, type GridInfo } from './sheetGrid'

function grid(overrides: Partial<GridInfo> = {}): GridInfo {
  return { sheetId: 7, title: 'هزینه', rowCount: 1000, columnCount: 26, frozenRowCount: 1, ...overrides }
}

function range(dimension: 'ROWS' | 'COLUMNS', startIndex: number, endIndex: number) {
  return { deleteDimension: { range: { sheetId: 7, dimension, startIndex, endIndex } } }
}

describe('planGridTrim', () => {
  it('cuts a default 1000×26 grid down to the schema width plus a row buffer', () => {
    expect(planGridTrim({ grid: grid(), minWidth: 9, lastDataRow: 10, lastDataColumn: 9 })).toEqual([
      range('COLUMNS', 9, 26),
      range('ROWS', 10 + ROW_BUFFER, 1000)
    ])
  })

  it('keeps a data column that lies past the schema width', () => {
    expect(planGridTrim({ grid: grid(), minWidth: 9, lastDataRow: 10, lastDataColumn: 12 })[0]).toEqual(
      range('COLUMNS', 12, 26)
    )
  })

  it('returns nothing for a grid that is already trimmed', () => {
    const trimmed = grid({ rowCount: 10 + ROW_BUFFER, columnCount: 9 })

    expect(planGridTrim({ grid: trimmed, minWidth: 9, lastDataRow: 10, lastDataColumn: 9 })).toEqual([])
  })

  it('leaves rows alone while the surplus is within twice the buffer', () => {
    const small = grid({ rowCount: 10 + ROW_BUFFER * 2, columnCount: 9 })

    expect(planGridTrim({ grid: small, minWidth: 9, lastDataRow: 10, lastDataColumn: 9 })).toEqual([])
  })

  it('never cuts an empty tab below one unfrozen row or one column', () => {
    expect(planGridTrim({ grid: grid({ frozenRowCount: 1 }), minWidth: 0, lastDataRow: 0, lastDataColumn: 0 })).toEqual([
      range('COLUMNS', 1, 26),
      range('ROWS', ROW_BUFFER, 1000)
    ])
    expect(
      planGridTrim({ grid: grid({ frozenRowCount: 80 }), minWidth: 3, lastDataRow: 1, lastDataColumn: 3 })[1]
    ).toEqual(range('ROWS', 81, 1000))
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/services/sheetGrid.test.ts`
Expected: FAIL. The module `./sheetGrid` is not found.

- [ ] **Step 3: Implement**

```ts
/**
 * Empty rows kept under the data when trimming. deleteDimension uses absolute
 * indices, so an append from another device racing the trim lands inside this
 * margin instead of being deleted.
 */
export const ROW_BUFFER = 50

export interface GridInfo {
  sheetId: number
  title: string
  rowCount: number
  columnCount: number
  frozenRowCount: number
}

export interface GridTrimInput {
  grid: GridInfo
  /** Columns the schema needs, kept even while empty. */
  minWidth: number
  /** 1-based last row holding any value; 0 when the tab is empty. */
  lastDataRow: number
  /** 1-based last column holding any value; 0 when the tab is empty. */
  lastDataColumn: number
}

export type DeleteDimensionRequest = {
  deleteDimension: {
    range: { sheetId: number; dimension: 'ROWS' | 'COLUMNS'; startIndex: number; endIndex: number }
  }
}

function deleteRange(
  sheetId: number,
  dimension: 'ROWS' | 'COLUMNS',
  startIndex: number,
  endIndex: number
): DeleteDimensionRequest {
  return { deleteDimension: { range: { sheetId, dimension, startIndex, endIndex } } }
}

/** deleteDimension requests that shrink the grid to its data; never touches a cell with a value. */
export function planGridTrim({
  grid,
  minWidth,
  lastDataRow,
  lastDataColumn
}: GridTrimInput): DeleteDimensionRequest[] {
  const requests: DeleteDimensionRequest[] = []

  const targetColumns = Math.max(minWidth, lastDataColumn, 1)

  if (grid.columnCount > targetColumns) {
    requests.push(deleteRange(grid.sheetId, 'COLUMNS', targetColumns, grid.columnCount))
  }

  // Sheets refuses a grid whose only rows are frozen.
  const targetRows = Math.max(lastDataRow + ROW_BUFFER, grid.frozenRowCount + 1)

  if (grid.rowCount > lastDataRow + ROW_BUFFER * 2 && grid.rowCount > targetRows) {
    requests.push(deleteRange(grid.sheetId, 'ROWS', targetRows, grid.rowCount))
  }

  return requests
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run src/services/sheetGrid.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/sheetGrid.ts src/services/sheetGrid.test.ts
git commit -m "feature/ACCT-0/ACCT-0/Plan grid trims that keep every cell with data"
```

---

### Task 2: Grid metadata reader and grow-on-demand writes

**Files:**
- Modify: `src/services/sheetGrid.ts`
- Test: `src/services/sheetGridGrowth.test.ts`

**Interfaces:**
- Consumes: `GridInfo` (Task 1); `apiRequest`, `SHEETS_API` and `SheetsApiError` from
  `./sheetsApi`; `normalizeSheetTitle` from `./sheetsMeta`.
- Produces:
  - `fetchGridInfo(spreadsheetId: string): Promise<Map<string, GridInfo>>`. Keys are
    `normalizeSheetTitle(title)`.
  - `withGridGrowth<T>(spreadsheetId: string, sheetName: string, minRows: number, minColumns: number, write: () => Promise<T>): Promise<T>`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsApiModule from './sheetsApi'

const apiRequest = vi.fn()

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<typeof SheetsApiModule>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args)
}))

const { fetchGridInfo, withGridGrowth } = await import('./sheetGrid')
const { SheetsApiError } = await import('./sheetsApi')

const METADATA = {
  sheets: [
    { properties: { sheetId: 3, title: 'هزینه', gridProperties: { rowCount: 60, columnCount: 9, frozenRowCount: 1 } } }
  ]
}

describe('fetchGridInfo', () => {
  beforeEach(() => apiRequest.mockReset())

  it('reads every tab grid in one metadata request', async () => {
    apiRequest.mockResolvedValue(METADATA)

    const grids = await fetchGridInfo('sid')

    expect(apiRequest).toHaveBeenCalledTimes(1)
    expect(decodeURIComponent(apiRequest.mock.calls[0][0])).toContain('gridProperties')
    expect(grids.get('هزینه')).toEqual({ sheetId: 3, title: 'هزینه', rowCount: 60, columnCount: 9, frozenRowCount: 1 })
  })
})

describe('withGridGrowth', () => {
  beforeEach(() => apiRequest.mockReset())

  it('sends nothing extra when the write fits', async () => {
    const write = vi.fn().mockResolvedValue('ok')

    await expect(withGridGrowth('sid', 'هزینه', 200, 12, write)).resolves.toBe('ok')
    expect(write).toHaveBeenCalledTimes(1)
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('grows rows and columns once on «exceeds grid limits» and retries', async () => {
    const write = vi
      .fn()
      .mockRejectedValueOnce(new SheetsApiError("Range ('هزینه'!A2:L200) exceeds grid limits. Max rows: 60, max columns: 9", 400))
      .mockResolvedValueOnce('ok')

    apiRequest.mockImplementation(async (url: string) => (url.includes(':batchUpdate') ? {} : METADATA))

    await expect(withGridGrowth('sid', 'هزینه', 200, 12, write)).resolves.toBe('ok')

    const batch = apiRequest.mock.calls.find(([url]) => String(url).includes(':batchUpdate'))!

    expect(JSON.parse(batch[1].body).requests).toEqual([
      { appendDimension: { sheetId: 3, dimension: 'ROWS', length: 140 } },
      { appendDimension: { sheetId: 3, dimension: 'COLUMNS', length: 3 } }
    ])
    expect(write).toHaveBeenCalledTimes(2)
  })

  it('rethrows other errors without touching the grid', async () => {
    const write = vi.fn().mockRejectedValue(new SheetsApiError('quota', 429))

    await expect(withGridGrowth('sid', 'هزینه', 200, 12, write)).rejects.toThrow('quota')
    expect(apiRequest).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/services/sheetGridGrowth.test.ts`
Expected: FAIL. `fetchGridInfo is not a function`.

- [ ] **Step 3: Implement.** Append to `src/services/sheetGrid.ts` and add the imports at the
  top of the file.

```ts
import { apiRequest, SHEETS_API, SheetsApiError } from './sheetsApi'
import { normalizeSheetTitle } from './sheetsMeta'
```

```ts
interface GridMetadataResponse {
  sheets?: {
    properties?: {
      sheetId?: number
      title?: string
      gridProperties?: { rowCount?: number; columnCount?: number; frozenRowCount?: number }
    }
  }[]
}

export async function fetchGridInfo(spreadsheetId: string): Promise<Map<string, GridInfo>> {
  const fields = encodeURIComponent(
    'sheets.properties(sheetId,title,gridProperties(rowCount,columnCount,frozenRowCount))'
  )

  const data = await apiRequest<GridMetadataResponse>(`${SHEETS_API}/${spreadsheetId}?fields=${fields}`)

  const grids = new Map<string, GridInfo>()

  for (const sheet of data.sheets ?? []) {
    const props = sheet.properties

    if (!props?.title || props.sheetId === undefined) continue

    grids.set(normalizeSheetTitle(props.title), {
      sheetId: props.sheetId,
      title: props.title,
      rowCount: props.gridProperties?.rowCount ?? 0,
      columnCount: props.gridProperties?.columnCount ?? 0,
      frozenRowCount: props.gridProperties?.frozenRowCount ?? 0
    })
  }

  return grids
}

function isGridLimitError(err: unknown): boolean {
  return err instanceof SheetsApiError && err.status === 400 && /exceeds grid limits/i.test(err.message)
}

async function growGrid(
  spreadsheetId: string,
  sheetName: string,
  minRows: number,
  minColumns: number
): Promise<void> {
  const grid = (await fetchGridInfo(spreadsheetId)).get(normalizeSheetTitle(sheetName))

  if (!grid) return

  const requests = []

  if (grid.rowCount < minRows) {
    requests.push({ appendDimension: { sheetId: grid.sheetId, dimension: 'ROWS', length: minRows - grid.rowCount } })
  }
  if (grid.columnCount < minColumns) {
    requests.push({
      appendDimension: { sheetId: grid.sheetId, dimension: 'COLUMNS', length: minColumns - grid.columnCount }
    })
  }
  if (!requests.length) return

  await apiRequest(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests })
  })
}

/**
 * values.update fails past the grid edge (only append grows it). Trimmed grids
 * make that reachable, so a write that hits the edge grows the grid and retries
 * once. A write that fits costs nothing extra.
 */
export async function withGridGrowth<T>(
  spreadsheetId: string,
  sheetName: string,
  minRows: number,
  minColumns: number,
  write: () => Promise<T>
): Promise<T> {
  try {
    return await write()
  } catch (err) {
    if (!isGridLimitError(err)) throw err
    await growGrid(spreadsheetId, sheetName, minRows, minColumns)

    return write()
  }
}
```

- [ ] **Step 4: Run both grid test files and confirm they pass**

Run: `npx vitest run src/services/sheetGrid`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/sheetGrid.ts src/services/sheetGridGrowth.test.ts
git commit -m "feature/ACCT-0/ACCT-0/Grow a trimmed grid on demand when a write reaches its edge"
```

---

### Task 3: Quoted whole-sheet ranges for reads and appends

**Files:**
- Modify: `src/services/sheetsMeta.ts` (add `quoteSheetName`)
- Modify: `src/services/sheetsRows.ts:18-27,37-43` (drop `'A:Z'`)
- Modify: `src/services/sheetsOutboxApi.ts:37` (append range)
- Modify: `src/services/dangSplit.ts:98` (`'A1:Z1'` → `'1:1'`)
- Test: `src/services/sheetsMeta.test.ts` (create if missing, otherwise extend)
- Test: `src/services/sheetsRowsBatch.test.ts:31-42` (mock adapts to quoted ranges)

**Interfaces:**
- Produces: `quoteSheetName(sheetName: string): string`, returning `'<name>'` with each `'`
  doubled.
- Produces: `fetchSheetRangeFromApi(spreadsheetId, sheetName, rangeSuffix?: string)`. With no
  suffix it reads the whole sheet.
- `SHEET_FULL_RANGE` is removed. Grep for other users before deleting it; Task 3 lists every
  user found today.

- [ ] **Step 1: Write the failing test** in `src/services/sheetsMeta.test.ts`

```ts
import { describe, expect, it } from 'vitest'

import { parseSheetNameFromRange, quoteSheetName } from './sheetsMeta'

describe('quoteSheetName', () => {
  it('quotes names and doubles apostrophes', () => {
    expect(quoteSheetName('هزینه')).toBe("'هزینه'")
    expect(quoteSheetName('هزینه 1404')).toBe("'هزینه 1404'")
    expect(quoteSheetName("o'neil")).toBe("'o''neil'")
  })

  it('round-trips through parseSheetNameFromRange', () => {
    expect(parseSheetNameFromRange(`${quoteSheetName('چک‌ها')}!A1:K9`)).toBe('چک‌ها')
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/services/sheetsMeta.test.ts`
Expected: FAIL. `quoteSheetName` is not exported.

- [ ] **Step 3: Implement**

In `src/services/sheetsMeta.ts`, next to `parseSheetNameFromRange`:

```ts
/** A1 sheet reference that stays valid for names with spaces or quotes. */
export function quoteSheetName(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`
}
```

In `src/services/sheetsRows.ts`, replace the constant and the two range builders:

```ts
// No column bound: a trimmed grid narrower than Z would reject `A:Z`, and the
// whole-sheet reference also returns hand-added columns past Z.
export async function fetchSheetRangeFromApi(
  spreadsheetId: string,
  sheetName: string,
  rangeSuffix?: string
): Promise<string[][]> {
  const ref = quoteSheetName(sheetName)
  const range = encodeURIComponent(rangeSuffix ? `${ref}!${rangeSuffix}` : ref)
```

```ts
function batchGet(spreadsheetId: string, sheetNames: string[]): Promise<BatchGetResponse> {
  const params = sheetNames.map(name => `ranges=${encodeURIComponent(quoteSheetName(name))}`).join('&')
```

Add `quoteSheetName` to the existing `./sheetsMeta` import in `sheetsRows.ts`.

In `src/services/sheetsOutboxApi.ts:37`:

```ts
  const range = encodeURIComponent(quoteSheetName(sheetName))
```

Import `quoteSheetName` from `./sheetsMeta`.

In `src/services/dangSplit.ts:98`:

```ts
    const headerRows = await fetchSheetRangeFromApi(spreadsheetId, sheetName, '1:1')
```

In `src/services/sheetsRowsBatch.test.ts`, the mock checks the raw range. Change it to work
with quoted ranges:

```ts
      if (ranges.some(range => range.includes('قالب_پیامک'))) {
        throw new SheetsApiError('Unable to parse range: قالب_پیامک!A:Z', 400)
      }

      return {
        valueRanges: ranges.map(range => ({ range, values: [['h'], [range.replace(/'/g, '')]] }))
      }
```

Then grep for anything else that still uses the old constant:

Run: `grep -rn "SHEET_FULL_RANGE\|!A:Z\|A1:Z1" src`
Expected: matches only inside test error-message strings.

- [ ] **Step 4: Run the affected tests**

Run: `npx vitest run src/services/sheetsMeta.test.ts src/services/sheetsRowsBatch.test.ts src/services/sheetSyncOutbox.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/sheetsMeta.ts src/services/sheetsMeta.test.ts src/services/sheetsRows.ts src/services/sheetsOutboxApi.ts src/services/dangSplit.ts src/services/sheetsRowsBatch.test.ts
git commit -m "feature/ACCT-0/ACCT-0/Read and append with quoted whole-sheet ranges"
```

---

### Task 4: Create new tabs at their exact size

**Files:**
- Modify: `src/services/sheetsEnsure.ts:91-103` (`batchAddSheetTabs` takes `SheetSpec[]`)
- Modify: `src/services/sheetsEnsure.ts:135` (`columnLetter`)
- Modify: `src/services/sheetsEnsure.ts:180-183` (pass the specs)
- Modify: `src/services/sheetsCreate.ts:22-33,53-55`
- Test: `src/services/sheetsEnsureGrid.test.ts`

**Interfaces:**
- Produces:
  - `batchAddSheetTabs(spreadsheetId: string, sheets: SheetSpec[]): Promise<void>`
  - `tabGridProperties(headerCount: number)`, exported from `sheetsEnsure.ts`. It returns
    `{ rowCount: 2, columnCount: headerCount, frozenRowCount: 1 }`, or `undefined` when
    `headerCount` is 0.

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsApiModule from './sheetsApi'

const apiRequest = vi.fn()

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<typeof SheetsApiModule>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args)
}))

const { batchAddSheetTabs, writeSheetHeaders } = await import('./sheetsEnsure')

describe('new tab grids', () => {
  beforeEach(() => apiRequest.mockReset().mockResolvedValue({}))

  it('creates each tab exactly as wide as its headers', async () => {
    await batchAddSheetTabs('sid', [
      { sheetName: 'هزینه', headers: ['شناسه', 'زمان ثبت', 'مبلغ'] },
      { sheetName: 'آزاد', headers: [] }
    ])

    const body = JSON.parse(apiRequest.mock.calls[0][1].body)

    expect(body.requests).toEqual([
      {
        addSheet: {
          properties: { title: 'هزینه', gridProperties: { rowCount: 2, columnCount: 3, frozenRowCount: 1 } }
        }
      },
      { addSheet: { properties: { title: 'آزاد' } } }
    ])
  })

  it('writes headers past column Z with a valid end column', async () => {
    const headers = Array.from({ length: 28 }, (_, i) => `h${i}`)

    await writeSheetHeaders('sid', 'هزینه', headers)

    expect(decodeURIComponent(apiRequest.mock.calls[0][0])).toContain('!A1:AB1')
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/services/sheetsEnsureGrid.test.ts`
Expected: FAIL. The requests carry no `gridProperties`, and the end column is not `AB`.

- [ ] **Step 3: Implement**

In `src/services/sheetsEnsure.ts`, import `columnLetter` from `./sheetsCellValues` and
`quoteSheetName` from `./sheetsMeta` (extend the existing import). Then:

```ts
/** Exact grid for a new tab; Sheets needs one unfrozen row under the frozen header. */
export function tabGridProperties(headerCount: number) {
  return headerCount > 0 ? { rowCount: 2, columnCount: headerCount, frozenRowCount: 1 } : undefined
}

async function batchAddSheetTabs(spreadsheetId: string, sheets: SheetSpec[]): Promise<void> {
  if (!sheets.length) return

  await apiRequest(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: sheets.map(sheet => {
        const gridProperties = tabGridProperties(sheet.headers.length)

        return {
          addSheet: { properties: gridProperties ? { title: sheet.sheetName, gridProperties } : { title: sheet.sheetName } }
        }
      })
    })
  })
  invalidateSheetTitlesCache(spreadsheetId)
}
```

In `writeSheetHeaders`:

```ts
  const range = encodeURIComponent(`${quoteSheetName(sheetName)}!A1:${columnLetter(headers.length)}1`)
```

In `ensureManySheetsWithHeadersInner`, pass the specs:

```ts
    await batchAddSheetTabs(spreadsheetId, missingTabs)
```

In `src/services/sheetsCreate.ts`, import `tabGridProperties` from `./sheetsEnsure` and build
the sheets with their headers:

```ts
      sheets: forms.map(form => ({
        properties: {
          title: form.sheetName,
          gridProperties: tabGridProperties(buildHeaders(form.fields).length) ?? { frozenRowCount: 1 }
        }
      }))
```

```ts
export async function addSheetTab(spreadsheetId: string, sheetName: string): Promise<void> {
  await batchAddSheetTabs(spreadsheetId, [{ sheetName, headers: [] }])
}
```

Then grep for other callers:

Run: `grep -rn "batchAddSheetTabs(" src`
Expected: only `sheetsEnsure.ts` and `sheetsCreate.ts`, both passing `SheetSpec[]`.

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run src/services/sheetsEnsureGrid.test.ts src/services/spreadsheetAccessDenied.test.ts && npm run types`
Expected: PASS, and no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/services/sheetsEnsure.ts src/services/sheetsCreate.ts src/services/sheetsEnsureGrid.test.ts
git commit -m "feature/ACCT-0/ACCT-0/Create new tabs exactly as wide as their schema"
```

---

### Task 5: Writes grow the grid when they reach its edge

**Files:**
- Modify: `src/services/sheetsOutboxApi.ts:51-69` (`updateSheetRowApi`)
- Modify: `src/services/sheetsOutboxApi.ts:103-124` (`replaceSheetDataRowsApi` write step)
- Modify: `src/services/migrateSubCategoryColumn.ts:48` (`appendHeaderColumn`)
- Test: `src/services/sheetsOutboxGrid.test.ts`

**Interfaces:**
- Consumes: `withGridGrowth` (Task 2).

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsApiModule from './sheetsApi'

const apiRequest = vi.fn()

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<typeof SheetsApiModule>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args)
}))

const { executeOutboxOperation } = await import('./sheetsOutboxApi')
const { SheetsApiError } = await import('./sheetsApi')

describe('replace on a trimmed grid', () => {
  beforeEach(() => apiRequest.mockReset())

  it('grows the grid and retries when the new rows pass its edge', async () => {
    let rejected = false

    apiRequest.mockImplementation(async (url: string, init?: { method?: string }) => {
      if (init?.method === 'PUT' && !rejected) {
        rejected = true
        throw new SheetsApiError('exceeds grid limits. Max rows: 3, max columns: 3', 400)
      }
      if (url.includes('?fields=')) {
        return { sheets: [{ properties: { sheetId: 5, title: 'دسته‌بندی‌ها', gridProperties: { rowCount: 3, columnCount: 3 } } }] }
      }

      return {}
    })

    const rows = Array.from({ length: 4 }, (_, i) => [`id${i}`, `n${i}`, ''])

    await executeOutboxOperation('sid', { type: 'replace', sheetName: 'دسته‌بندی‌ها', rows, columnCount: 3 })

    const grow = apiRequest.mock.calls.find(([url]) => String(url).includes(':batchUpdate'))!

    expect(JSON.parse(grow[1].body).requests).toEqual([
      { appendDimension: { sheetId: 5, dimension: 'ROWS', length: 2 } }
    ])
    expect(apiRequest.mock.calls.filter(([, init]) => init?.method === 'PUT')).toHaveLength(2)
  })
})
```

Before writing this test, check the `replace` operation shape in
`src/services/syncOutbox.ts:11-38`. If the field names differ (for example, `columnCount`),
use the real names in the test.

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/services/sheetsOutboxGrid.test.ts`
Expected: FAIL. The `exceeds grid limits` error propagates.

- [ ] **Step 3: Implement**

In `src/services/sheetsOutboxApi.ts`, import `withGridGrowth` from `./sheetGrid`.

`updateSheetRowApi`:

```ts
  await withGridGrowth(spreadsheetId, sheetName, rowNumber, Math.max(row.length, 1), () =>
    apiRequest(`${SHEETS_API}/${spreadsheetId}/values/${range}?${VALUE_INPUT}`, {
      method: 'PUT',
      body: JSON.stringify({ values: [toSheetRowValues(row)] })
    })
  )
```

The write step of `replaceSheetDataRowsApi`:

```ts
    await withGridGrowth(spreadsheetId, sheetName, rows.length + 1, width, () =>
      apiRequest(`${SHEETS_API}/${spreadsheetId}/values/${writeRange}?${VALUE_INPUT}`, {
        method: 'PUT',
        body: JSON.stringify({ values: rows.map(toSheetRowValues) })
      })
    )
```

In `src/services/migrateSubCategoryColumn.ts`, wrap the header write in `appendHeaderColumn`.
Import `withGridGrowth` from `./sheetGrid`.

```ts
  await withGridGrowth(spreadsheetId, sheetName, 1, nextHeader.length, () =>
    writeSheetHeaders(spreadsheetId, sheetName, nextHeader)
  )
```

Check: `wc -l src/services/sheetsOutboxApi.ts` must report ≤ 300.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/services/sheetsOutboxGrid.test.ts src/services/sheetSyncOutbox.test.ts src/services/sheetsRowGuard.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/sheetsOutboxApi.ts src/services/migrateSubCategoryColumn.ts src/services/sheetsOutboxGrid.test.ts
git commit -m "feature/ACCT-0/ACCT-0/Grow the grid when an update or replace reaches its edge"
```

---

### Task 6: One-time compaction of existing tabs

**Files:**
- Create: `src/services/migrateCompactGrids.ts`
- Modify: `src/services/spreadsheetSetup.ts:55` (export `getAllSheetSpecs`)
- Modify: `src/services/sheetSyncLifecycle.ts` (run the migration after `pullRemoteSheets`)
- Test: `src/services/migrateCompactGrids.test.ts`

**Interfaces:**
- Consumes:
  - `fetchGridInfo`, `planGridTrim`, `GridInfo`, `DeleteDimensionRequest` (Tasks 1 and 2)
  - `quoteSheetName` (Task 3)
  - `columnLetter` from `./sheetsCellValues`
  - `getSheetAllRows` from `./spreadsheetStore`
  - `hasPendingOutbox` from `./syncOutbox`
  - `getItem` / `setItem` from `./storage`
  - `getAllSheetSpecs(): SheetSpec[]` from `./spreadsheetSetup`
- Produces:
  - `migrateCompactGrids(spreadsheetId: string): Promise<void>`
  - `sheetExtent(rows: unknown[][]): { lastDataRow: number; lastDataColumn: number }`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsApiModule from './sheetsApi'

const apiRequest = vi.fn()
const getSheetAllRows = vi.fn()
const hasPendingOutbox = vi.fn()

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<typeof SheetsApiModule>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args)
}))
vi.mock('./spreadsheetStore', () => ({ getSheetAllRows: (...a: unknown[]) => getSheetAllRows(...a) }))
vi.mock('./syncOutbox', () => ({ hasPendingOutbox: (...a: unknown[]) => hasPendingOutbox(...a) }))
vi.mock('./spreadsheetSetup', () => ({
  getAllSheetSpecs: () => [
    { sheetName: 'هزینه', headers: ['شناسه', 'زمان ثبت', 'مبلغ'] },
    { sheetName: 'فعالیت', headers: ['کلید', 'مقدار'] }
  ]
}))

const { migrateCompactGrids, sheetExtent } = await import('./migrateCompactGrids')

const GRIDS = {
  sheets: [
    { properties: { sheetId: 1, title: 'هزینه', gridProperties: { rowCount: 1000, columnCount: 26, frozenRowCount: 1 } } },
    { properties: { sheetId: 2, title: 'فعالیت', gridProperties: { rowCount: 1000, columnCount: 26 } } },
    { properties: { sheetId: 9, title: 'شیت شخصی من', gridProperties: { rowCount: 1000, columnCount: 26 } } }
  ]
}

function respond(probeValues: Record<string, unknown[][]>) {
  apiRequest.mockImplementation(async (url: string) => {
    if (url.includes('values:batchGet')) {
      const ranges = new URL(url).searchParams.getAll('ranges')

      return { valueRanges: ranges.map(range => ({ range, values: probeValues[range] ?? [] })) }
    }
    if (url.includes(':batchUpdate')) return {}

    return GRIDS
  })
}

function sentRequests() {
  const call = apiRequest.mock.calls.find(([url]) => String(url).includes(':batchUpdate'))

  return call ? JSON.parse(call[1].body).requests : null
}

describe('migrateCompactGrids', () => {
  beforeEach(() => {
    localStorage.clear()
    apiRequest.mockReset()
    hasPendingOutbox.mockReturnValue(false)
    getSheetAllRows.mockImplementation((_id: string, name: string) =>
      name === 'هزینه' ? [['شناسه', 'زمان ثبت', 'مبلغ'], ['1', 't', '500']] : null
    )
  })

  it('trims app tabs in one batchUpdate and never touches user tabs', async () => {
    respond({ "'فعالیت'": [['کلید', 'مقدار'], ['last', 'x']] })

    await migrateCompactGrids('sid')

    expect(sentRequests()).toEqual([
      { deleteDimension: { range: { sheetId: 1, dimension: 'COLUMNS', startIndex: 3, endIndex: 26 } } },
      { deleteDimension: { range: { sheetId: 1, dimension: 'ROWS', startIndex: 52, endIndex: 1000 } } },
      { deleteDimension: { range: { sheetId: 2, dimension: 'COLUMNS', startIndex: 2, endIndex: 26 } } },
      { deleteDimension: { range: { sheetId: 2, dimension: 'ROWS', startIndex: 52, endIndex: 1000 } } }
    ])
  })

  it('probes columns past the data width and skips a tab that has data there', async () => {
    respond({ "'هزینه'!D:Z": [[], ['', '', 'دستی']], "'فعالیت'": [] })

    await migrateCompactGrids('sid')

    const requests = sentRequests() ?? []

    expect(requests.some((r: { deleteDimension: { range: { sheetId: number } } }) => r.deleteDimension.range.sheetId === 1)).toBe(false)
  })

  it('does nothing while writes are queued and runs only once when it succeeds', async () => {
    respond({})
    hasPendingOutbox.mockReturnValue(true)
    await migrateCompactGrids('sid')
    expect(apiRequest).not.toHaveBeenCalled()

    hasPendingOutbox.mockReturnValue(false)
    await migrateCompactGrids('sid')
    const callsAfterFirstRun = apiRequest.mock.calls.length

    await migrateCompactGrids('sid')
    expect(apiRequest.mock.calls.length).toBe(callsAfterFirstRun)
  })

  it('leaves the flag unset when the batchUpdate fails', async () => {
    respond({})
    const answer = apiRequest.getMockImplementation()!

    apiRequest.mockImplementation(async (url: string, init?: unknown) => {
      if (url.includes(':batchUpdate')) throw new Error('boom')

      return answer(url, init)
    })

    await expect(migrateCompactGrids('sid')).rejects.toThrow('boom')
    apiRequest.mockClear()
    respond({})
    await migrateCompactGrids('sid')
    expect(sentRequests()).not.toBeNull()
  })
})

describe('sheetExtent', () => {
  it('finds the last row and column holding a value', () => {
    expect(sheetExtent([['a', 'b'], [], ['', '', 'c'], ['  ']])).toEqual({ lastDataRow: 3, lastDataColumn: 3 })
    expect(sheetExtent([])).toEqual({ lastDataRow: 0, lastDataColumn: 0 })
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/services/migrateCompactGrids.test.ts`
Expected: FAIL. The module is not found.

- [ ] **Step 3: Implement** `src/services/migrateCompactGrids.ts`

```ts
import { fetchGridInfo, planGridTrim, type DeleteDimensionRequest, type GridInfo } from './sheetGrid'
import { apiRequest, SHEETS_API } from './sheetsApi'
import { columnLetter } from './sheetsCellValues'
import type { SheetSpec } from './sheetsEnsure'
import { normalizeSheetTitle, quoteSheetName } from './sheetsMeta'
import { getSheetAllRows } from './spreadsheetStore'
import { getItem, setItem } from './storage'
import { hasPendingOutbox } from './syncOutbox'

const MIGRATION_STORAGE_KEY = 'accounting_grid_compact_migration_v1'

const BATCH_GET_CHUNK = 20

type MigrationState = Record<string, true>

const running = new Set<string>()

interface Tab {
  spec: SheetSpec
  grid: GridInfo
  rows: unknown[][] | null
}

interface Probe {
  tab: number
  range: string
  /** True when the probe reads the whole tab because the mirror has no copy. */
  whole: boolean
}

function isMigrated(spreadsheetId: string): boolean {
  return Boolean((getItem<MigrationState>(MIGRATION_STORAGE_KEY) ?? {})[spreadsheetId])
}

function markMigrated(spreadsheetId: string): void {
  setItem(MIGRATION_STORAGE_KEY, { ...(getItem<MigrationState>(MIGRATION_STORAGE_KEY) ?? {}), [spreadsheetId]: true })
}

export function sheetExtent(rows: unknown[][]): { lastDataRow: number; lastDataColumn: number } {
  let lastDataRow = 0
  let lastDataColumn = 0

  rows.forEach((row, index) => {
    let last = 0

    row.forEach((cell, column) => {
      if (String(cell ?? '').trim()) last = column + 1
    })
    if (!last) return
    lastDataRow = index + 1
    lastDataColumn = Math.max(lastDataColumn, last)
  })

  return { lastDataRow, lastDataColumn }
}

function buildProbes(tabs: Tab[]): Probe[] {
  return tabs.flatMap((tab, index): Probe[] => {
    const ref = quoteSheetName(tab.grid.title)

    if (!tab.rows) return [{ tab: index, range: ref, whole: true }]

    // The mirror may come from an older A:Z read, so the columns about to go are checked live.
    const width = Math.max(tab.spec.headers.length, sheetExtent(tab.rows).lastDataColumn, 1)

    if (tab.grid.columnCount <= width) return []

    return [{ tab: index, range: `${ref}!${columnLetter(width + 1)}:${columnLetter(tab.grid.columnCount)}`, whole: false }]
  })
}

async function batchGetValues(spreadsheetId: string, ranges: string[]): Promise<unknown[][][]> {
  const values: unknown[][][] = []

  for (let i = 0; i < ranges.length; i += BATCH_GET_CHUNK) {
    const params = ranges
      .slice(i, i + BATCH_GET_CHUNK)
      .map(range => `ranges=${encodeURIComponent(range)}`)
      .join('&')

    const data = await apiRequest<{ valueRanges?: { values?: unknown[][] }[] }>(
      `${SHEETS_API}/${spreadsheetId}/values:batchGet?${params}`
    )

    for (const valueRange of data.valueRanges ?? []) values.push(valueRange.values ?? [])
  }

  return values
}

async function planCompaction(spreadsheetId: string, specs: SheetSpec[]): Promise<DeleteDimensionRequest[]> {
  const grids = await fetchGridInfo(spreadsheetId)

  const tabs = specs.flatMap((spec): Tab[] => {
    const grid = grids.get(normalizeSheetTitle(spec.sheetName))

    return grid ? [{ spec, grid, rows: getSheetAllRows(spreadsheetId, spec.sheetName) }] : []
  })

  const probes = buildProbes(tabs)

  const results = probes.length ? await batchGetValues(spreadsheetId, probes.map(probe => probe.range)) : []

  const skipped = new Set<number>()

  const fetched = new Map<number, unknown[][]>()

  probes.forEach((probe, index) => {
    const values = results[index]

    if (!values) skipped.add(probe.tab)
    else if (probe.whole) fetched.set(probe.tab, values)
    else if (sheetExtent(values).lastDataRow) skipped.add(probe.tab)
  })

  return tabs.flatMap((tab, index) => {
    const rows = tab.rows ?? fetched.get(index)

    if (skipped.has(index) || !rows) return []

    return planGridTrim({ grid: tab.grid, minWidth: tab.spec.headers.length, ...sheetExtent(rows) })
  })
}

/**
 * Shrinks every app tab to its schema width plus a small row buffer, once per
 * spreadsheet. Runs after a pull (fresh mirror) with an empty outbox, and only
 * removes rows and columns proven empty.
 */
export async function migrateCompactGrids(spreadsheetId: string): Promise<void> {
  if (!spreadsheetId || isMigrated(spreadsheetId) || running.has(spreadsheetId)) return
  if (hasPendingOutbox(spreadsheetId)) return

  running.add(spreadsheetId)
  try {
    const { getAllSheetSpecs } = await import('./spreadsheetSetup')

    const requests = await planCompaction(spreadsheetId, getAllSheetSpecs())

    if (requests.length) {
      await apiRequest(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ requests })
      })
    }
    markMigrated(spreadsheetId)
  } finally {
    running.delete(spreadsheetId)
  }
}
```

In `src/services/spreadsheetSetup.ts:55`, change `function getAllSheetSpecs` to
`export function getAllSheetSpecs`.

In `src/services/sheetSyncLifecycle.ts`, inside `fullSyncFromRemote`, right after
`await pullRemoteSheets(spreadsheetId, settings, {...})`:

```ts
      void import('./migrateCompactGrids')
        .then(({ migrateCompactGrids }) => migrateCompactGrids(spreadsheetId))
        .catch(() => undefined)
```

Check: `wc -l src/services/sheetSyncLifecycle.ts src/services/migrateCompactGrids.ts src/services/spreadsheetSetup.ts` must report ≤ 300 for each file.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/services/migrateCompactGrids.test.ts`
Expected: PASS (5 tests).

The first test's numbers:
- **هزینه:** data reaches row 2 and column 3, so columns are cut to 3 and rows are cut from
  52 (2 + 50).
- **فعالیت:** the whole-tab probe shows data in rows 1–2, so columns are cut to 2 and rows are
  cut from 52.
- **شیت شخصی من:** not in the specs, so it is untouched.

- [ ] **Step 5: Commit**

```bash
git add src/services/migrateCompactGrids.ts src/services/migrateCompactGrids.test.ts src/services/spreadsheetSetup.ts src/services/sheetSyncLifecycle.ts
git commit -m "feature/ACCT-0/ACCT-0/Compact existing tabs once to their schema width"
```

---

### Task 7: Full verification

- [ ] **Step 1:** `npm run types`. Expected: no errors.
- [ ] **Step 2:** `npm run lint`. Expected: no errors. Then run `git status` to see whether
  `--fix` changed any file, and review that change.
- [ ] **Step 3:** `npm test`. Expected: the whole suite passes.
- [ ] **Step 4:** `npm run lines`. Expected: no file over 300 lines.
- [ ] **Step 5:** `npm run build`. Expected: success.
- [ ] **Step 6:** About page. Part 1 changes nothing users see, so the About page is not
  updated. Part 2 adds the yearly-tab note.
- [ ] **Step 7:** Commit any lint or format fix-ups:
  `chore/ACCT-0/ACCT-0/Apply lint fixes for grid compaction`.
