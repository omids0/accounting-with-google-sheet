import { dismissSms } from './bankSmsApply'
import { COVERAGE_KEEP_MS, writeSmsCoverage } from './bankSmsCoverageStore'
import { getBankSmsPrefs, updateBankSmsPrefs } from './bankSmsPrefs'
import type { BankSmsReviewItem } from './bankSmsQueue'
import type { SmsCoverage } from './bankSmsSplit'
import { roundMoney } from '../utils/roundMoney'

/**
 * One payment record, several SMS (a 20M payment, two SMS of 10M): closing an SMS as «بخشی از
 * آن است» remembers which record it was a part of. SMS exist only on this phone, so the memory is
 * device-level (in the SMS prefs, wiped with the account, nothing in the sheet). The coverage of a
 * record is computed: the sum of the SMS mapped to it. It is only read for records that exist, so a
 * deleted record leaves nothing that blocks anything; old entries are dropped anyway.
 */
export { COVERAGE_KEEP_MS }

/** Record id → the sum of the SMS amounts closed as a part of it. */
export function smsCoverage(
  nowMs = Date.now(),
  /** SMS still in the queue: what they stand for is not covered yet (a save that failed halfway). */
  except: ReadonlySet<string> = new Set()
): SmsCoverage {
  const sums = new Map<string, number>()

  for (const [smsId, { recordId, amount, at }] of Object.entries(getBankSmsPrefs().smsCoverage)) {
    if (except.has(smsId)) continue

    // An old entry no longer counts, whether or not another close has pruned it yet.
    if (nowMs - at >= COVERAGE_KEEP_MS) continue

    sums.set(recordId, roundMoney((sums.get(recordId) ?? 0) + amount))
  }

  return sums
}

/** SMS id → the record it was closed as a part of (the reconcile matches the SMS to it). */
export function smsCoverageParts(nowMs = Date.now()): ReadonlyMap<string, string> {
  return new Map(
    Object.entries(getBankSmsPrefs().smsCoverage)
      .filter(([, entry]) => nowMs - entry.at < COVERAGE_KEEP_MS)
      .map(([smsId, entry]) => [smsId, entry.recordId])
  )
}

/**
 * Closes the SMS as a part of `recordId`: it leaves the list and nothing else is written. The
 * memory is written first (the list refresh must already see it) and taken back if the close fails.
 */
export async function coverSmsPart(
  smsId: string,
  recordId: string,
  amount: number,
  nowMs = Date.now()
): Promise<void> {
  const before = getBankSmsPrefs().smsCoverage

  writeSmsCoverage(smsId, recordId, amount, nowMs)
  try {
    await dismissSms([smsId])
  } catch (err) {
    updateBankSmsPrefs({ smsCoverage: before })
    throw err
  }
}

/**
 * Closes a queue item the user says is already recorded. A single SMS stands for its matched record
 * (the whole amount, or the part of a bigger payment) and is remembered as covering it, so no later
 * SMS is taken for the same payment; a transfer pair does the same for each leg that has a record
 * (a leg without one is just dismissed).
 */
export async function closeAsRecorded(item: BankSmsReviewItem): Promise<void> {
  if (item.kind === 'transfer') {
    for (const [leg, record] of [
      [item.debit, item.duplicateLegs.debit],
      [item.credit, item.duplicateLegs.credit]
    ] as const) {
      if (record?.id) await coverSmsPart(leg.sms.id, record.id, leg.amount)
      else await dismissSms([leg.sms.id])
    }

    return
  }

  const { entry, duplicateOf } = item

  if (duplicateOf?.id && entry.amount !== null) {
    await coverSmsPart(entry.sms.id, duplicateOf.id, entry.amount)
  } else {
    await dismissSms([entry.sms.id])
  }
}
