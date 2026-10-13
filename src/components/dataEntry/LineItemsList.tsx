import { formatPersianNumber } from '../../utils/formatMoney'
import type { LineItem } from '../../utils/lineItems'
import {
  lineItemAmountClass,
  lineItemNameClass,
  lineItemNoteClass,
  lineItemRowClass,
  lineItemsListClass
} from '../ui/lineItemStyles'

/** The invoice items of a record, read-only: name, quantity note and amount per row. */
export default function LineItemsList({ items, label }: { items: LineItem[]; label: string }) {
  return (
    <div className={lineItemsListClass} role="list" aria-label={label}>
      {items.map((item, index) => (
        <div key={`${index}-${item.name}`} className={`${lineItemRowClass} pe-3`} role="listitem">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={lineItemNameClass}>{item.name}</span>
            {item.note ? <span className={lineItemNoteClass}>{item.note}</span> : null}
          </span>
          <span className={lineItemAmountClass}>{formatPersianNumber(item.amount)}</span>
        </div>
      ))}
    </div>
  )
}
