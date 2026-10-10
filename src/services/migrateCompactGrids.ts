import {
  fetchGridInfo,
  planGridTrim,
  type DeleteDimensionRequest,
  type GridInfo
} from './sheetGrid'
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

function buildProbes(tabs: Tab[]): Probe[] {
  return tabs.flatMap((tab, index): Probe[] => {
    const ref = quoteSheetName(tab.grid.title)

    if (!tab.rows) return [{ tab: index, range: ref, whole: true }]

    // The mirror may come from an older A:Z read, so the columns about to go are checked live.
    const width = Math.max(tab.spec.headers.length, sheetExtent(tab.rows).lastDataColumn, 1)

    if (tab.grid.columnCount <= width) return []

    const range = `${ref}!${columnLetter(width + 1)}:${columnLetter(tab.grid.columnCount)}`

    return [{ tab: index, range, whole: false }]
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

async function planCompaction(
  spreadsheetId: string,
  specs: SheetSpec[]
): Promise<DeleteDimensionRequest[]> {
  const grids = await fetchGridInfo(spreadsheetId)

  const tabs = specs.flatMap((spec): Tab[] => {
    const grid = grids.get(normalizeSheetTitle(spec.sheetName))

    return grid ? [{ spec, grid, rows: getSheetAllRows(spreadsheetId, spec.sheetName) }] : []
  })

  const probes = buildProbes(tabs)

  const results = probes.length
    ? await batchGetValues(
        spreadsheetId,
        probes.map(probe => probe.range)
      )
    : []

  const skipped = new Set<number>()

  const fetched = new Map<number, unknown[][]>()

  probes.forEach((probe, index) => {
    const values = results[index]

    // A missing answer is treated as unknown: the tab is left alone.
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
 * removes rows and columns proven empty. Tabs the user created are not touched.
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
