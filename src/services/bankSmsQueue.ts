import { toAppCurrency } from './bankSmsAmount'
import { matchSms, type LearnedSmsRefs } from './bankSmsMatch'
import type { BankSmsItem } from './bankSmsNative'
import { matchesDuplicate, type LedgerEntry } from './recordDuplicates'
import type { CurrencyUnit, SmsMatchResult, SmsTemplate, WalletAccount } from '../types'
import { toIsoDate } from '../utils/jalaliDate'

export type { LedgerEntry } from './recordDuplicates'

export type MatchedSms = Extract<SmsMatchResult, { kind: 'matched' }>

/** A recognised SMS with its amounts already in the app currency. */
export interface ReviewedSms {
  sms: BankSmsItem
  result: SmsMatchResult
  /** App-currency values; `null` when the result is not matched/ambiguous or currency is foreign. */
  amount: number | null
  balance: number | null
}

export type ConfirmableSms = ReviewedSms & { result: MatchedSms; amount: number }

export type BankSmsReviewItem =
  | {
      kind: 'single'
      key: string
      entry: ReviewedSms
      probableDuplicate: boolean
      /** The matching record names this SMS's account, so it already moved the balance. */
      duplicateMovedBalance: boolean
      /** The newest matching record, for «تکراری؟ · رکورد ۱۲ دقیقه پیش». */
      duplicateOf: LedgerEntry | null
    }
  | {
      kind: 'transfer'
      key: string
      debit: ConfirmableSms
      credit: ConfirmableSms
    }

/** Debit and credit SMS of one own-account transfer arrive within this window. */
export const TRANSFER_WINDOW_MS = 10 * 60 * 1000

type MatchAccount = Pick<WalletAccount, 'id' | 'cardNumber' | 'accountNumber' | 'iban'>

export function reviewSms(
  items: BankSmsItem[],
  templates: SmsTemplate[],
  accounts: MatchAccount[],
  currency: CurrencyUnit,
  learned: LearnedSmsRefs = {}
): ReviewedSms[] {
  return [...items]
    .sort((a, b) => a.receivedAt - b.receivedAt)
    .map(sms => {
      const result = matchSms(sms.body, templates, accounts, learned)
      const values = result.kind === 'matched' || result.kind === 'ambiguous' ? result : null

      return {
        sms,
        result,
        amount: values ? toAppCurrency(values.amount, values.unit, currency) : null,
        balance:
          values && values.balance !== null
            ? toAppCurrency(values.balance, values.unit, currency)
            : null
      }
    })
    .filter(entry => entry.result.kind !== 'irrelevant')
}

/** Matched to one account with an amount in app currency, so it can be written. */
export function isConfirmable(entry: ReviewedSms): entry is ConfirmableSms {
  return entry.result.kind === 'matched' && entry.amount !== null
}

/** Same direction and amount within a day of the SMS (shared rule, `recordDuplicates`). */
function findDuplicates(entry: ReviewedSms, ledger: LedgerEntry[]): LedgerEntry[] {
  if (!isConfirmable(entry)) return []

  const candidate = {
    type: entry.result.direction === 'debit' ? ('expense' as const) : ('income' as const),
    amount: entry.amount,
    date: toIsoDate(new Date(entry.sms.receivedAt))
  }

  return ledger.filter(record => matchesDuplicate(candidate, record, { dayTolerance: 1 }))
}

/** Latest by date, then by «زمان ثبت»; `null` for an empty list. */
export function newestRecord(records: LedgerEntry[]): LedgerEntry | null {
  return records.reduce<LedgerEntry | null>(
    (best, record) =>
      !best ||
      record.date > best.date ||
      (record.date === best.date && (record.createdAtMs ?? 0) > (best.createdAtMs ?? 0))
        ? record
        : best,
    null
  )
}

export function isProbableDuplicate(entry: ReviewedSms, ledger: LedgerEntry[]): boolean {
  return findDuplicates(entry, ledger).length > 0
}

/**
 * Pairs own-account transfers, flags probable duplicates, keeps time order.
 * `noPair` = SMS ids the user split from a suggested transfer.
 */
export function buildReviewItems(
  entries: ReviewedSms[],
  ledger: LedgerEntry[],
  noPair: ReadonlySet<string> = new Set()
): BankSmsReviewItem[] {
  const paired = new Set<string>()
  const items: BankSmsReviewItem[] = []

  for (const entry of entries) {
    if (paired.has(entry.sms.id)) continue

    const partner =
      isConfirmable(entry) && !noPair.has(entry.sms.id)
        ? entries.find(
            other =>
              other !== entry &&
              !paired.has(other.sms.id) &&
              !noPair.has(other.sms.id) &&
              isConfirmable(other) &&
              other.result.direction !== entry.result.direction &&
              other.result.accountId !== entry.result.accountId &&
              other.amount === entry.amount &&
              Math.abs(other.sms.receivedAt - entry.sms.receivedAt) <= TRANSFER_WINDOW_MS
          )
        : undefined

    if (partner && isConfirmable(entry) && isConfirmable(partner)) {
      const [debit, credit] =
        entry.result.direction === 'debit' ? [entry, partner] : [partner, entry]

      paired.add(entry.sms.id)
      paired.add(partner.sms.id)
      items.push({ kind: 'transfer', key: `${debit.sms.id}:${credit.sms.id}`, debit, credit })
      continue
    }

    const duplicates = findDuplicates(entry, ledger)

    items.push({
      kind: 'single',
      key: entry.sms.id,
      entry,
      probableDuplicate: duplicates.length > 0,
      duplicateMovedBalance:
        isConfirmable(entry) &&
        duplicates.some(record => record.accountId === entry.result.accountId),
      duplicateOf: newestRecord(duplicates)
    })
  }

  return items
}

/** Per account: what the SMS confirmed so far already account for. */
export interface AccountBalanceState {
  /** `receivedAt` of the SMS whose «مانده» last set the balance. */
  anchor?: number
  /** Newest `receivedAt` applied in any way. */
  lastAppliedAt?: number
}

/**
 * New balance after one SMS, or `null` when the balance must not move.
 * - Older than the anchor: that «مانده» already includes it.
 * - Has a «مانده» and is the newest so far: the balance becomes that «مانده».
 * - Otherwise (no «مانده», or confirmed after a newer SMS): add/subtract the amount,
 *   because a «مانده» from the past would undo the newer SMS already applied.
 */
export function nextAccountBalance(
  current: number,
  change: { receivedAt: number; direction: MatchedSms['direction']; amount: number },
  smsBalance: number | null,
  state: AccountBalanceState
): { balance: number; state: AccountBalanceState } | null {
  const { anchor, lastAppliedAt } = state

  if (anchor !== undefined && change.receivedAt < anchor) return null

  const lastApplied = Math.max(lastAppliedAt ?? 0, change.receivedAt)

  if (smsBalance !== null && change.receivedAt >= (lastAppliedAt ?? 0)) {
    return { balance: smsBalance, state: { anchor: change.receivedAt, lastAppliedAt: lastApplied } }
  }

  const delta = change.direction === 'debit' ? -change.amount : change.amount

  return { balance: current + delta, state: { anchor, lastAppliedAt: lastApplied } }
}

/** Pin an SMS that fits several accounts to one of them; `null` when it cannot be written. */
export function resolveSmsAccount(entry: ReviewedSms, accountId: string): ConfirmableSms | null {
  const { result, amount } = entry

  if (amount === null) return null
  if (result.kind === 'matched') return { ...entry, result, amount }
  if (result.kind !== 'ambiguous') return null

  const candidate = result.candidates.find(item => item.accountId === accountId)

  if (!candidate) return null

  const { direction, unit, balance, ref } = result

  return {
    ...entry,
    amount,
    result: { kind: 'matched', ...candidate, direction, unit, amount: result.amount, balance, ref }
  }
}

/** The account a card starts with: the matched one, else the first candidate. */
export function initialSmsAccount(entry: ReviewedSms): string {
  const { result } = entry

  if (result.kind === 'matched') return result.accountId

  return result.kind === 'ambiguous' ? result.candidates[0]?.accountId ?? '' : ''
}
