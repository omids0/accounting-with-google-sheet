import type { ChartsRecords } from './chartsData'
import { getCounterpartyFullName } from './counterparties'
import { fetchRecords } from './sheets'
import type { AppSettings, Counterparty, CustomForm, Dang, RecordRow } from '../types'
import { getDateRange, isDateInRange, type DateRange } from '../utils/dateRange'
import { parseNumeric } from '../utils/parseNumeric'
import {
  RECONCILIATION_CATEGORY,
  SMS_RECONCILE_CATEGORY,
  TRANSFER_EXPENSE_CATEGORY
} from '../utils/protectedCategories'

/**
 * Money moved between accounts or written by a reconcile (the fund's «اصلاح موجودی», the SMS
 * «تطبیق») is not income or spending: one place for the dashboard, the fund and the reports.
 */
const NOT_FLOW = new Set([
  TRANSFER_EXPENSE_CATEGORY,
  RECONCILIATION_CATEGORY,
  SMS_RECONCILE_CATEGORY
])

export const isNonFlowCategory = (category: string | undefined) =>
  NOT_FLOW.has((category ?? '').trim())

/**
 * The records the app-wide reports (monthly report, year review) read, without the transfers and
 * fund corrections a building writes: they move money between accounts, they are not income.
 */
export const withoutNonFlow = (records: ChartsRecords): ChartsRecords => ({
  ...records,
  incomeRecords: records.incomeRecords.filter(item => !isNonFlowCategory(item.values.category)),
  expenseRecords: records.expenseRecords.filter(item => !isNonFlowCategory(item.values.category))
})

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
    .filter(record => !isNonFlowCategory(record.values.category))
}

/** The records of one side that fall in `range`, transfers and corrections left out. */
export const flowRecordsIn = (
  side: { form?: CustomForm; records: RecordRow[] },
  range: DateRange
) => inRange(side.records, dateFieldOf(side.form), range)

const total = (records: RecordRow[]) =>
  records.reduce((sum, record) => sum + parseNumeric(record.values.amount), 0)

/** Pure: collected minus spent in `range`, transfers and corrections left out. */
export function monthFlowOf(
  income: { form?: CustomForm; records: RecordRow[] },
  expense: { form?: CustomForm; records: RecordRow[] },
  range: DateRange
): MonthFlow {
  const spent = flowRecordsIn(expense, range)

  return {
    income: total(flowRecordsIn(income, range)),
    expense: total(spent),
    expenseCount: spent.length
  }
}

export type FlowSide = { form?: CustomForm; records: RecordRow[] }

/** The income and expense records of the active building, with the forms that date them. */
export async function loadFlowRecords(
  settings: AppSettings
): Promise<{ income: FlowSide; expense: FlowSide }> {
  const load = async (type: 'income' | 'expense') => {
    const form = settings.forms.find(item => item.type === type)

    return { form, records: form ? await fetchRecords(settings.spreadsheetId, form) : [] }
  }

  const [income, expense] = await Promise.all([load('income'), load('expense')])

  return { income, expense }
}

/** «↑ X در مهر · وصول − هزینه»: this Jalali month so far. */
export async function loadMonthFlow(
  settings: AppSettings,
  range = getDateRange('month-to-date')
): Promise<MonthFlow> {
  const { income, expense } = await loadFlowRecords(settings)

  return monthFlowOf(income, expense, range)
}

/**
 * The names a debt to the manager can carry: the payer «مدیر» and every person flagged `me`
 * (a dang stores its creditor as text).
 */
export function managerCreditorNames(
  payerLabel: string,
  persons: Pick<Counterparty, 'firstName' | 'lastName' | 'me'>[]
): string[] {
  return [payerLabel, ...persons.filter(person => person.me).map(getCounterpartyFullName)]
}

/** Unpaid dang whose creditor is the manager: the payer «مدیر» or a person flagged `me`. */
export function dangToManager(dangs: Dang[], managerNames: string[]): number {
  const names = new Set(managerNames.map(name => name.trim()).filter(Boolean))

  return dangs
    .filter(item => !item.paid && names.has(item.counterparty.trim()))
    .reduce((sum, item) => sum + item.amount, 0)
}
