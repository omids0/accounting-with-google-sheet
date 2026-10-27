/** The part of a payment every ledger (receivables, debts) needs to add things up. */
interface LedgerPayment {
  amount: number
}

/**
 * The payments JSON of a «پرداخت‌ها» cell. Tolerant: an empty, broken or non-array cell reads as
 * no payments, and entries that are not objects are dropped.
 */
export function parsePayments<T extends LedgerPayment>(raw: string | undefined): T[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)

    if (Array.isArray(parsed)) {
      return parsed.filter(item => item && typeof item === 'object') as T[]
    }
  } catch {
    /* use default */
  }

  return []
}

export function paidTotal(payments: readonly LedgerPayment[]): number {
  return payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
}

export function remainingOf(amount: number, payments: readonly LedgerPayment[]): number {
  return Math.max(0, amount - paidTotal(payments))
}

/** Nothing left to pay (an amount of 0 is complete, like a receivable). */
export function isComplete(amount: number, payments: readonly LedgerPayment[]): boolean {
  return remainingOf(amount, payments) <= 0
}
