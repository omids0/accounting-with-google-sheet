import type { StoredRecord } from './recordsUtils'
import { parseLineItems, type LineItem } from '../../utils/lineItems'
import { parseNumeric } from '../../utils/parseNumeric'
import {
  COUNTERPARTY_FIELD_ID,
  LINE_ITEMS_FIELD_ID,
  WALLET_ACCOUNT_FIELD_ID,
  WALLET_APPLY_FIELD_ID,
  WALLET_APPLY_NO
} from '../form/fieldUtils'

export const ALL_COUNTERPARTIES = 'all'
export const ALL_WALLET_ACCOUNTS = 'all'

type RecordValues = Pick<StoredRecord, 'values'>

/** The counterparty name a record carries; '' when it has none. */
export function recordCounterparty(record: RecordValues): string {
  return (record.values[COUNTERPARTY_FIELD_ID] ?? '').trim()
}

/** The invoice line items a record carries; [] when it has none. */
export function recordLineItems(record: RecordValues): LineItem[] {
  return parseLineItems(record.values[LINE_ITEMS_FIELD_ID])
}

export function matchesCounterpartyFilter(record: RecordValues, filter: string): boolean {
  return filter === ALL_COUNTERPARTIES || recordCounterparty(record) === filter
}

export function matchesWithItemsFilter(record: RecordValues, withItemsOnly: boolean): boolean {
  return !withItemsOnly || recordLineItems(record).length > 0
}

/** The counterparty names used by `records`, sorted for the filter picker. */
export function distinctCounterparties(records: RecordValues[]): string[] {
  const names = new Set<string>()

  for (const record of records) {
    const name = recordCounterparty(record)

    if (name) names.add(name)
  }

  return [...names].sort((a, b) => a.localeCompare(b, 'fa'))
}

/** The id of the wallet account a record names; '' when it has none. */
export function recordWalletAccount(record: RecordValues): string {
  return (record.values[WALLET_ACCOUNT_FIELD_ID] ?? '').trim()
}

export function matchesWalletAccountFilter(record: RecordValues, filter: string): boolean {
  return filter === ALL_WALLET_ACCOUNTS || recordWalletAccount(record) === filter
}

/** The account ids named by `records`, for the filter picker. */
export function distinctWalletAccounts(records: RecordValues[]): string[] {
  return [...new Set(records.map(recordWalletAccount).filter(Boolean))]
}

/** Inclusive amount bounds; an empty end ('') is open. */
export function matchesAmountRangeFilter(
  record: RecordValues,
  min: number | '',
  max: number | ''
): boolean {
  if (min === '' && max === '') return true

  const amount = parseNumeric(record.values.amount)

  return (min === '' || amount >= min) && (max === '' || amount <= max)
}

/** Smaller end first: a reversed pair from the dialog is swapped, not left to match nothing. */
export function orderedRange(min: number | '', max: number | ''): [number | '', number | ''] {
  return min !== '' && max !== '' && min > max ? [max, min] : [min, max]
}

export type RecordWalletState = 'applied' | 'skipped' | 'none'

/** Whether a record moved an account balance: 'none' without an account, 'skipped' when «اثر بر موجودی» is خیر. */
export function recordWalletState(record: RecordValues): RecordWalletState {
  if (!(record.values[WALLET_ACCOUNT_FIELD_ID] ?? '').trim()) return 'none'

  return record.values[WALLET_APPLY_FIELD_ID] === WALLET_APPLY_NO ? 'skipped' : 'applied'
}
