import type { Dang, DangPayment } from '../types'
import { isComplete, paidTotal, remainingOf } from './paymentLedger'

type Ledger = Pick<Dang, 'amount' | 'payments'>

/** How much of the debt has been paid so far. */
export function dangPaidAmount(dang: Pick<Dang, 'payments'>): number {
  return paidTotal(dang.payments)
}

/** How much is still owed (never negative). */
export function dangRemaining(dang: Ledger): number {
  return remainingOf(dang.amount, dang.payments)
}

/** Settled = something was owed and it is all paid; a debt of 0 is never «settled». */
export function isDangSettled(dang: Ledger): boolean {
  return dang.amount > 0 && isComplete(dang.amount, dang.payments)
}

/** Where a debt stands: nothing paid yet, paid in part, or all paid. */
export type DangPaymentStatus = 'unpaid' | 'partial' | 'settled'

export function dangPaymentStatus(dang: Ledger): DangPaymentStatus {
  if (isDangSettled(dang)) return 'settled'

  return dangPaidAmount(dang) > 0 ? 'partial' : 'unpaid'
}

/** The amount of a debt cannot drop below what was already paid. */
export function canSetDangAmount(dang: Pick<Dang, 'payments'>, amount: number): boolean {
  return amount >= dangPaidAmount(dang)
}

/** Sum of what is still owed on the debts not yet settled. */
export function unpaidDangTotal(items: Ledger[]): number {
  return items.filter(item => !isDangSettled(item)).reduce((sum, d) => sum + dangRemaining(d), 0)
}

/**
 * The legacy columns «پرداخت شده / زمان پرداخت / شناسه تراکنش», always written from the payments so
 * an older app build that only knows them reads something sane: set once settled, from the last payment.
 */
export function dangPaidColumns(dang: Ledger): {
  paid: boolean
  paidAt: string
  transactionRecordId: string
} {
  const settled = isDangSettled(dang)
  const last: DangPayment | undefined = dang.payments[dang.payments.length - 1]

  return {
    paid: settled,
    paidAt: settled ? last?.paidAt ?? '' : '',
    transactionRecordId: settled ? last?.transactionRecordId ?? '' : ''
  }
}
