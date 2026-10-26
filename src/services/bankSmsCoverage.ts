import { dismissSms } from './bankSmsApply'
import { COVERAGE_KEEP_MS, writeSmsCoverage } from './bankSmsCoverageStore'
import { getBankSmsPrefs, updateBankSmsPrefs } from './bankSmsPrefs'
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
