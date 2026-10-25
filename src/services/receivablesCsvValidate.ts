import { dateCell, moneyCell, requiredTextCell } from './importCellValidate'

export interface ValidReceivablesCsvCells {
  title: string
  debtor: string
  category: string
  amount: number
  borrowDate: string
}

/**
 * The cells of a receivables CSV row the sheet cannot do without (what the form requires).
 * Throws an Error whose message is the reason shown in the import preview; an empty category
 * reads «سایر». The loan date comes back as ISO.
 */
export function validateReceivablesCsvCells(cells: string[]): ValidReceivablesCsvCells {
  return {
    title: requiredTextCell(cells[2], 'عنوان'),
    debtor: requiredTextCell(cells[3], 'طرف حساب'),
    category: (cells[4] ?? '').trim() || 'سایر',
    amount: moneyCell(cells[5], 'مبلغ'),
    borrowDate: dateCell(cells[6], 'تاریخ قرض')
  }
}
