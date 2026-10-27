import { dateCell, jsonArrayCell, moneyCell, requiredTextCell } from './importCellValidate'
import { paidTotal, parsePayments } from '../utils/paymentLedger'

export interface ValidDangCsvCells {
  title: string
  category: string
  counterparty: string
  amount: number
  date: string
}

/** Column «پرداخت‌ها» of the debts CSV (absent in files exported before partial payments). */
const PAYMENTS_LABEL = 'ستون «پرداخت‌ها»'

/**
 * The payments cell, when there is one: a JSON array whose every amount is above zero and whose
 * sum does not pass the debt (a file edited by hand must not import a debt paid more than owed).
 */
function validatePaymentsCell(cell: string | undefined, amount: number): void {
  jsonArrayCell(cell, PAYMENTS_LABEL)

  const payments = parsePayments<{ amount: number }>(cell)

  if (payments.some(payment => !(Number(payment.amount) > 0))) {
    throw new Error(`مبلغ هر پرداخت در ${PAYMENTS_LABEL} باید بیشتر از صفر باشد`)
  }
  if (paidTotal(payments) > amount) {
    throw new Error(`جمع پرداخت‌ها در ${PAYMENTS_LABEL} از مبلغ بدهی بیشتر است`)
  }
}

/**
 * The cells of a debts CSV row the sheet cannot do without (what the form requires).
 * Throws an Error whose message is the reason shown in the import preview; an empty category
 * reads «سایر». The date comes back as ISO.
 */
export function validateDangCsvCells(cells: string[]): ValidDangCsvCells {
  const valid = {
    title: requiredTextCell(cells[2], 'عنوان'),
    category: (cells[3] ?? '').trim() || 'سایر',
    counterparty: requiredTextCell(cells[4], 'طرف حساب'),
    amount: moneyCell(cells[5], 'مبلغ'),
    date: dateCell(cells[6], 'تاریخ')
  }

  validatePaymentsCell(cells[13], valid.amount)

  return valid
}
