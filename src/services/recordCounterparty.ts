import type { RecordInput } from './recordInputs'
import { normalizeSearchText } from '../utils/search'

function isNewer(a: RecordInput, b: RecordInput): boolean {
  if (a.date !== b.date) return a.date > b.date

  return (a.createdAtMs ?? 0) > (b.createdAtMs ?? 0)
}

/**
 * The counterparty of the newest record with the same category and title that
 * names one; '' when there is none. Prefills «طرف حساب» in the entry form.
 */
export function suggestCounterparty(
  records: RecordInput[],
  category: string,
  title: string
): string {
  const key = normalizeSearchText(title)

  if (!category || !key) return ''

  let best: RecordInput | null = null

  for (const record of records) {
    if (!record.counterparty || record.category !== category) continue
    if (normalizeSearchText(record.title) !== key) continue
    if (!best || isNewer(record, best)) best = record
  }

  return best?.counterparty ?? ''
}
