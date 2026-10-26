import { toAppCurrency } from './bankSmsAmount'
import { matchSms, type LearnedSmsRefs } from './bankSmsMatch'
import type { BankSmsItem } from './bankSmsNative'
import { SMS_RECORD_NOTE } from './bankSmsNote'
import {
  findSplitTarget,
  LINKED_PAYMENT_DAYS,
  NO_COVERAGE,
  NO_LINKED,
  uncoveredLinked,
  type LinkedPaymentInfo,
  type LinkedRecords,
  type SmsCoverage
} from './bankSmsSplit'
import { matchesDuplicate, type LedgerEntry } from './recordDuplicates'
import type { CurrencyUnit, SmsMatchResult, SmsTemplate, WalletAccount } from '../types'
import { toIsoDate } from '../utils/jalaliDate'
import { roundMoney } from '../utils/roundMoney'

export type { LedgerEntry } from './recordDuplicates'
export { LINKED_PAYMENT_DAYS }
export type { LinkedPaymentInfo, LinkedRecords, SmsCoverage }
export { initialSmsAccount, resolveSmsAccount } from './bankSmsAccount'
export { nextAccountBalance, setsAbsoluteBalance, type AccountBalanceState } from './bankSmsBalance'

/** Ordinary records match an SMS within a day. */
const DUPLICATE_DAYS = 1

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
      /** The matching record is the payment of a debt/receivable: the SMS is probably that payment. */
      duplicatePayment: LinkedPaymentInfo | null
      /**
       * The SMS is smaller than `duplicateOf` (one payment, several SMS): what of that record no SMS
       * covered yet. `null` for an exact match or no match.
       */
      splitUncovered: number | null
    }
  | {
      kind: 'transfer'
      key: string
      debit: ConfirmableSms
      credit: ConfirmableSms
      /**
       * The record of each leg that already exists on that account (same direction and amount within
       * a day): confirming the pair would move that balance a second time.
       */
      duplicateLegs: { debit: LedgerEntry | null; credit: LedgerEntry | null }
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

/** What a recognised SMS would be written as: its direction, amount and day. */
export function smsDuplicateCandidate(entry: ConfirmableSms) {
  return {
    type: entry.result.direction === 'debit' ? ('expense' as const) : ('income' as const),
    amount: entry.amount,
    date: toIsoDate(new Date(entry.sms.receivedAt))
  }
}

/**
 * Same direction and amount within a day of the SMS (shared rule, `recordDuplicates`); within
 * three days for a record that is a debt/receivable payment, unless an SMS created it (that SMS
 * is its payment, a later one only matches it as an ordinary duplicate). A record in `taken` is
 * what an earlier card of the same list already stands for: one record matches one SMS.
 */
function findDuplicates(
  entry: ReviewedSms,
  ledger: LedgerEntry[],
  linked: LinkedRecords = NO_LINKED,
  taken: ReadonlySet<string> = new Set()
): LedgerEntry[] {
  if (!isConfirmable(entry)) return []

  const candidate = smsDuplicateCandidate(entry)

  return ledger.filter(
    record =>
      !(record.id && taken.has(record.id)) &&
      matchesDuplicate(candidate, record, {
        dayTolerance:
          record.id && linked.has(record.id) && record.note !== SMS_RECORD_NOTE
            ? LINKED_PAYMENT_DAYS
            : DUPLICATE_DAYS
      })
  )
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

export function isProbableDuplicate(
  entry: ReviewedSms,
  ledger: LedgerEntry[],
  linked: LinkedRecords = NO_LINKED,
  coverage: SmsCoverage = NO_COVERAGE
): boolean {
  if (!isConfirmable(entry)) return false

  return (
    findDuplicates(entry, ledger, uncoveredLinked(linked, coverage)).length > 0 ||
    findSplitTarget(smsDuplicateCandidate(entry), ledger, linked, coverage) !== null
  )
}

/**
 * The coverage of a record that is MORE than the record now holds is no longer true: the record
 * was edited down after SMS were closed as parts of it. Such an entry is dropped, so the record is
 * judged by its own amount again (a linked payment, named as such) instead of staying «تکراری؟».
 */
function withoutStaleCoverage(coverage: SmsCoverage, ledger: LedgerEntry[]): Map<string, number> {
  const kept = new Map(coverage)

  if (!kept.size) return kept
  for (const record of ledger) {
    const sum = record.id ? kept.get(record.id) : undefined

    if (record.id && sum !== undefined && roundMoney(sum) > roundMoney(record.amount)) {
      kept.delete(record.id)
    }
  }

  return kept
}

/**
 * Pairs own-account transfers, flags probable duplicates, keeps time order.
 * `noPair` = SMS ids the user split from a suggested transfer; `linked` = the records that are
 * debt/receivable payments, `coverage` = how much of each SMS already covered.
 */
export function buildReviewItems(
  entries: ReviewedSms[],
  ledger: LedgerEntry[],
  noPair: ReadonlySet<string> = new Set(),
  linked: LinkedRecords = NO_LINKED,
  coverage: SmsCoverage = NO_COVERAGE
): BankSmsReviewItem[] {
  const paired = new Set<string>()
  const items: BankSmsReviewItem[] = []
  // One-to-one: a record (or a part of it) is what ONE card stands for. `taken` are the records an
  // earlier card matched exactly, `covered` the coverage plus the parts earlier cards took.
  const taken = new Set<string>()
  const covered = withoutStaleCoverage(coverage, ledger)

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

    const exactLinked = uncoveredLinked(linked, covered)

    if (partner && isConfirmable(entry) && isConfirmable(partner)) {
      const [debit, credit] =
        entry.result.direction === 'debit' ? [entry, partner] : [partner, entry]
      const legRecord = (leg: ConfirmableSms) =>
        newestRecord(
          findDuplicates(leg, ledger, exactLinked, taken).filter(
            record => record.accountId === leg.result.accountId
          )
        )
      const duplicateLegs = { debit: legRecord(debit), credit: legRecord(credit) }

      for (const record of Object.values(duplicateLegs)) if (record?.id) taken.add(record.id)
      paired.add(entry.sms.id)
      paired.add(partner.sms.id)
      items.push({
        kind: 'transfer',
        key: `${debit.sms.id}:${credit.sms.id}`,
        debit,
        credit,
        duplicateLegs
      })
      continue
    }

    const duplicates = findDuplicates(entry, ledger, exactLinked, taken)
    // An exact match comes first; only without one can the SMS be a part of a bigger payment.
    const split =
      isConfirmable(entry) && !duplicates.length
        ? findSplitTarget(smsDuplicateCandidate(entry), ledger, linked, covered)
        : null
    // A payment record is the better answer: it is what the card offers to close the SMS with.
    const payments = duplicates.filter(
      record => record.id && exactLinked.has(record.id) && record.note !== SMS_RECORD_NOTE
    )
    const duplicateOf = split?.record ?? newestRecord(payments.length ? payments : duplicates)

    if (split?.record.id && entry.amount !== null) {
      covered.set(split.record.id, roundMoney((covered.get(split.record.id) ?? 0) + entry.amount))
    } else if (duplicateOf?.id) {
      taken.add(duplicateOf.id)
    }

    items.push({
      kind: 'single',
      key: entry.sms.id,
      entry,
      probableDuplicate: duplicates.length > 0 || split !== null,
      // A record saved with «اثر بر موجودی» = خیر left the account alone. For a payment, only the
      // payment record counts: another match must not speak for it.
      duplicateMovedBalance:
        isConfirmable(entry) &&
        (split || payments.length ? [duplicateOf] : duplicates).some(
          record => record?.accountId === entry.result.accountId && record.moved !== false
        ),
      duplicateOf,
      duplicatePayment:
        split?.payment ||
        (payments.length && duplicateOf?.id && linked.get(duplicateOf.id)) ||
        null,
      splitUncovered: split?.uncovered ?? null
    })
  }

  return items
}
