import { dateCell, moneyCell, optionalDateCell, requiredTextCell } from './importCellValidate'

export interface ValidChecksCsvCells {
  counterparty: string
  amount: number
  creationDate: string
  dueDate: string
}

/**
 * The cells of a checks CSV row the sheet cannot do without. Throws an Error whose message is
 * the reason shown in the import preview (see `ImportRowTransform`). Dates come back as ISO.
 */
export function validateChecksCsvCells(cells: string[]): ValidChecksCsvCells {
  return {
    counterparty: requiredTextCell(cells[3], 'طرف حساب'),
    amount: moneyCell(cells[4], 'مبلغ'),
    creationDate: optionalDateCell(cells[5], 'تاریخ صدور'),
    dueDate: dateCell(cells[6], 'تاریخ سررسید')
  }
}
