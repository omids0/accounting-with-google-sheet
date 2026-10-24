import {
  choiceCell,
  dateCell,
  optionalIntCell,
  optionalMoneyCell,
  requiredTextCell,
  withCells
} from './importCellValidate'

const RECURRENCES = ['none', 'monthly', 'yearly'] as const

/** How many days ahead a reminder can fire: a year. */
const MAX_DAYS_BEFORE = 365

/**
 * A personal reminders CSV row the sheet can take: a title and a real due date (it comes back as
 * ISO) are required, as in the form; the repeat must be none, monthly or yearly, the amount a
 * number from zero up and «روز_قبل» a whole number of days. Throws an Error whose message is the
 * reason shown in the import preview.
 */
export function validatePersonalReminderCsvCells(cells: string[]): string[] {
  return withCells(cells, {
    3: requiredTextCell(cells[3], 'عنوان'),
    4: dateCell(cells[4], 'تاریخ'),
    5: choiceCell(cells[5], 'تکرار', RECURRENCES, 'yearly'),
    6: String(optionalMoneyCell(cells[6], 'مبلغ')),
    7: String(optionalIntCell(cells[7], 'روز قبل', 0, MAX_DAYS_BEFORE, 0))
  })
}
