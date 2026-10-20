import { parseSplit } from './buildingExpenseSplit'
import { getManagedList, labelOfItem, type ManagedItem } from './buildingLists'
import {
  EXPENSE_KIND_FIELD_ID,
  FUND_PAYER_KEY,
  PAYER_FIELD_ID,
  SPLIT_FIELD_ID
} from '../components/form/buildingFields'
import { toPersianDigits } from '../utils/normalizeDigits'
import { parseNumeric } from '../utils/parseNumeric'

type Values = Record<string, string | number | undefined>

const text = (values: Values, id: string) => String(values[id] ?? '').trim()

/** «عمرانی · از جیب مدیر · تقسیم‌شده» for the line under a building expense in the records list. */
export function describeBuildingExpense(
  values: Values,
  kinds: ManagedItem[] = getManagedList('EXPENSE_KINDS'),
  payers: ManagedItem[] = getManagedList('EXPENSE_PAYERS')
): string {
  const kind = text(values, EXPENSE_KIND_FIELD_ID)

  const payer = text(values, PAYER_FIELD_ID)

  const split = parseSplit(values[SPLIT_FIELD_ID])

  return [
    kind ? labelOfItem(kinds, kind) : '',
    payer && payer !== FUND_PAYER_KEY ? `از ${labelOfItem(payers, payer)}` : 'از صندوق',
    split?.charge
      ? `تقسیم‌شده (${toPersianDigits(
          String(Object.values(split.shares).filter(Boolean).length)
        )} سهم)`
      : ''
  ]
    .filter(Boolean)
    .join(' · ')
}

export interface ExpenseBreakdown {
  total: number
  byKind: { value: string; label: string; amount: number }[]
  byPayer: { value: string; label: string; amount: number }[]
}

/** The month's total and how it divides over kinds and payers (the page's hero). */
export function expenseBreakdown(
  records: { values: Values }[],
  kinds: ManagedItem[],
  payers: ManagedItem[]
): ExpenseBreakdown {
  const sum = (items: ManagedItem[], id: string, fallback: string) => {
    const totals = new Map<string, number>(items.map(item => [item.value, 0]))

    for (const record of records) {
      const key = text(record.values, id) || fallback

      totals.set(key, (totals.get(key) ?? 0) + parseNumeric(record.values.amount))
    }

    return [...totals]
      .filter(
        ([key, amount]) => amount > 0 || items.some(item => item.value === key && !item.hidden)
      )
      .map(([value, amount]) => ({
        value,
        label: value ? labelOfItem(items, value) : 'بدون نوع',
        amount
      }))
  }

  return {
    total: records.reduce((acc, record) => acc + parseNumeric(record.values.amount), 0),
    byKind: sum(kinds, EXPENSE_KIND_FIELD_ID, ''),
    byPayer: sum(payers, PAYER_FIELD_ID, FUND_PAYER_KEY)
  }
}
