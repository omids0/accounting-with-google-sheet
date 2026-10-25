import { dateCell, intCell, moneyCell, requiredTextCell } from './importCellValidate'
import { MAX_INSTALLMENT_COUNT } from './installmentsConstants'

export interface ValidInstallmentsCsvCells {
  title: string
  amount: number
  count: number
  dueDay: number
  startDate: string
}

/**
 * The cells of an installments CSV row the plan cannot do without (the same limits as the form:
 * count 1–300, day of month 1–31). Throws an Error whose message is the reason shown in the
 * import preview. The start date comes back as ISO.
 */
export function validateInstallmentsCsvCells(cells: string[]): ValidInstallmentsCsvCells {
  return {
    title: requiredTextCell(cells[2], 'عنوان'),
    amount: moneyCell(cells[3], 'مبلغ قسط'),
    count: intCell(cells[4], 'تعداد بازپرداخت', 1, MAX_INSTALLMENT_COUNT),
    dueDay: intCell(cells[5], 'موعد در ماه', 1, 31),
    startDate: dateCell(cells[6], 'تاریخ شروع')
  }
}
