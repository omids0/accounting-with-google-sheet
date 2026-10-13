import { formatPersianNumber } from './formatMoney'
import { normalizeDigits } from './normalizeDigits'
import { normalizeSearchText } from './search'

/** One invoice line of an income/expense record. */
export interface LineItem {
  name: string
  amount: number
  note?: string
}

interface StoredLineItem {
  n: string
  a: number
  q?: string
}

/** Tolerant reader of the «اقلام» cell: '' or bad JSON gives no items. */
export function parseLineItems(raw: string | undefined): LineItem[] {
  const text = String(raw ?? '').trim()

  if (!text) return []

  try {
    const data: unknown = JSON.parse(text)

    if (!Array.isArray(data)) return []

    return data.flatMap((entry: Partial<StoredLineItem> | null) => {
      const name = typeof entry?.n === 'string' ? entry.n.trim() : ''
      const amount = Number(entry?.a)

      if (!name || !Number.isFinite(amount)) return []

      const note = typeof entry?.q === 'string' ? entry.q.trim() : ''

      return [note ? { name, amount, note } : { name, amount }]
    })
  } catch {
    return []
  }
}

/** Compact JSON for the sheet cell; no items gives an empty cell. */
export function serializeLineItems(items: LineItem[]): string {
  if (!items.length) return ''

  return JSON.stringify(
    items.map(({ name, amount, note }): StoredLineItem => {
      const stored: StoredLineItem = { n: name, a: amount }

      if (note?.trim()) stored.q = note.trim()

      return stored
    })
  )
}

export function sumLineItems(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0)
}

/** Grouping key of an item name: folds Arabic letters, ZWNJ, digits and spacing. */
export function normalizeItemName(name: string): string {
  return normalizeSearchText(name)
}

/** «۲ کیلو» → { value: 2, unit: 'کیلو' }; null when the note has no leading number. */
export function parseItemQuantity(
  note: string | undefined
): { value: number; unit: string } | null {
  const match = normalizeDigits(String(note ?? '').trim()).match(/^(\d+(?:[.,٫]\d+)?)\s*(.*)$/)

  if (!match) return null

  const value = Number(match[1].replace(/[,٫]/, '.'))

  if (!Number.isFinite(value)) return null

  return { value, unit: match[2].trim() }
}

/** «کیوی ۲ کیلو ۳۲۰٬۰۰۰ · موز ۴۵۰٬۰۰۰» — one muted line for lists and exports. */
export function describeLineItems(items: LineItem[]): string {
  return items
    .map(item =>
      [item.name, item.note?.trim(), formatPersianNumber(item.amount)].filter(Boolean).join(' ')
    )
    .join(' · ')
}
