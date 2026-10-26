import type { DuplicateCandidate, LedgerEntry } from './recordDuplicates'
import { diffIsoDays } from '../utils/jalaliDate'
import { roundMoney } from '../utils/roundMoney'

/** The debt/receivable payment a record stands for (what `findLinkedItems` reports). */
export interface LinkedPaymentInfo {
  kind: string
  /** «بدهی» / «طلب». */
  noun: string
  title: string
}

/** Record id → the payment it is. Built outside (local mirror), so the queue stays pure. */
export type LinkedRecords = ReadonlyMap<string, LinkedPaymentInfo>

/** Record id → how much of it SMS already covered (`bankSmsCoverage`). Built outside as well. */
export type SmsCoverage = ReadonlyMap<string, number>

/**
 * A record that is a debt/receivable payment matches within this many days, because the payment
 * date may be typed by hand. Same number as `SETTLE_DUPLICATE_DAYS` (settleDuplicates.ts imports
 * bankSmsApply, which imports the queue, so it is repeated here; a test keeps them equal).
 */
export const LINKED_PAYMENT_DAYS = 3

export const NO_LINKED: LinkedRecords = new Map()
export const NO_COVERAGE: SmsCoverage = new Map()

/** A payment record that one or more SMS of a smaller amount can be a part of. */
export interface SplitTarget {
  record: LedgerEntry
  payment: LinkedPaymentInfo
  /** What no SMS covered yet; at least the SMS's own amount. */
  uncovered: number
}

/** What of a record no SMS covered yet. */
export function uncoveredOf(record: LedgerEntry, coverage: SmsCoverage): number {
  return Math.max(0, roundMoney(record.amount - (coverage.get(record.id ?? '') ?? 0)))
}

/**
 * The payment record a smaller SMS is probably a part of (one payment of 20M, two SMS of 10M):
 * same direction, within the payment window, linked to a debt/receivable, and its uncovered
 * amount still holds the SMS. The closest fit (smallest sufficient uncovered amount) wins, then the
 * newest, then the id, so the choice never flips between renders.
 */
export function findSplitTarget(
  candidate: DuplicateCandidate,
  ledger: LedgerEntry[],
  linked: LinkedRecords,
  coverage: SmsCoverage
): SplitTarget | null {
  const targets = ledger.flatMap((record): SplitTarget[] => {
    const payment = record.id ? linked.get(record.id) : undefined

    if (!payment || !record.date || !candidate.date) return []
    if (record.type !== candidate.type || !(record.amount > candidate.amount)) return []
    if (Math.abs(diffIsoDays(record.date, candidate.date)) > LINKED_PAYMENT_DAYS) return []

    const uncovered = uncoveredOf(record, coverage)

    return uncovered >= roundMoney(candidate.amount) ? [{ record, payment, uncovered }] : []
  })

  return (
    targets.sort(
      (a, b) =>
        a.uncovered - b.uncovered ||
        b.record.date.localeCompare(a.record.date) ||
        (b.record.createdAtMs ?? 0) - (a.record.createdAtMs ?? 0) ||
        (a.record.id ?? '').localeCompare(b.record.id ?? '')
    )[0] ?? null
  )
}

/** The linked records an exact match may still use: one SMS already covered part of is not a new payment. */
export function uncoveredLinked(linked: LinkedRecords, coverage: SmsCoverage): LinkedRecords {
  return coverage.size ? new Map([...linked].filter(([id]) => !coverage.get(id))) : linked
}
