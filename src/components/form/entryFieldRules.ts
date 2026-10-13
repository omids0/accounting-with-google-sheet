import { LINE_ITEMS_FIELD_ID } from './fieldUtils'
import { parseLineItems, sumLineItems } from '../../utils/lineItems'
import { parseNumeric } from '../../utils/parseNumeric'

/**
 * How far the line items are from the record amount (items minus amount), or
 * null when there are no items or they add up. Informational only: it never blocks saving.
 */
export function lineItemsMismatch(
  values: Record<string, string | number | undefined>
): number | null {
  const items = parseLineItems(String(values[LINE_ITEMS_FIELD_ID] ?? ''))

  if (!items.length) return null

  const difference = sumLineItems(items) - parseNumeric(values.amount)

  return difference === 0 ? null : difference
}
