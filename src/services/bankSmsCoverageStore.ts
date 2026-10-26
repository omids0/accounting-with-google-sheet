import { getBankSmsPrefs, updateBankSmsPrefs } from './bankSmsPrefs'

/** A coverage entry older than this no longer counts and is dropped by the next write. */
export const COVERAGE_KEEP_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Remembers that SMS `smsId` stands for `amount` of record `recordId`: it was closed as a part of
 * it (`coverSmsPart`), or it is the SMS the record was created from (`rememberSmsRecord`). The
 * record's coverage is the sum of these. Device-level (the SMS prefs), nothing in the sheet.
 */
export function writeSmsCoverage(
  smsId: string,
  recordId: string,
  amount: number,
  nowMs = Date.now()
): void {
  const fresh = Object.fromEntries(
    Object.entries(getBankSmsPrefs().smsCoverage).filter(
      ([, entry]) => nowMs - entry.at < COVERAGE_KEEP_MS
    )
  )

  updateBankSmsPrefs({ smsCoverage: { ...fresh, [smsId]: { recordId, amount, at: nowMs } } })
}

/**
 * The record was just created from this SMS, so the SMS already covers it: no later SMS may be
 * taken for a payment of the same record (its uncovered amount is 0).
 */
export function rememberSmsRecord(
  entry: { sms: { id: string }; amount: number },
  recordId: string
): void {
  if (recordId) writeSmsCoverage(entry.sms.id, recordId, entry.amount)
}

/**
 * The record this SMS was already turned into (a save that failed after the record was written),
 * or '' when there is none. A retry must finish that save, never write a second record.
 */
export function recordOfSms(smsId: string, nowMs = Date.now()): string {
  const entry = getBankSmsPrefs().smsCoverage[smsId]

  return entry && nowMs - entry.at < COVERAGE_KEEP_MS ? entry.recordId : ''
}
