import type { InstallmentPayment, InstallmentPlan } from '../types'
import { isoToJalali, JALALI_MONTHS } from '../utils/jalaliDate'
import { normalizeSheetDate } from '../utils/sheetValues'

/** «قسط مهر وام مسکن» for the activity feed. */
export function installmentTitle(plan: InstallmentPlan, payment: InstallmentPayment): string {
  const due = normalizeSheetDate(payment.dueDate)
  const month = due ? JALALI_MONTHS[isoToJalali(due).month - 1] : ''

  return ['قسط', month, plan.title].filter(Boolean).join(' ')
}
