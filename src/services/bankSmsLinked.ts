import {
  isConfirmable,
  LINKED_PAYMENT_DAYS,
  smsDuplicateCandidate,
  type LinkedRecords,
  type LedgerEntry,
  type ReviewedSms
} from './bankSmsQueue'
import { matchesDuplicate } from './recordDuplicates'
import type { RecordLinkMatch } from './recordLinkCore'

/**
 * Which records near the queued SMS are the payment of a debt or receivable. Only records that
 * could match an SMS (same direction and amount, within the payment window) are asked, so a long
 * ledger costs one lookup per candidate, never per record. `find` reads the local mirror only
 * (`findLinkedItems`); the queue builder itself stays pure.
 */
export function linkedRecordsFor(
  entries: ReviewedSms[],
  ledger: LedgerEntry[],
  find: (recordId: string, type: LedgerEntry['type']) => RecordLinkMatch[]
): LinkedRecords {
  const linked = new Map<string, RecordLinkMatch>()
  const rule = { dayTolerance: LINKED_PAYMENT_DAYS }
  const candidates = entries.filter(isConfirmable).map(smsDuplicateCandidate)

  for (const record of ledger) {
    if (!record.id || linked.has(record.id)) continue
    if (!candidates.some(candidate => matchesDuplicate(candidate, record, rule))) continue

    const match = find(record.id, record.type)[0]

    if (match) linked.set(record.id, match)
  }

  return linked
}
