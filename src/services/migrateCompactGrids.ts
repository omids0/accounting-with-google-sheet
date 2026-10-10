import {
  fetchGridInfo,
  planGridTrim,
  type DeleteDimensionRequest,
  type GridInfo
} from './sheetGrid'
import { apiRequest, SHEETS_API, SheetsApiError } from './sheetsApi'
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

interface TabTrim {
  grid: GridInfo
  requests: DeleteDimensionRequest[]
}

function isMigrated(spreadsheetId: string): boolean {
  return Boolean((getItem<MigrationState>(MIGRATION_STORAGE_KEY) ?? {})[spreadsheetId])
}

function markMigrated(spreadsheetId: string): void {
  const state = getItem<MigrationState>(MIGRATION_STORAGE_KEY) ?? {}

  setItem(MIGRATION_STORAGE_KEY, { ...state, [spreadsheetId]: true })
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

/** The A1 range a deleteDimension request would remove. */
function regionOf(title: string, request: DeleteDimensionRequest): string {
  const { dimension, startIndex, endIndex } = request.deleteDimension.range

  const bounds =
    dimension === 'COLUMNS'
      ? `${columnLetter(startIndex + 1)}:${columnLetter(endIndex)}`
      : `${startIndex + 1}:${endIndex}`

  return `${quoteSheetName(title)}!${bounds}`
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

/**
 * The mirror only proposes a trim: it can be stale or partial. Every region a
 * request would remove is read live, and a tab is trimmed only when all of its
 * regions come back empty.
 */
async function planCompaction(spreadsheetId: string, specs: SheetSpec[]): Promise<TabTrim[]> {
  const grids = await fetchGridInfo(spreadsheetId)

  const proposed = specs.flatMap((spec): TabTrim[] => {
    const grid = grids.get(normalizeSheetTitle(spec.sheetName))

    if (!grid) return []

    const rows = getSheetAllRows(spreadsheetId, spec.sheetName) ?? []

    const requests = planGridTrim({ grid, minWidth: spec.headers.length, ...sheetExtent(rows) })

    return requests.length ? [{ grid, requests }] : []
  })

  const regions = proposed.flatMap((tab, index) =>
    tab.requests.map(request => ({ tab: index, range: regionOf(tab.grid.title, request) }))
  )

  const results = regions.length
    ? await batchGetValues(
        spreadsheetId,
        regions.map(region => region.range)
      )
    : []

  const unsafe = new Set<number>()

  regions.forEach((region, index) => {
    const values = results[index]

    // No answer is treated as unknown, and data means the region is in use.
    if (!values || sheetExtent(values).lastDataRow) unsafe.add(region.tab)
  })

  return proposed.filter((_, index) => !unsafe.has(index))
}

async function sendTrims(spreadsheetId: string, requests: DeleteDimensionRequest[]): Promise<void> {
  await apiRequest(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests })
  })
}

/**
 * One batchUpdate is all-or-nothing, so a tab Sheets refuses to trim would
 * block every other tab on every pull. On a refusal each tab is sent on its own
 * and the ones still refused are left as they are.
 */
async function applyTrims(spreadsheetId: string, trims: TabTrim[]): Promise<void> {
  try {
    await sendTrims(
      spreadsheetId,
      trims.flatMap(tab => tab.requests)
    )
  } catch (err) {
    if (!(err instanceof SheetsApiError) || err.status !== 400) throw err

    for (const tab of trims) {
      // A tab Sheets still refuses stays as it is; the others are already trimmed.
      await sendTrims(spreadsheetId, tab.requests).catch(() => undefined)
    }
  }
}

/**
 * Shrinks every app tab to its schema width plus a small row buffer, once per
 * spreadsheet. Runs after a pull with an empty outbox, removes only regions a
 * live read just proved empty, and never touches tabs the user created.
 */
export async function migrateCompactGrids(spreadsheetId: string): Promise<void> {
  if (!spreadsheetId || isMigrated(spreadsheetId) || running.has(spreadsheetId)) return
  if (hasPendingOutbox(spreadsheetId)) return

  running.add(spreadsheetId)
  try {
    const { getAllSheetSpecs } = await import('./spreadsheetSetup')

    const trims = await planCompaction(spreadsheetId, getAllSheetSpecs())

    // A local write queued while probing could land inside a region: try again later.
    if (hasPendingOutbox(spreadsheetId)) return

    if (trims.length) await applyTrims(spreadsheetId, trims)
    markMigrated(spreadsheetId)
  } finally {
    running.delete(spreadsheetId)
  }
}
