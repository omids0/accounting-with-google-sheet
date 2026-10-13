import { ACTIVITY_LOG_SHEET } from './sheetNames'
import type { CustomForm } from '../types'
import { isoToJalali } from '../utils/jalaliDate'
import { cellToString, isSheetHeaderRow, normalizeSheetDate } from '../utils/sheetValues'

/** Rows «فعالیت_ها» keeps; older ones move to yearly archives after a pull. */
export const ACTIVITY_LOG_KEEP = 2000

/**
 * The feed tab seen as a form whose date is «زمان», so the record archive
 * sweep (copy, verify, delete) moves its old rows into `فعالیت_ها <year>`.
 */
export const ACTIVITY_LOG_FORM: CustomForm = {
  id: 'activity-log',
  name: 'فعالیت',
  sheetName: ACTIVITY_LOG_SHEET,
  type: 'custom',
  fields: [{ id: 'at', label: 'زمان', type: 'date', required: true }]
}

/**
 * Jalali years, oldest first, holding the rows past the newest `keep` ones.
 * Whole past years move; the current year always stays in the tab.
 */
export function planActivitySweepYears(
  allRows: string[][],
  currentYear: number,
  keep: number
): number[] {
  if (!allRows.length || !isSheetHeaderRow(allRows[0])) return []

  const dates = allRows
    .slice(1)
    .filter(row => cellToString(row[0]).trim())
    .map(row => normalizeSheetDate(row[1]))

  if (dates.length <= keep) return []

  const oldest = dates
    .filter(Boolean)
    .sort()
    .slice(0, dates.length - keep)
  const years = new Set(oldest.map(iso => isoToJalali(iso).year).filter(year => year < currentYear))

  return [...years].sort((a, b) => a - b)
}
