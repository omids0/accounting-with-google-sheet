import { SMS_RECORD_NOTE } from './bankSmsNote'
import {
  findSplitTarget,
  LINKED_PAYMENT_DAYS,
  NO_COVERAGE,
  NO_LINKED,
  uncoveredLinked,
  uncoveredOf,
  type LinkedPaymentInfo,
  type LinkedRecords,
  type SmsCoverage,
  type SplitTarget
} from './bankSmsSplit'
import { matchesDuplicate, type LedgerEntry } from './recordDuplicates'
import type { SmsMatchResult } from '../types'
import type { BankSmsItem } from './bankSmsNative'
import { toIsoDate } from '../utils/jalaliDate'
import { roundMoney } from '../utils/roundMoney'

export type { LedgerEntry } from './recordDuplicates'
export { LINKED_PAYMENT_DAYS }
export type { LinkedPaymentInfo, LinkedRecords, SmsCoverage }
export { reviewSms } from './bankSmsReview'
export { initialCardAccount, initialSmsAccount, resolveSmsAccount } from './bankSmsAccount'
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
 * is its payment, a later one only matches it as an ordinary duplicate). One record matches one SMS:
 * a record whose uncovered amount (`covered`: SMS closed as it, cards of this list that took it) is
 * less than the SMS no longer matches.
 */
function findDuplicates(
  entry: ReviewedSms,
  ledger: LedgerEntry[],
  linked: LinkedRecords = NO_LINKED,
  covered: SmsCoverage = NO_COVERAGE
): LedgerEntry[] {
  if (!isConfirmable(entry)) return []

  const candidate = smsDuplicateCandidate(entry)

  return ledger.filter(
    record =>
      uncoveredOf(record, covered) >= candidate.amount &&
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
    findDuplicates(entry, ledger, uncoveredLinked(linked, coverage), coverage).length > 0 ||
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
  // One-to-one: a record (or a part of it) is what ONE card stands for. `covered` is the stored
  // coverage plus what the earlier cards of this list took, exact matches and parts alike.
  const covered = withoutStaleCoverage(coverage, ledger)
  const consume = (record: LedgerEntry | null, amount: number) => {
    if (record?.id) covered.set(record.id, roundMoney((covered.get(record.id) ?? 0) + amount))
  }

  const deferred: { entry: ConfirmableSms; index: number }[] = []

  const single = (
    entry: ReviewedSms,
    duplicates: LedgerEntry[],
    split: SplitTarget | null,
    exactLinked: LinkedRecords
  ): BankSmsReviewItem => {
    // A payment record is the better answer: it is what the card offers to close the SMS with.
    const payments = duplicates.filter(
      record => record.id && exactLinked.has(record.id) && record.note !== SMS_RECORD_NOTE
    )
    const duplicateOf = split?.record ?? newestRecord(payments.length ? payments : duplicates)

    if (isConfirmable(entry)) consume(duplicateOf, entry.amount)

    return {
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
    }
  }

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
          findDuplicates(leg, ledger, exactLinked, covered).filter(
            record => record.accountId === leg.result.accountId
          )
        )
      const duplicateLegs = { debit: legRecord(debit), credit: legRecord(credit) }

      consume(duplicateLegs.debit, debit.amount)
      consume(duplicateLegs.credit, credit.amount)
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

    const duplicates = findDuplicates(entry, ledger, exactLinked, covered)

    // Exact matches own their record first, in time order; an SMS without one waits for the second
    // pass, where it can only be a part of what the exact matches left (an older part never takes
    // the record from a newer SMS of the full amount).
    if (!duplicates.length && isConfirmable(entry)) deferred.push({ entry, index: items.length })
    items.push(single(entry, duplicates, null, exactLinked))
  }

  for (const { entry, index } of deferred) {
    const split = findSplitTarget(smsDuplicateCandidate(entry), ledger, linked, covered)

    if (split) items[index] = single(entry, [], split, linked)
  }

  return items
}
