import { dangBelowPaidMessage } from './paymentLabels'
import type { Dang } from '../../types'
import { canSetDangAmount, dangPaidAmount } from '../../utils/dangLedger'
import { formatMoney } from '../../utils/formatMoney'
import { showError } from '../../utils/toast'

/** The paid total as a hint, or undefined while nothing was paid (no floor to show). */
export function dangAmountFloor(dang: Pick<Dang, 'payments'>): number | undefined {
  const paid = dangPaidAmount(dang)

  return paid > 0 ? paid : undefined
}

/**
 * True when `amount` may become the debt's amount; otherwise shows the Persian message and
 * returns false. The service refuses too, but only with a generic error on this path.
 */
export function guardDangAmount(dang: Pick<Dang, 'payments'>, amount: number): boolean {
  if (canSetDangAmount(dang, amount)) return true

  showError(dangBelowPaidMessage(formatMoney(dangPaidAmount(dang))))

  return false
}
