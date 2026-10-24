import type { SortDirection } from '../hooks/useListSort'
import { getInstallmentDueDateInRange, isInstallmentPlanComplete } from '../services/installments'
import type { InstallmentPlan } from '../types'
import type { DateRange } from './dateRange'

export type InstallmentSortId = 'dueDate' | 'amount' | 'title'

/** «صعودی» on the date is nearest first; the default is the first option. */
export const INSTALLMENT_SORT_OPTIONS = [
  { id: 'dueDate' as const, label: 'تاریخ سررسید', defaultDirection: 'asc' as const },
  { id: 'amount' as const, label: 'مبلغ قسط', defaultDirection: 'desc' as const },
  { id: 'title' as const, label: 'عنوان', defaultDirection: 'asc' as const }
]

/**
 * Finished plans stay at the end in either direction. The date is the one the card shows
 * (the due date inside `range`), not the next unpaid date of the whole plan.
 */
export function compareInstallmentPlans<T extends InstallmentPlan>(
  a: T,
  b: T,
  sort: InstallmentSortId,
  direction: SortDirection,
  range: DateRange
): number {
  const aComplete = isInstallmentPlanComplete(a)

  const bComplete = isInstallmentPlanComplete(b)

  if (aComplete !== bComplete) return aComplete ? 1 : -1

  let result = 0

  switch (sort) {
    case 'dueDate':
      result = getInstallmentDueDateInRange(a, range).localeCompare(
        getInstallmentDueDateInRange(b, range)
      )
      break
    case 'amount':
      result = a.amount - b.amount
      break
    case 'title':
      result = a.title.localeCompare(b.title, 'fa')
      break
  }

  if (direction === 'desc') result = -result

  // A tie keeps the nearest date, then the title, so the order never jumps between renders.
  return (
    result ||
    getInstallmentDueDateInRange(a, range).localeCompare(getInstallmentDueDateInRange(b, range)) ||
    a.title.localeCompare(b.title, 'fa')
  )
}
