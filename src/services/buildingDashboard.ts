import { isMonthIssued } from './buildingCharges'
import { monthKeyOf } from './buildingSummary'
import { fetchRecords } from './sheets'
import type { AppSettings, CustomForm, Dang, Receivable, RecordRow } from '../types'
import { getDateRange, isDateInRange, type DateRange } from '../utils/dateRange'
import { getJalaliParts } from '../utils/jalaliDate'
import { parseNumeric } from '../utils/parseNumeric'
import { RECONCILIATION_CATEGORY, TRANSFER_EXPENSE_CATEGORY } from '../utils/protectedCategories'

/** Money moved between accounts or written by a fund reconcile is not income or spending. */
const NOT_FLOW = new Set([TRANSFER_EXPENSE_CATEGORY, RECONCILIATION_CATEGORY])

export interface MonthFlow {
  income: number
  expense: number
  /** How many expense records the month has («هزینه‌ها · ۲ مورد»). */
  expenseCount: number
}

const dateFieldOf = (form: CustomForm | undefined) =>
  form?.fields.find(field => field.type === 'date')?.id ?? 'date'

function inRange(records: RecordRow[], dateField: string, range: DateRange): RecordRow[] {
  return records
    .filter(record => isDateInRange(record.values[dateField] ?? '', range))
    .filter(record => !NOT_FLOW.has((record.values.category ?? '').trim()))
}

const total = (records: RecordRow[]) =>
  records.reduce((sum, record) => sum + parseNumeric(record.values.amount), 0)

/** Pure: collected minus spent in `range`, transfers and corrections left out. */
export function monthFlowOf(
  income: { form?: CustomForm; records: RecordRow[] },
  expense: { form?: CustomForm; records: RecordRow[] },
  range: DateRange
): MonthFlow {
  const spent = inRange(expense.records, dateFieldOf(expense.form), range)

  return {
    income: total(inRange(income.records, dateFieldOf(income.form), range)),
    expense: total(spent),
    expenseCount: spent.length
  }
}

/** «↑ X در مهر · وصول − هزینه»: this Jalali month so far. */
export async function loadMonthFlow(
  settings: AppSettings,
  range = getDateRange('month-to-date')
): Promise<MonthFlow> {
  const load = async (type: 'income' | 'expense') => {
    const form = settings.forms.find(item => item.type === type)

    return { form, records: form ? await fetchRecords(settings.spreadsheetId, form) : [] }
  }

  const [income, expense] = await Promise.all([load('income'), load('expense')])

  return monthFlowOf(income, expense, range)
}

/** Unpaid dang whose creditor is the manager: the payer «مدیر» or a person flagged `me`. */
export function dangToManager(dangs: Dang[], managerNames: string[]): number {
  const names = new Set(managerNames.map(name => name.trim()).filter(Boolean))

  return dangs
    .filter(item => !item.paid && names.has(item.counterparty.trim()))
    .reduce((sum, item) => sum + item.amount, 0)
}

/**
 * The month whose charge the dashboard asks to issue: the current one, once its issue day has
 * come and nobody was billed for it yet. Null otherwise.
 */
export function monthToIssue(
  profile: { issueDay: number },
  receivables: Receivable[],
  now = new Date()
): string | null {
  const key = monthKeyOf(now)

  return getJalaliParts(now).day >= profile.issueDay && !isMonthIssued(receivables, key)
    ? key
    : null
}
