import { formatPersianNumber } from './formatMoney'
import { normalizeDigits } from './normalizeDigits'
import { normalizeSearchText } from './search'

/** One invoice line of an income/expense record. */
export interface LineItem {
  name: string
  amount: number
  /** Free text next to the name, usually the quantity with its unit («۲ کیلو»). */
  note?: string
  /** «فی»: price of one unit. */
  unitPrice?: number
  /** The numeric quantity read from the note («۲» of «۲ کیلو»). */
  quantity?: number
}

interface StoredLineItem {
  n: string
  a: number
  q?: string
  p?: number
  c?: number
}

function positive(value: unknown): number | undefined {
  const number = Number(value)

  return Number.isFinite(number) && number > 0 ? number : undefined
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
      const unitPrice = positive(entry?.p)
      const quantity = positive(entry?.c)

      return [
        {
          name,
          amount,
          ...(note ? { note } : {}),
          ...(unitPrice ? { unitPrice } : {}),
          ...(quantity ? { quantity } : {})
        }
      ]
    })
  } catch {
    return []
  }
}

/** Compact JSON for the sheet cell; no items gives an empty cell. */
export function serializeLineItems(items: LineItem[]): string {
  if (!items.length) return ''

  return JSON.stringify(
    items.map(({ name, amount, note, unitPrice, quantity }): StoredLineItem => {
      const stored: StoredLineItem = { n: name, a: amount }

      if (note?.trim()) stored.q = note.trim()
      if (unitPrice && unitPrice > 0) stored.p = unitPrice
      if (quantity && quantity > 0) stored.c = quantity

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

/** «مقدار × فی»: what the amount field takes when both are known; 0 otherwise. */
export function lineItemAmount(
  quantity: number | undefined,
  unitPrice: number | undefined
): number {
  return quantity && quantity > 0 && unitPrice && unitPrice > 0
    ? Math.round(quantity * unitPrice)
    : 0
}

/** «۲ کیلو × ۳۰۰٬۰۰۰» under an item's name; just the note (or the unit price) when one part is missing. */
export function itemDetailLine(item: LineItem): string {
  const note = item.note?.trim() ?? ''

  if (!item.unitPrice) return note

  return `${note ? `${note} ` : ''}× ${formatPersianNumber(item.unitPrice)}`
}

/**
 * «کیوی ۲ کیلو ۳۲۰٬۰۰۰ · موز ۲ کیلو × ۳۰۰٬۰۰۰ = ۶۰۰٬۰۰۰» — one muted line for lists and
 * exports; an item with both a quantity and a unit price shows the multiplication.
 */
export function describeLineItems(items: LineItem[]): string {
  return items
    .map(item => {
      const note = item.note?.trim()

      if (note && item.unitPrice) {
        const price = formatPersianNumber(item.unitPrice)

        return `${item.name} ${note} × ${price} = ${formatPersianNumber(item.amount)}`
      }

      return [item.name, note, formatPersianNumber(item.amount)].filter(Boolean).join(' ')
    })
    .join(' · ')
}
