import { MAX_INSTALLMENT_COUNT } from './installmentsConstants'
import { getInstallmentDueDate, getInstallmentEndDate } from './installmentsDueDates'
import { isDateInRange } from '../utils/dateRange'
import { formatIsoDatePersian, type DateRange } from '../utils/jalaliDate'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/

/**
 * «اولین قسط … · آخرین قسط …» for the plan form, or '' while a field is still empty or invalid.
 * The first installment is not always in the start month (see `getFirstInstallmentDueDate`),
 * so the form says where the schedule really begins.
 */
export function installmentSchedulePreview(
  startDate: string,
  count: number | string,
  dueDay: number | string
): string {
  const countNumber = Number(count)
  const dueDayNumber = Number(dueDay)

  if (!ISO_DATE.test(startDate)) return ''
  if (!Number.isInteger(countNumber) || countNumber < 1 || countNumber > MAX_INSTALLMENT_COUNT) {
    return ''
  }
  if (!Number.isInteger(dueDayNumber) || dueDayNumber < 1 || dueDayNumber > 31) return ''

  const first = formatIsoDatePersian(getInstallmentDueDate(startDate, dueDayNumber, 0))
  const last = formatIsoDatePersian(getInstallmentEndDate(startDate, countNumber, dueDayNumber))

  return `اولین قسط: ${first} · آخرین قسط: ${last}`
}

/**
 * The toast for a new plan whose due dates all miss the list's period, so it would otherwise
 * look like nothing was saved. Null when it shows in the list (or has no dates). The page
 * widens its period to the plan right after (`installmentDueSpan`), which the toast says.
 */
export function installmentHiddenPlanMessage(
  dueDates: string[],
  range: DateRange | null | undefined
): string | null {
  const dates = dueDates.map(date => date.slice(0, 10)).filter(Boolean)

  if (!range || dates.length === 0) return null
  if (dates.some(date => isDateInRange(date, range))) return null

  const first = dates.reduce((min, date) => (date < min ? date : min))

  return `طرح ساخته شد؛ اولین قسط ${formatIsoDatePersian(
    first
  )} است و بازهٔ فهرست برای نشان دادنش باز شد`
}

/** First to last due date of these plans, or null when none has a due date. */
export function installmentDueSpan(plans: { payments: { dueDate: string }[] }[]): DateRange | null {
  let start = ''
  let end = ''

  for (const plan of plans) {
    for (const payment of plan.payments) {
      const date = payment.dueDate.slice(0, 10)

      if (!date) continue
      if (!start || date < start) start = date
      if (!end || date > end) end = date
    }
  }

  return start ? { start, end } : null
}
