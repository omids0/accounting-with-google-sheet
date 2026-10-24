import { archiveTabsOfForm } from './archiveRegistry'
import { classifyRow, legacyLayoutPlan, losesCells, remapLegacyRow } from './legacyRowLayout'
import { withGridGrowth } from './sheetGrid'
import { apiRequest, SHEETS_API } from './sheetsApi'
import { columnLetter, rowsMatchForCompare, toSheetRowValues } from './sheetsCellValues'
import { buildFieldColumnMap } from './sheetsHeaders'
import { quoteSheetName } from './sheetsMeta'
import { fetchSheetRangeFromApi } from './sheetsRows'
import { announceWrites, readDriveTime } from './sheetSyncAnnounce'
import { withOutboxLock } from './sheetSyncOutbox'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'
import { getSheetAllRows, updateSheetDataRow } from './spreadsheetStore'
import { hasPendingOutbox } from './syncOutbox'
import type { CustomForm } from '../types'
import { cellToString, isSheetHeaderRow } from '../utils/sheetValues'
import { headerWriterColumn } from '../utils/writerColumn'

export interface LegacyRowFix {
  sheetName: string
  /** 1-based sheet row (the header is row 1). */
  rowNumber: number
  before: string[]
  after: string[]
  /** The tab's header and number of rows when it was scanned, to notice that it changed since. */
  header: string[]
  tabRowCount: number
}

/** Rows per values:batchUpdate request; 273 rows are 3 requests, not 273. */
export const REPAIR_CHUNK_ROWS = 100

/** A row that looks legacy but is left alone: the user checks it by hand. */
export interface LegacyRowReview {
  sheetName: string
  rowNumber: number
  id: string
  /** `ambiguous`: a current row could look like this; `unmapped`: a cell has no column to go to. */
  reason: 'ambiguous' | 'unmapped'
}

export interface LegacyScan {
  fixes: LegacyRowFix[]
  review: LegacyRowReview[]
}

/** Rows of `tab` written in the old column order, with the row they become. Reads the local mirror only. */
function scanTab(spreadsheetId: string, form: CustomForm, tab: string): LegacyScan {
  const scan: LegacyScan = { fixes: [], review: [] }

  const rows = getSheetAllRows(spreadsheetId, tab)

  if (!rows?.length || !isSheetHeaderRow(rows[0])) return scan

  const headers = rows[0].map(cell => cellToString(cell))

  const plan = legacyLayoutPlan(
    form,
    buildFieldColumnMap(headers, form.fields),
    headerWriterColumn(headers),
    headers.length
  )

  if (!plan) return scan

  rows.forEach((row, index) => {
    const id = cellToString(row[0]).trim()

    if (index === 0 || !id) return

    const kind = classifyRow(row, plan)

    if (kind === 'current') return

    const next = remapLegacyRow(row, plan)

    if (kind === 'ambiguous' || losesCells(row, next)) {
      scan.review.push({
        sheetName: tab,
        rowNumber: index + 1,
        id,
        reason: kind === 'ambiguous' ? 'ambiguous' : 'unmapped'
      })

      return
    }
    scan.fixes.push({
      sheetName: tab,
      rowNumber: index + 1,
      before: [...row],
      after: next.map(cell => cellToString(cell)),
      header: headers,
      tabRowCount: rows.length
    })
  })

  return scan
}

/** Every legacy-layout row of the income/expense tabs (and their yearly archives). */
export function scanLegacyRows(spreadsheetId: string, forms: CustomForm[]): LegacyScan {
  const scans = forms
    .filter(form => form.type === 'income' || form.type === 'expense')
    .flatMap(form =>
      [form.sheetName, ...archiveTabsOfForm(spreadsheetId, form, forms)].map(tab =>
        scanTab(spreadsheetId, form, tab)
      )
    )

  return {
    fixes: scans.flatMap(scan => scan.fixes),
    review: scans.flatMap(scan => scan.review)
  }
}

export const findLegacyRows = (spreadsheetId: string, forms: CustomForm[]): LegacyRowFix[] =>
  scanLegacyRows(spreadsheetId, forms).fixes

/** One repaired row in words: title, and category and amount as shown now and after the repair. */
export function describeFix(fix: LegacyRowFix) {
  const column = (label: string) =>
    fix.header.findIndex(cell => cellToString(cell).trim() === label)

  const [title, category, amount] = ['عنوان', 'دسته‌بندی', 'مبلغ'].map(column)

  const at = (row: string[], index: number) => (index >= 0 ? cellToString(row[index]).trim() : '')

  return {
    rowNumber: fix.rowNumber,
    title: at(fix.after, title),
    before: { category: at(fix.before, category), amount: at(fix.before, amount) },
    after: { category: at(fix.after, category), amount: at(fix.after, amount) }
  }
}

/** Why a repair may not start right now, or null. Queued edits would be written over by it. */
export function legacyRepairBlocker(spreadsheetId: string): string | null {
  return hasPendingOutbox(spreadsheetId)
    ? 'چند تغییر هنوز در صف همگام‌سازی است؛ بعد از ارسال آن‌ها دوباره امتحان کن.'
    : null
}

export interface RepairResult {
  /** Rows now in today's column order. */
  written: number
  /** Rows left alone because they changed since the scan (edited, or already repaired). */
  skipped: number
  /** True when the tab no longer matches the scan: nothing at all was written. */
  aborted: boolean
}

const NOTHING: RepairResult = { written: 0, skipped: 0, aborted: false }

/** The fixes of one tab as the sheet itself holds them now, or null when the tab moved on. */
async function verifyAgainstSheet(
  spreadsheetId: string,
  tab: string,
  fixes: LegacyRowFix[]
): Promise<{ live: LegacyRowFix[]; skipped: number } | null> {
  const fresh = await fetchSheetRangeFromApi(spreadsheetId, tab)

  const [first] = fixes

  // Rows added, removed or re-labelled since the scan: row numbers cannot be trusted any more.
  if (fresh.length !== first.tabRowCount || !rowsMatchForCompare(fresh[0] ?? [], first.header)) {
    return null
  }
  if (fixes.some(fix => cellToString(fresh[fix.rowNumber - 1]?.[0]) !== fix.before[0])) return null

  const live = fixes.filter(fix => rowsMatchForCompare(fresh[fix.rowNumber - 1] ?? [], fix.before))

  return { live, skipped: fixes.length - live.length }
}

async function writeChunk(spreadsheetId: string, tab: string, chunk: LegacyRowFix[]) {
  const data = chunk.map(fix => ({
    range: `${quoteSheetName(tab)}!A${fix.rowNumber}:${columnLetter(fix.after.length)}${
      fix.rowNumber
    }`,
    values: [toSheetRowValues(fix.after)]
  }))

  const lastRow = Math.max(...chunk.map(fix => fix.rowNumber))

  const width = Math.max(...chunk.map(fix => fix.after.length))

  await withGridGrowth(spreadsheetId, tab, lastRow, width, () =>
    apiRequest(`${SHEETS_API}/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ valueInputOption: 'RAW', data })
    })
  )
  for (const fix of chunk) updateSheetDataRow(spreadsheetId, tab, fix.rowNumber, fix.after)
}

/**
 * Rewrites the scanned rows in today's column order with a few values:batchUpdate requests
 * (`REPAIR_CHUNK_ROWS` rows each) instead of one outbox write per row. Under the outbox lock it
 * first reads each tab again: if the row count, the header or an id moved since the scan nothing
 * is written; a single row that is no longer exactly what was scanned is skipped, so an edit made
 * meanwhile is never overwritten. Rows already in today's order are never in `fixes`, so a second
 * run finds nothing.
 */
export function repairLegacyRows(
  spreadsheetId: string,
  fixes: LegacyRowFix[]
): Promise<RepairResult> {
  if (!fixes.length) return Promise.resolve(NOTHING)

  return withOutboxLock(spreadsheetId, async () => {
    const byTab = new Map<string, LegacyRowFix[]>()

    for (const fix of fixes) byTab.set(fix.sheetName, [...(byTab.get(fix.sheetName) ?? []), fix])

    // Verify every tab before the first write: a changed tab aborts the whole repair.
    const verified = new Map<string, LegacyRowFix[]>()

    let skipped = 0

    for (const [tab, tabFixes] of byTab) {
      const result = await verifyAgainstSheet(spreadsheetId, tab, tabFixes)

      if (!result) return { written: 0, skipped: 0, aborted: true }
      verified.set(tab, result.live)
      skipped += result.skipped
    }

    const driveBefore = await readDriveTime(spreadsheetId)

    const touched = new Set<string>()

    let written = 0

    try {
      for (const [tab, live] of verified) {
        for (let at = 0; at < live.length; at += REPAIR_CHUNK_ROWS) {
          const chunk = live.slice(at, at + REPAIR_CHUNK_ROWS)

          await writeChunk(spreadsheetId, tab, chunk)
          touched.add(tab)
          written += chunk.length
        }
      }
    } finally {
      if (touched.size) {
        notifySpreadsheetDataChanged(spreadsheetId)
        await announceWrites(spreadsheetId, touched, driveBefore)
      }
    }

    return { written, skipped, aborted: false }
  })
}
