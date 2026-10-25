import { dateCell, moneyCell, requiredTextCell } from './importCellValidate'

export interface ValidDangCsvCells {
  title: string
  category: string
  counterparty: string
  amount: number
  date: string
}

/**
 * The cells of a debts CSV row the sheet cannot do without (what the form requires).
 * Throws an Error whose message is the reason shown in the import preview; an empty category
 * reads «سایر». The date comes back as ISO.
 */
export function validateDangCsvCells(cells: string[]): ValidDangCsvCells {
  return {
    title: requiredTextCell(cells[2], 'عنوان'),
    category: (cells[3] ?? '').trim() || 'سایر',
    counterparty: requiredTextCell(cells[4], 'طرف حساب'),
    amount: moneyCell(cells[5], 'مبلغ'),
    date: dateCell(cells[6], 'تاریخ')
  }
}
