import { SMS_RECORD_NOTE } from './bankSmsApply'
import { matchesDuplicate, type DuplicateCandidate, type LedgerEntry } from './recordDuplicates'
import type { WalletAccount } from '../types'
import { formatPersianNumber } from '../utils/formatMoney'
import { formatIsoDatePersian, getTodayIso } from '../utils/jalaliDate'

/** A payment counts as already recorded when a record of the same amount is this close in time. */
export const SETTLE_DUPLICATE_DAYS = 3

/** Titles of the records this app creates for a settlement: they belong to another payment. */
const SETTLEMENT_PREFIXES = ['بدهی: ', 'چک: ', 'قسط: ', 'طلب: ']

/**
 * The record that probably already is this payment: same direction and exact amount within
 * ±3 days, not already tied to a settlement. A bank-SMS record wins, then the newest.
 */
export function findSettleDuplicate(
  candidate: DuplicateCandidate,
  ledger: LedgerEntry[],
  linkedIds: Set<string>
): LedgerEntry | null {
  const rule = { dayTolerance: SETTLE_DUPLICATE_DAYS }
  const fromSms = (entry: LedgerEntry) => (entry.note === SMS_RECORD_NOTE ? 1 : 0)

  return (
    ledger
      .filter(
        entry =>
          matchesDuplicate(candidate, entry, rule) &&
          !(entry.id && linkedIds.has(entry.id)) &&
          !SETTLEMENT_PREFIXES.some(prefix => entry.title?.startsWith(prefix))
      )
      .sort(
        (a, b) =>
          fromSms(b) - fromSms(a) ||
          (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0) ||
          b.date.localeCompare(a.date)
      )[0] ?? null
  )
}

/** «هزینهٔ ۳٬۰۰۰٬۰۰۰ از ملت، امروز ۱۰:۱۵ (ثبت از پیامک)». */
export function describeDuplicate(
  entry: LedgerEntry,
  accounts: Pick<WalletAccount, 'id' | 'title'>[]
): string {
  const expense = entry.type === 'expense'
  const account = accounts.find(item => item.id === entry.accountId)?.title
  const day = entry.date === getTodayIso() ? 'امروز' : formatIsoDatePersian(entry.date)
  const time =
    typeof entry.createdAtMs === 'number'
      ? new Date(entry.createdAtMs).toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      : ''

  return [
    `${expense ? 'هزینهٔ' : 'درآمد'} ${formatPersianNumber(entry.amount)}`,
    account ? ` ${expense ? 'از' : 'به'} ${account}` : '',
    `، ${day}${time ? ` ${time}` : ''}`,
    entry.note === SMS_RECORD_NOTE ? ` (${SMS_RECORD_NOTE})` : ''
  ].join('')
}
