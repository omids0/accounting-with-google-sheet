import type { CustomForm } from '../types'
import { addArchiveTab } from './archiveRegistry'
import { prepareArchiveTab, readTabs } from './archiveTabs'
import { archiveSheetName, planYearSweep } from './recordArchive'
import { copyRowsToArchive, deleteArchivedRows, idOf } from './recordArchiveMove'
import { forgetSeenSheets, stampSheetRevisions } from './sheetRevisions'
import { normalizeSheetTitle } from './sheetsMeta'
import { fetchSheetRangeFromApi } from './sheetsRows'
import { withOutboxLock } from './sheetSyncOutbox'
import { getSheetWriteVersion } from './sheetWriteVersions'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'
import { getSheetAllRows, setSheetAllRows } from './spreadsheetStore'
import { hasPendingOutbox } from './syncOutbox'
import { getTodayIso, isoToJalali } from '../utils/jalaliDate'
import { cellToString } from '../utils/sheetValues'

/**
 * Moves past-year rows of a form tab over the threshold into `<tab> <year>`
 * archives: server-side copy, verify by id, then delete only rows whose content
 * equals their archived copy. Returns true when rows moved. An unconfirmed copy
 * stops the sweep before anything is deleted; a tab with the archive name that
 * this app did not create, or with another header, is left alone.
 */
export async function sweepFormArchives(
  spreadsheetId: string,
  form: CustomForm,
  currentYear = isoToJalali(getTodayIso()).year
): Promise<boolean> {
  const versionBefore = getSheetWriteVersion(spreadsheetId, form.sheetName)

  const baseRows = await fetchSheetRangeFromApi(spreadsheetId, form.sheetName)

  const plan = planYearSweep(baseRows, form, currentYear)

  if (!plan) return false

  const tabs = await readTabs(spreadsheetId)

  const base = tabs.get(normalizeSheetTitle(form.sheetName))

  if (!base) return false

  const header = baseRows[0].map(cell => cellToString(cell))

  const planned = new Set([...plan.values()].flat())

  const stays = new Map<string, string[]>()

  baseRows.forEach((row, index) => {
    if (index > 0 && !planned.has(index) && idOf(row)) stays.set(idOf(row), row)
  })

  const archives = new Map<string, string[][]>()

  const archiveVersions = new Map<string, number>()

  for (const [year, indexes] of [...plan].sort(([a], [b]) => a - b)) {
    const tab = await prepareArchiveTab(
      spreadsheetId,
      archiveSheetName(form.sheetName, year),
      header,
      tabs
    )

    if (!tab) continue

    addArchiveTab(spreadsheetId, tab.title)
    archiveVersions.set(tab.title, getSheetWriteVersion(spreadsheetId, tab.title))

    const archived = await copyRowsToArchive(spreadsheetId, base, baseRows, tab, indexes, stays)

    if (!archived) return false

    archives.set(tab.title, archived)
  }

  if (!archives.size) return false

  // Fresh copies right before deleting: the delete compares against them.
  for (const title of archives.keys()) {
    archives.set(title, await fetchSheetRangeFromApi(spreadsheetId, title))
  }

  const remaining = await deleteArchivedRows(
    spreadsheetId,
    form,
    base,
    [...archives.values()],
    currentYear
  )

  const stale: string[] = []

  for (const [tab, rows] of archives) {
    if (getSheetWriteVersion(spreadsheetId, tab) === archiveVersions.get(tab)) {
      setSheetAllRows(spreadsheetId, tab, rows)
    } else {
      stale.push(tab)
    }
  }
  // A local write made meanwhile is newer than this read; the next pull brings both.
  if (getSheetWriteVersion(spreadsheetId, form.sheetName) === versionBefore) {
    setSheetAllRows(spreadsheetId, form.sheetName, remaining)
  }

  await stampSheetRevisions(spreadsheetId, [form.sheetName, ...archives.keys()]).catch(
    () => undefined
  )
  // A local write hit these mirrors meanwhile: download them again instead.
  if (stale.length) forgetSeenSheets(spreadsheetId, stale)
  notifySpreadsheetDataChanged(spreadsheetId)

  return true
}

let sweeping = false

/**
 * Runs after a pull. The threshold check uses the local mirror, so a sheet
 * under it costs no request. It holds the outbox lock, so no write from this
 * device (any tab) reaches the sheet while rows move, and it waits while any
 * write is queued.
 */
export async function sweepArchivesAfterPull(
  spreadsheetId: string,
  forms: CustomForm[]
): Promise<void> {
  if (sweeping || !spreadsheetId || hasPendingOutbox(spreadsheetId)) return

  const currentYear = isoToJalali(getTodayIso()).year

  const due = forms.filter(form => {
    const mirror = getSheetAllRows(spreadsheetId, form.sheetName)

    return mirror !== null && planYearSweep(mirror, form, currentYear) !== null
  })

  if (!due.length) return

  sweeping = true
  try {
    await withOutboxLock(spreadsheetId, async () => {
      for (const form of due) {
        if (hasPendingOutbox(spreadsheetId)) return
        await sweepFormArchives(spreadsheetId, form, currentYear)
      }
    })
  } finally {
    sweeping = false
  }
}
