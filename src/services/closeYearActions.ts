import { getArchiveTabs } from './archiveRegistry'
import { nextYearOpeningMonth } from './closeYear'
import { patchCloseYearState } from './closeYearStore'
import {
  DERIVED_OPENING_BALANCE_NOTE,
  fetchAllOpeningBalances,
  setOpeningBalance
} from './monthlyBalance'
import { joinOpeningBalanceMirror } from './openingBalanceService'
import { getAnchorMonthKey } from './periodSettings'
import { archiveSheetName, parseArchiveSheetName, planYearSweep } from './recordArchive'
import { sweepFormArchives } from './recordArchiveSweep'
import { fetchSheetRangeFromApi } from './sheetsRows'
import { withOutboxLock } from './sheetSyncOutbox'
import { getSheetAllRows } from './spreadsheetStore'
import { loadWalletPeriodFlow } from './wallet'
import type { AppSettings, CustomForm } from '../types'

export interface OpeningMonths {
  monthKeys: string[]
  anchorMonthKey: string
}

/** Months «موجودی ماهانه» already holds, and where the automatic chain starts. */
export async function readOpeningMonths(spreadsheetId: string): Promise<OpeningMonths> {
  const [balances, anchorMonthKey] = await Promise.all([
    fetchAllOpeningBalances(spreadsheetId),
    getAnchorMonthKey(spreadsheetId).catch(() => '')
  ])

  return { monthKeys: balances.map(balance => balance.monthKey), anchorMonthKey }
}

/**
 * Writes the opening balance of فروردین after `year` through the opening-balance
 * chain. Once that month has come, the chain's mirror writes it. Still in Esfand,
 * this month's projected closing balance is written; the chain overwrites it
 * with the derived value once فروردین arrives, so a later record is not lost.
 */
export async function writeNextYearOpening(settings: AppSettings, year: number): Promise<void> {
  const monthKey = nextYearOpeningMonth(year)
  const flow = await loadWalletPeriodFlow(settings)

  await joinOpeningBalanceMirror(settings.spreadsheetId)

  if (flow.monthKey >= monthKey) return

  await setOpeningBalance(
    settings.spreadsheetId,
    monthKey,
    flow.openingBalance + flow.totalIncome - flow.totalExpense,
    DERIVED_OPENING_BALANCE_NOTE
  )
}

export interface YearArchiveTab {
  form: CustomForm
  /** `<form tab> <year>`, the archive the rows move to. */
  title: string
  /** Rows of the year still in the form tab. */
  rows: number
}

/** The wizard moves one year, whatever the tab size (round 4 waits for 5 000 rows). */
function yearOptions(year: number) {
  return { minRows: 0, year }
}

/** Rows of `year` per record form, from the local mirror (one read when it is missing). */
export async function countYearArchiveRows(
  spreadsheetId: string,
  forms: CustomForm[],
  year: number
): Promise<YearArchiveTab[]> {
  return Promise.all(
    forms.map(async form => {
      const rows =
        getSheetAllRows(spreadsheetId, form.sheetName) ??
        (await fetchSheetRangeFromApi(spreadsheetId, form.sheetName).catch(() => []))
      const plan = planYearSweep(rows, form, year + 1, yearOptions(year))

      return {
        form,
        title: archiveSheetName(form.sheetName, year),
        rows: plan?.get(year)?.length ?? 0
      }
    })
  )
}

/** This app's archive tabs that hold `year`. */
export function yearArchiveTabs(spreadsheetId: string, forms: CustomForm[], year: number) {
  return getArchiveTabs(spreadsheetId).filter(
    title => parseArchiveSheetName(title, forms)?.year === year
  )
}

/**
 * «آرشیو کن»: the round-4 sweep for `year` only, one form tab at a time, under the
 * outbox lock. Queued edits are sent first. Nothing is deleted that was not
 * copied and verified; true when any row moved (the archive time is stored).
 */
export async function archiveYearRecords(
  spreadsheetId: string,
  forms: CustomForm[],
  year: number,
  onProgress: (done: number, total: number) => void
): Promise<boolean> {
  const { sendPendingWrites } = await import('./backupExport')

  await sendPendingWrites(spreadsheetId)

  const due = (await countYearArchiveRows(spreadsheetId, forms, year)).filter(tab => tab.rows)
  let moved = false

  onProgress(0, due.length)
  await withOutboxLock(spreadsheetId, async () => {
    for (const [index, tab] of due.entries()) {
      if (await sweepFormArchives(spreadsheetId, tab.form, year + 1, yearOptions(year))) {
        moved = true
      }
      onProgress(index + 1, due.length)
    }
  })

  if (moved) patchCloseYearState(spreadsheetId, year, { archivedAt: Date.now() })

  return moved
}
