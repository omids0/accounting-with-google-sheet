import { getItem, setItem } from './storage'

const START_DATE_KEY = 'accounting_start_date'

let cached: string | null = null

/**
 * Earliest date a user may record income or expense against. Resolved during
 * dashboard/wallet loads and cached here so form date pickers can read it
 * synchronously while rendering.
 */
export function getAccountingStartDate(): string {
  if (cached !== null) return cached

  cached = getItem<string>(START_DATE_KEY) ?? ''

  return cached
}

export function setAccountingStartDate(iso: string): void {
  if (!iso || iso === getAccountingStartDate()) return

  cached = iso
  setItem(START_DATE_KEY, iso)
}
