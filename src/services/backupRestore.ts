import { addArchiveTab } from './archiveRegistry'
import { prepareArchiveTab, readTabs, type TabInfo } from './archiveTabs'
import { fetchTabsByTitle, sendPendingWrites } from './backupExport'
import {
  BACKUP_EXCLUDED_SHEETS,
  planTabRestore,
  type RestoreMode,
  type TabRestorePlan
} from './backupPlan'
import { unpackBackup, type BackupManifest } from './backupZip'
import { parseArchiveSheetName } from './recordArchive'
import { getSettings } from './settings'
import { forgetSeenSheets, stampSheetRevisions } from './sheetRevisions'
import { ensureManySheetsWithHeaders } from './sheetsEnsure'
import { normalizeSheetTitle } from './sheetsMeta'
import { appendSheetRowsApi, replaceSheetDataRowsApi } from './sheetsOutboxApi'
import { batchFetchSheetRangesFromApi } from './sheetsRows'
import { invalidateDerivedCaches } from './sheetSyncOutbox'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'
import { getAllSheetSpecs } from './spreadsheetSetup'
import { setManySheetAllRows } from './spreadsheetStore'

export interface RestoreTab {
  name: string
  csv: string
  rows: number
  /** The registry's headers; empty for a yearly archive (its CSV header is used). */
  headers: string[]
  archive: boolean
}

export interface RestorePreview {
  manifest: BackupManifest
  tabs: RestoreTab[]
  /** Tabs in the file this app does not know: ignored and reported. */
  unknownTabs: string[]
}

export interface RestoreProgress {
  done: number
  total: number
  tab: string
}

export interface RestoreReport {
  tabs: number
  written: number
  skipped: number
  unknownTabs: string[]
  /** Archive tabs whose name is taken by a tab this app did not create. */
  incompatibleTabs: string[]
}

/** Stopped part-way (auth, network, quota): `report` holds what was already written. */
export class RestoreAbortedError extends Error {
  constructor(readonly report: RestoreReport, readonly failure: unknown) {
    super('بازیابی نیمه‌کاره ماند')
    this.name = 'RestoreAbortedError'
  }
}

/** Rows per append request; keeps one request well under the API's payload limit. */
const APPEND_CHUNK_ROWS = 2000

/** Matches the zip's tabs against the registry and this spreadsheet's record forms. */
export function previewBackup(bytes: Uint8Array): RestorePreview {
  const { manifest, csvByTab } = unpackBackup(bytes)

  const specs = new Map(
    getAllSheetSpecs()
      .filter(spec => !BACKUP_EXCLUDED_SHEETS.includes(spec.sheetName))
      .map(spec => [normalizeSheetTitle(spec.sheetName), spec])
  )

  const forms = getSettings()?.forms ?? []

  const preview: RestorePreview = { manifest, tabs: [], unknownTabs: [] }

  for (const tab of manifest.tabs) {
    const csv = csvByTab.get(tab.name)

    const spec = specs.get(normalizeSheetTitle(tab.name))

    const rows = Number(tab.rows) || 0

    if (csv === undefined) preview.unknownTabs.push(tab.name)
    else if (spec)
      preview.tabs.push({ name: spec.sheetName, csv, rows, headers: spec.headers, archive: false })
    else if (parseArchiveSheetName(tab.name, forms)) {
      preview.tabs.push({ name: tab.name, csv, rows, headers: [], archive: true })
    } else preview.unknownTabs.push(tab.name)
  }

  return preview
}

/**
 * A replaced tab is rewritten row by row to `width` columns: a shorter row (a backup from before
 * a column was added) is padded with empty cells, so no cell of the rows it replaces is left over.
 */
export function padRowsToWidth(rows: string[][], width: number): string[][] {
  return rows.map(row =>
    row.length >= width ? row : [...row, ...Array(width - row.length).fill('')]
  )
}

async function writeTab(
  spreadsheetId: string,
  tab: RestoreTab,
  plan: TabRestorePlan,
  mode: RestoreMode
): Promise<void> {
  if (mode === 'replace') {
    const width = Math.max(plan.header.length, tab.headers.length, 1)

    await replaceSheetDataRowsApi(spreadsheetId, tab.name, padRowsToWidth(plan.rows, width), width)

    return
  }

  for (let start = 0; start < plan.rows.length; start += APPEND_CHUNK_ROWS) {
    await appendSheetRowsApi(
      spreadsheetId,
      tab.name,
      plan.rows.slice(start, start + APPEND_CHUNK_ROWS)
    )
  }
}

/**
 * Brings the local mirror up to the restored tabs and tells other devices they
 * changed. If the fresh read fails, the next pull downloads them instead.
 */
async function refreshRestoredTabs(spreadsheetId: string, names: string[]): Promise<void> {
  if (!names.length) return

  try {
    await stampSheetRevisions(spreadsheetId, names)
  } catch {
    /* other devices still notice through Drive's modifiedTime */
  }

  try {
    setManySheetAllRows(spreadsheetId, await batchFetchSheetRangesFromApi(spreadsheetId, names))
  } catch {
    forgetSeenSheets(spreadsheetId, names)
  }

  invalidateDerivedCaches(spreadsheetId)
  notifySpreadsheetDataChanged(spreadsheetId)
}

async function prepareTabs(
  spreadsheetId: string,
  tabs: RestoreTab[]
): Promise<Map<string, TabInfo> | null> {
  await ensureManySheetsWithHeaders(
    spreadsheetId,
    tabs.filter(tab => !tab.archive).map(tab => ({ sheetName: tab.name, headers: tab.headers }))
  )

  return tabs.some(tab => tab.archive) ? readTabs(spreadsheetId) : null
}

/**
 * Restores tab by tab with the round-4 import rules (see `planTabRestore`).
 * Any failure — an expired sign-in above all — stops the run; tabs already
 * written stay written and are reported through {@link RestoreAbortedError}.
 */
export async function runRestore(
  spreadsheetId: string,
  preview: RestorePreview,
  mode: RestoreMode,
  onProgress: (progress: RestoreProgress) => void
): Promise<RestoreReport> {
  const report: RestoreReport = {
    tabs: 0,
    written: 0,
    skipped: 0,
    unknownTabs: [...preview.unknownTabs],
    incompatibleTabs: []
  }

  const total = preview.tabs.length

  const touched: string[] = []

  try {
    await sendPendingWrites(spreadsheetId)

    const archiveTabs = await prepareTabs(spreadsheetId, preview.tabs)

    const existing =
      mode === 'merge'
        ? await fetchTabsByTitle(
            spreadsheetId,
            preview.tabs.map(tab => tab.name)
          )
        : new Map<string, string[][]>()

    for (const [index, tab] of preview.tabs.entries()) {
      onProgress({ done: index, total, tab: tab.name })

      const plan = planTabRestore({
        sheetName: tab.name,
        csv: tab.csv,
        mode,
        existingRows: (existing.get(normalizeSheetTitle(tab.name)) ?? []).slice(1)
      })

      if (tab.archive) {
        if (
          !archiveTabs ||
          !(await prepareArchiveTab(spreadsheetId, tab.name, plan.header, archiveTabs))
        ) {
          report.incompatibleTabs.push(tab.name)
          continue
        }
        addArchiveTab(spreadsheetId, tab.name)
      }

      if (mode === 'replace' || plan.rows.length) {
        await writeTab(spreadsheetId, tab, plan, mode)
        touched.push(tab.name)
      }
      report.tabs++
      report.written += plan.rows.length
      report.skipped += plan.duplicates + plan.invalid.length
    }
    onProgress({ done: total, total, tab: '' })
  } catch (err) {
    throw new RestoreAbortedError(report, err)
  } finally {
    await refreshRestoredTabs(spreadsheetId, touched).catch(() => undefined)
  }

  return report
}
