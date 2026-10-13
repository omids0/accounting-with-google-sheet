import type { RecordInput } from './recordInputs'
import { addDaysToIso, getTodayIso } from '../utils/jalaliDate'
import { normalizeItemName } from '../utils/lineItems'

/** Item names of the last six months count for suggestions. */
const SUGGESTION_WINDOW_DAYS = 183

/**
 * The most frequent item names of records in `category` over the last six
 * months, spelled as they were typed most often. Chips in the item sheet.
 */
export function suggestItemNames(
  records: RecordInput[],
  category: string,
  limit = 6,
  today = getTodayIso()
): string[] {
  if (!category) return []

  const since = addDaysToIso(today, -SUGGESTION_WINDOW_DAYS)

  const groups = new Map<string, { count: number; spellings: Map<string, number> }>()

  for (const record of records) {
    if (record.category !== category || !record.items.length || record.date < since) continue

    for (const item of record.items) {
      const key = normalizeItemName(item.name)

      if (!key) continue

      const group = groups.get(key) ?? { count: 0, spellings: new Map<string, number>() }

      group.count += 1
      group.spellings.set(item.name, (group.spellings.get(item.name) ?? 0) + 1)
      groups.set(key, group)
    }
  }

  return [...groups.values()]
    .map(group => ({
      count: group.count,
      name: [...group.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0]
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fa'))
    .slice(0, limit)
    .map(entry => entry.name)
}
