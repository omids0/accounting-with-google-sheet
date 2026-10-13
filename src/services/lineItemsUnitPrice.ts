import { parseItemQuantity, type LineItem } from '../utils/lineItems'

/** Per unit («کیلو»): money and quantity of the lines priced in it. */
export type UnitTotals = Map<string, { count: number; amount: number; quantity: number }>

/**
 * Adds one item to the per-unit totals. The «فی» the user typed wins; without it the
 * price is the amount over the quantity read from the note (a note without a number adds nothing).
 */
export function addUnitPrice(units: UnitTotals, item: LineItem): void {
  const parsed = parseItemQuantity(item.note)
  const explicit = item.unitPrice && item.unitPrice > 0 ? item.unitPrice : 0

  if (!explicit && !(parsed && parsed.value > 0)) return

  const unit = parsed?.unit ?? ''
  const quantity = explicit ? item.quantity ?? parsed?.value ?? 1 : parsed?.value ?? 0
  const entry = units.get(unit) ?? { count: 0, amount: 0, quantity: 0 }

  entry.count += 1
  entry.amount += explicit ? explicit * quantity : item.amount
  entry.quantity += quantity
  units.set(unit, entry)
}

/** The most used unit's price per unit; undefined when no line carried a quantity. */
export function bestUnitPrice(units: UnitTotals): { value: number; unit: string } | undefined {
  let best: { unit: string; count: number; amount: number; quantity: number } | null = null

  for (const [unit, data] of units) {
    if (!best || data.count > best.count) best = { unit, ...data }
  }

  return best && best.quantity > 0
    ? { value: best.amount / best.quantity, unit: best.unit }
    : undefined
}
