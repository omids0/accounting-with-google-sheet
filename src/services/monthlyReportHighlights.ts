import { normalizeItemName, parseLineItems } from '../utils/lineItems'
import { parseNumeric } from '../utils/parseNumeric'

export interface MonthHighlights {
  /** Up to three counterparties, by the amount spent with them. */
  counterparties: string[]
  /** The item that appears on the most lines; '' when no record has items. */
  item: string
}

const TOP_COUNTERPARTIES = 3

type RecordLike = { values: Record<string, string> }

/** The month's top counterparties by spend and its most frequent item, from expense records. */
export function monthHighlights(expense: RecordLike[]): MonthHighlights {
  const spent = new Map<string, number>()

  const items = new Map<string, { count: number; spellings: Map<string, number> }>()

  for (const record of expense) {
    const name = (record.values.counterparty ?? '').trim()

    if (name) spent.set(name, (spent.get(name) ?? 0) + parseNumeric(record.values.amount))

    for (const line of parseLineItems(record.values.lineItems)) {
      const key = normalizeItemName(line.name)

      if (!key) continue

      const entry = items.get(key) ?? { count: 0, spellings: new Map<string, number>() }

      entry.count += 1
      entry.spellings.set(line.name, (entry.spellings.get(line.name) ?? 0) + 1)
      items.set(key, entry)
    }
  }

  const counterparties = [...spent.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fa'))
    .slice(0, TOP_COUNTERPARTIES)
    .map(([name]) => name)

  const top = [...items.values()].sort((a, b) => b.count - a.count)[0]

  const item = top ? [...top.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0] : ''

  return { counterparties, item }
}
