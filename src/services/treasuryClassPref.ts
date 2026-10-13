import { getItem, setItem } from './storage'
import type { VaultAssetClass } from '../types'

/** Per spreadsheet: `{ [spreadsheetId]: TreasuryClassFilter }`; wiped with the account. */
export const TREASURY_CLASS_STORAGE_KEY = 'accounting_treasury_class_v1'

/** «همه», one asset class, or the savings goals chip (round 6, Task B3). */
export type TreasuryClassFilter = 'all' | 'goals' | VaultAssetClass

export function getTreasuryClassFilter(spreadsheetId: string | undefined): TreasuryClassFilter {
  if (!spreadsheetId) return 'all'

  return (
    getItem<Record<string, TreasuryClassFilter>>(TREASURY_CLASS_STORAGE_KEY)?.[spreadsheetId] ??
    'all'
  )
}

export function setTreasuryClassFilter(
  spreadsheetId: string | undefined,
  value: TreasuryClassFilter
): void {
  if (!spreadsheetId) return

  const store = getItem<Record<string, TreasuryClassFilter>>(TREASURY_CLASS_STORAGE_KEY) ?? {}

  try {
    setItem(TREASURY_CLASS_STORAGE_KEY, { ...store, [spreadsheetId]: value })
  } catch {
    // Private mode: the choice lasts until the page closes.
  }
}
