import { useEffect, useId, useState } from 'react'

import InvoiceScanSheet from './invoiceScan/InvoiceScanSheet'
import LineItemSheet from './LineItemSheet'
import { useLineItemsEditor } from './useLineItemsEditor'
import { usePendingInvoiceScan } from '../../stores/pendingInvoiceScanStore'
import { formatPersianNumber } from '../../utils/formatMoney'
import { itemDetailLine, type LineItem } from '../../utils/lineItems'
import { showInfo } from '../../utils/toast'
import AppIcon from '../AppIcon'
import { useEntryAttachmentSink } from '../attachments/entryAttachmentSink'
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
  lineItemsAddWithScanClass,
  lineItemsScanButtonClass,
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
  /** Entry form only: open «اسکن فاکتور» reading the photo the dashboard shortcut took. */
  autoScan?: boolean
  onChange: (json: string) => void
  onAmountChange: (amount: number | '') => void
}

/** «ریز اقلام»: a dashed add row, then the items with their sum against the amount. */
export default function EntryLineItemsField({
  value,
  amount,
  category,
  disabled = false,
  autoScan = false,
  onChange,
  onAmountChange
}: EntryLineItemsFieldProps) {
  const labelId = useId()

  const editor = useLineItemsEditor({ value, amount, onChange, onAmountChange })

  /** `null`: sheet closed; -1: a new item; otherwise the index being edited. */
  const [sheetIndex, setSheetIndex] = useState<number | null>(null)

  const { items, difference } = editor

  // The photo is read from the store once, at mount (state survives a strict-mode replay), and the
  // store forgets it at once: a later visit to the form must not scan it again.
  const [shotFile, setShotFile] = useState<File | null>(() =>
    autoScan ? usePendingInvoiceScan.getState().file : null
  )

  const [scanOpen, setScanOpen] = useState(shotFile !== null)
  const attachments = useEntryAttachmentSink()

  useEffect(() => {
    if (shotFile) usePendingInvoiceScan.getState().clear()
  }, [shotFile])

  const closeScan = () => {
    setScanOpen(false)
    setShotFile(null)
  }

  /** The reviewed scan: items join the list; with none, the invoice total becomes the amount. */
  const applyScan = ({
    items: scanned,
    total,
    photo
  }: {
    items: LineItem[]
    total: number | null
    photo: File | null
  }) => {
    const hadAmount = editor.amountNumber > 0

    if (scanned.length) editor.addItems(scanned)

    // The invoice's own total wins over the item sum, so a wrong item shows up as a mismatch under
    // the list instead of a green check. An amount the user already typed stays.
    if (total !== null && total > 0 && !hadAmount) onAmountChange(total)

    // The photo is the invoice's proof: keep it as «پیوست» while there is a slot.
    if (photo && attachments.add && attachments.remaining > 0) void attachments.add([photo])
    else if (photo && attachments.add) showInfo('عکس فاکتور پیوست نشد؛ جای پیوست پر است.')
  }

  const scanSheet = (
    <InvoiceScanSheet
      open={scanOpen}
      onClose={closeScan}
      onApply={applyScan}
      initialFile={shotFile}
    />
  )

  const scanButton = (
    <button
      type="button"
      className={lineItemsScanButtonClass}
      onClick={() => setScanOpen(true)}
      disabled={disabled}
    >
      <AppIcon name="camera" size={16} />
      اسکن فاکتور
    </button>
  )

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
        <div className={lineItemsAddWithScanClass}>
          <button
            type="button"
            className={lineItemsAddRowClass}
            onClick={() => setSheetIndex(-1)}
            disabled={disabled}
          >
            <span>+ ریز اقلام فاکتور</span>
            <span className={lineItemsHintClass}>اختیاری</span>
          </button>
          {scanButton}
        </div>
        {sheet}
        {scanSheet}
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
        {scanButton}
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
      {scanSheet}
    </div>
  )
}
