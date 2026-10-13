import { useId, useState } from 'react'

import LineItemSheet from './LineItemSheet'
import { useLineItemsEditor } from './useLineItemsEditor'
import { formatPersianNumber } from '../../utils/formatMoney'
import { itemDetailLine } from '../../utils/lineItems'
import AppIcon from '../AppIcon'
import { formFieldClass, formLabelClass } from '../ui/formStyles'
import {
  lineItemAmountClass,
  lineItemMainClass,
  lineItemNameClass,
  lineItemNoteClass,
  lineItemRemoveClass,
  lineItemRowClass,
  lineItemsAddMoreClass,
  lineItemsAddRowClass,
  lineItemsHintClass,
  lineItemsListClass,
  lineItemsSumClass
} from '../ui/lineItemStyles'

interface EntryLineItemsFieldProps {
  /** The form value `lineItems` (compact JSON). */
  value: string
  amount: string | number
  category: string
  disabled?: boolean
  onChange: (json: string) => void
  onAmountChange: (amount: number | '') => void
}

/** «ریز اقلام»: a dashed add row, then the items with their sum against the amount. */
export default function EntryLineItemsField({
  value,
  amount,
  category,
  disabled = false,
  onChange,
  onAmountChange
}: EntryLineItemsFieldProps) {
  const labelId = useId()

  const editor = useLineItemsEditor({ value, amount, onChange, onAmountChange })

  /** `null`: sheet closed; -1: a new item; otherwise the index being edited. */
  const [sheetIndex, setSheetIndex] = useState<number | null>(null)

  const { items, difference } = editor

  const sheet = (
    <LineItemSheet
      open={sheetIndex !== null}
      editing={sheetIndex !== null && sheetIndex >= 0 ? items[sheetIndex] ?? null : null}
      position={sheetIndex !== null && sheetIndex >= 0 ? sheetIndex + 1 : items.length + 1}
      category={category}
      recordAmount={editor.amountNumber}
      remainder={editor.remainder}
      onSave={item => {
        if (sheetIndex !== null && sheetIndex >= 0) editor.updateItem(sheetIndex, item)
        else editor.addItem(item)
      }}
      onClose={() => setSheetIndex(null)}
    />
  )

  if (!items.length) {
    return (
      <div className={formFieldClass}>
        <button
          type="button"
          className={lineItemsAddRowClass}
          onClick={() => setSheetIndex(-1)}
          disabled={disabled}
        >
          <span>+ ریز اقلام فاکتور</span>
          <span className={lineItemsHintClass}>اختیاری</span>
        </button>
        {sheet}
      </div>
    )
  }

  const mismatch = difference !== 0

  return (
    <div className={formFieldClass}>
      <span id={labelId} className={formLabelClass}>
        ریز اقلام{' '}
        <span className={lineItemsHintClass}>{`${formatPersianNumber(items.length)} قلم`}</span>
      </span>
      <div className={lineItemsListClass} role="group" aria-labelledby={labelId}>
        {items.map((item, index) => (
          <div key={`${index}-${item.name}`} className={lineItemRowClass}>
            <button
              type="button"
              className={lineItemMainClass}
              onClick={() => setSheetIndex(index)}
              disabled={disabled}
              aria-label={`ویرایش قلم ${item.name}`}
            >
              <span className={lineItemNameClass}>{item.name}</span>
              {itemDetailLine(item) ? (
                <span className={lineItemNoteClass}>{itemDetailLine(item)}</span>
              ) : null}
            </button>
            <span className={lineItemAmountClass}>{formatPersianNumber(item.amount)}</span>
            <button
              type="button"
              className={lineItemRemoveClass}
              onClick={() => editor.removeItem(index)}
              disabled={disabled}
              aria-label={`حذف قلم ${item.name}`}
            >
              <AppIcon name="close" size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className={lineItemsAddMoreClass}
          onClick={() => setSheetIndex(-1)}
          disabled={disabled}
        >
          <AppIcon name="add" size={16} />
          قلم جدید
        </button>
        <div className={lineItemsSumClass} role="status">
          <span>{`جمع اقلام ${formatPersianNumber(editor.sum)}`}</span>
          <span>
            {!mismatch
              ? '✓ با مبلغ یکی است'
              : difference < 0
              ? `${formatPersianNumber(-difference)} از مبلغ ریز نشده`
              : `${formatPersianNumber(difference)} بیشتر از مبلغ`}
          </span>
        </div>
      </div>
      {sheet}
    </div>
  )
}
