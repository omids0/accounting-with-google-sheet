import { moneyCell, requiredTextCell } from './importCellValidate'

export interface ValidWalletCsvCells {
  title: string
  balance: number
}

/**
 * The cells of a wallet account CSV row the sheet cannot do without: a title and a balance that is
 * a number (a negative balance is kept, an account can be overdrawn). Throws an Error whose message
 * is the reason shown in the import preview.
 */
export function validateWalletCsvCells(cells: string[]): ValidWalletCsvCells {
  return {
    title: requiredTextCell(cells[2], 'عنوان'),
    balance: moneyCell(cells[3], 'موجودی', 'any')
  }
}
