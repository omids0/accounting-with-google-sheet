import type { ManagedItem, ManagedListId } from './buildingLists'
import { getSettings } from './settings'
import { fetchRecords } from './sheets'
import { CHARGE_TO_OPTIONS, optionLabel } from '../components/buildings/buildingOptions'
import {
  EXPENSE_KIND_FIELD_ID,
  FUND_PAYER_KEY,
  PAYER_FIELD_ID
} from '../components/form/buildingFields'
import { toPersianDigits } from '../utils/normalizeDigits'

/** How many expense records use each value of a managed list: `{ [value]: count }`. */
export type ListUsage = Record<string, number>

type Values = Record<string, string | number | undefined>

/** A record without a payer was paid by the fund; one without a kind belongs to no value. */
export function countListUsage(records: { values: Values }[], id: ManagedListId): ListUsage {
  const field = id === 'EXPENSE_KINDS' ? EXPENSE_KIND_FIELD_ID : PAYER_FIELD_ID

  const fallback = id === 'EXPENSE_KINDS' ? '' : FUND_PAYER_KEY

  const usage: ListUsage = {}

  for (const record of records) {
    const value = String(record.values[field] ?? '').trim() || fallback

    if (value) usage[value] = (usage[value] ?? 0) + 1
  }

  return usage
}

/** Reads the expense records of the building (mirror first) and counts them for `id`. */
export async function loadListUsage(spreadsheetId: string, id: ManagedListId): Promise<ListUsage> {
  const form = getSettings()?.forms.find(item => item.type === 'expense')

  if (!form) return {}

  return countListUsage(await fetchRecords(spreadsheetId, form), id)
}

/** The fund is every expense's default payer: hiding it would leave the form without one. */
export function canHideItem(id: ManagedListId, item: ManagedItem): boolean {
  return !(id === 'EXPENSE_PAYERS' && item.value === FUND_PAYER_KEY)
}

/**
 * The grey line under a row of «فهرست‌ها»: «سهم به نام: ساکن · ۲ هزینه»; a hidden value says so
 * and counts its old records.
 */
export function listRowMeta(id: ManagedListId, item: ManagedItem, count: number): string {
  const used = toPersianDigits(String(count))

  const parts: string[] = []

  if (item.hidden) parts.push('پنهان')
  else if (id === 'EXPENSE_KINDS')
    parts.push(`سهم به نام: ${optionLabel(CHARGE_TO_OPTIONS, item.chargeTo ?? 'resident')}`)

  if (count) parts.push(item.hidden ? `${used} هزینهٔ قدیمی` : `${used} هزینه`)
  else if (!item.hidden && id === 'EXPENSE_PAYERS') parts.push('بدون هزینه')

  return parts.join(' · ')
}
