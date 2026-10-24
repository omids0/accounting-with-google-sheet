import { archiveTabsOfForm } from './archiveRegistry'
import { legacyLayoutPlan, remapLegacyRow } from './legacyRowLayout'
import { buildFieldColumnMap } from './sheetsHeaders'
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
}

const QUIET = { skipActivity: true } as const

/** Rows of `tab` written in the old column order, with the row they become. Reads the local mirror only. */
function legacyRowsOfTab(spreadsheetId: string, form: CustomForm, tab: string): LegacyRowFix[] {
  const rows = getSheetAllRows(spreadsheetId, tab)

  if (!rows?.length || !isSheetHeaderRow(rows[0])) return []

  const headers = rows[0].map(cell => cellToString(cell))

  const plan = legacyLayoutPlan(
    form,
    buildFieldColumnMap(headers, form.fields),
    headerWriterColumn(headers),
    headers.length
  )

  if (!plan) return []

  const fixes: LegacyRowFix[] = []

  rows.forEach((row, index) => {
    if (index === 0 || !cellToString(row[0]).trim()) return

    const next = remapLegacyRow(row, plan)

    if (next === row) return
    fixes.push({
      sheetName: tab,
      rowNumber: index + 1,
      before: [...row],
      after: next.map(cell => cellToString(cell))
    })
  })

  return fixes
}

/** Every legacy-layout row of the income/expense tabs (and their yearly archives). */
export function findLegacyRows(spreadsheetId: string, forms: CustomForm[]): LegacyRowFix[] {
  return forms
    .filter(form => form.type === 'income' || form.type === 'expense')
    .flatMap(form =>
      [form.sheetName, ...archiveTabsOfForm(spreadsheetId, form, forms)].flatMap(tab =>
        legacyRowsOfTab(spreadsheetId, form, tab)
      )
    )
}

/** Why a repair may not start right now, or null. Queued edits would be written over by it. */
export function legacyRepairBlocker(spreadsheetId: string): string | null {
  return hasPendingOutbox(spreadsheetId)
    ? 'چند تغییر هنوز در صف همگام‌سازی است؛ بعد از ارسال آن‌ها دوباره امتحان کن.'
    : null
}

/**
 * Rewrites the rows in today's column order through the outbox: ids, times and the writer stay,
 * `expectedRow` makes a row someone changed meanwhile surface as an ordinary edit conflict. A row
 * already in today's order is never in `fixes`, so running it twice changes nothing.
 */
export async function repairLegacyRows(
  spreadsheetId: string,
  fixes: LegacyRowFix[]
): Promise<number> {
  if (!fixes.length) return 0

  const { enqueueSheetWrite } = await import('./sheetSync')

  for (const fix of fixes) {
    updateSheetDataRow(spreadsheetId, fix.sheetName, fix.rowNumber, fix.after)
    enqueueSheetWrite(spreadsheetId, {
      type: 'update',
      sheetName: fix.sheetName,
      rowNumber: fix.rowNumber,
      row: fix.after,
      expectedRow: fix.before,
      writeOptions: QUIET
    })
  }
  notifySpreadsheetDataChanged(spreadsheetId)

  return fixes.length
}
