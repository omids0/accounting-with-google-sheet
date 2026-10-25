import { choiceCell, moneyCell, optionalMoneyCell, withCells } from './importCellValidate'
import { buildJalaliMonthKey, parseJalaliMonthKey } from '../utils/dateRange'
import { normalizeDigits } from '../utils/normalizeDigits'

const SOURCES = ['auto', 'rebuilt', 'manual'] as const

/**
 * A net worth CSV row the sheet can take: a real Jalali month key («1405-07», Persian digits and
 * «۱۴۰۵-۷» are read) and the net worth as a number of either sign; assets and liabilities are
 * numbers when given, and the source auto, rebuilt or manual. Throws an Error whose message is the
 * reason shown in the import preview.
 */
export function validateNetWorthCsvCells(cells: string[]): string[] {
  const month = parseJalaliMonthKey(normalizeDigits(String(cells[0] ?? '').trim()))

  if (!month) throw new Error('کلید ماه معتبر نیست')

  return withCells(cells, {
    0: buildJalaliMonthKey(month.year, month.month),
    1: String(moneyCell(cells[1], 'دارایی خالص', 'any')),
    2: String(optionalMoneyCell(cells[2], 'دارایی‌ها', 'any')),
    3: String(optionalMoneyCell(cells[3], 'بدهی‌ها', 'any')),
    5: choiceCell(cells[5], 'منبع', SOURCES, 'auto')
  })
}
