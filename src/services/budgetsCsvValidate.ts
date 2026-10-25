import { moneyCell, requiredTextCell, withCells } from './importCellValidate'

/**
 * A budgets CSV row the sheet can take: a category and a monthly amount above zero. Throws an
 * Error whose message is the reason shown in the import preview.
 */
export function validateBudgetCsvCells(cells: string[]): string[] {
  return withCells(cells, {
    0: requiredTextCell(cells[0], 'دسته'),
    1: String(moneyCell(cells[1], 'مبلغ ماهانه'))
  })
}
