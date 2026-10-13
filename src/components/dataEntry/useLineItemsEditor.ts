import { useEffect, useMemo, useState } from 'react'

import {
  parseLineItems,
  serializeLineItems,
  sumLineItems,
  type LineItem
} from '../../utils/lineItems'
import { parseNumeric } from '../../utils/parseNumeric'

interface UseLineItemsEditorArgs {
  /** The form value `lineItems` (compact JSON). It is the only copy of the items. */
  value: string
  amount: string | number
  onChange: (json: string) => void
  onAmountChange: (amount: number | '') => void
}

/**
 * Edits the items of a record. The items live in the form value, so a form
 * reset clears them too. While the amount was empty when the first item came,
 * it follows the sum of the items until it is edited by hand.
 */
export function useLineItemsEditor({
  value,
  amount,
  onChange,
  onAmountChange
}: UseLineItemsEditorArgs) {
  const items = useMemo(() => parseLineItems(value), [value])

  const sum = sumLineItems(items)

  const amountNumber = parseNumeric(amount)

  const [amountFollowsItems, setAmountFollowsItems] = useState(false)

  useEffect(() => {
    if (amountFollowsItems && amountNumber !== sum) setAmountFollowsItems(false)
  }, [amountFollowsItems, amountNumber, sum])

  const commit = (next: LineItem[]) => {
    onChange(serializeLineItems(next))

    const startsFollowing = !items.length && next.length > 0 && amountNumber === 0

    if (amountFollowsItems || startsFollowing) {
      onAmountChange(next.length ? sumLineItems(next) : '')
      setAmountFollowsItems(next.length > 0)
    }
  }

  const difference = items.length ? sum - amountNumber : 0

  return {
    items,
    sum,
    amountNumber,
    /** Items minus amount; 0 when they agree or there are no items. */
    difference,
    /** Amount not yet covered by an item; null while the amount is empty. */
    remainder: amountNumber > 0 ? amountNumber - sum : null,
    addItem: (item: LineItem) => commit([...items, item]),
    updateItem: (index: number, item: LineItem) =>
      commit(items.map((entry, i) => (i === index ? item : entry))),
    removeItem: (index: number) => commit(items.filter((_, i) => i !== index))
  }
}
