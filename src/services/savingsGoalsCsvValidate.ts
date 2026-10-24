import {
  choiceCell,
  moneyCell,
  optionalDateCell,
  requiredTextCell,
  withCells
} from './importCellValidate'

const STATUSES = ['active', 'reached', 'archived'] as const

/**
 * A savings goals CSV row the sheet can take: a title and a target above zero are required (as in
 * the form), the target date, when there is one, must be a real date (it comes back as ISO) and the
 * status active, reached or archived. Throws an Error whose message is the reason shown in the
 * import preview.
 */
export function validateSavingsGoalCsvCells(cells: string[]): string[] {
  return withCells(cells, {
    2: requiredTextCell(cells[2], 'عنوان'),
    3: String(moneyCell(cells[3], 'مبلغ هدف')),
    4: optionalDateCell(cells[4], 'تاریخ هدف'),
    7: choiceCell(cells[7], 'وضعیت', STATUSES, 'active')
  })
}
