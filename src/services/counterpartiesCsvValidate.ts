import { jsonArrayCell, optionalDateCell, requiredTextCell, withCells } from './importCellValidate'

/**
 * A counterparties CSV row the sheet can take: first and last name are required (as in the form),
 * the birth date, when there is one, must be a real date (it comes back as ISO) and the accounts
 * cell a JSON list. Throws an Error whose message is the reason shown in the import preview.
 */
export function validateCounterpartyCsvCells(cells: string[]): string[] {
  const firstName = requiredTextCell(cells[2], 'نام')
  const lastName = requiredTextCell(cells[3], 'نام خانوادگی')
  const birthDate = optionalDateCell(cells[4], 'تاریخ تولد')

  jsonArrayCell(cells[8], 'حساب‌ها')

  return withCells(cells, { 2: firstName, 3: lastName, 4: birthDate })
}
