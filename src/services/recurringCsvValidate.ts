import { choiceCell, intCell, moneyCell, withCells } from './importCellValidate'
import { normalizeMonthKey } from './recurring'

const TYPES = ['income', 'expense'] as const

const MODES = ['reminder', 'auto'] as const

/**
 * A recurring items CSV row the sheet can take: the type (income or expense), an amount above
 * zero and the day of the month (1–31) are required; the mode is reminder or auto and the last
 * posted month a real month key («1405-07»). Throws an Error whose message is the reason shown
 * in the import preview.
 */
export function validateRecurringCsvCells(cells: string[]): string[] {
  const type = String(cells[2] ?? '').trim()

  if (!type) throw new Error('نوع خالی است')

  const lastPosted = String(cells[10] ?? '').trim()

  const monthKey = normalizeMonthKey(lastPosted)

  if (lastPosted && !monthKey) throw new Error('ماه آخرین ثبت معتبر نیست')

  return withCells(cells, {
    2: choiceCell(type, 'نوع', TYPES, 'expense'),
    6: String(moneyCell(cells[6], 'مبلغ')),
    8: String(intCell(cells[8], 'روز ماه', 1, 31)),
    9: choiceCell(cells[9], 'حالت', MODES, 'reminder'),
    10: monthKey
  })
}
