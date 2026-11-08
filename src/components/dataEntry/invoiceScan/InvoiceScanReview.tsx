import type { ScanRow } from './useInvoiceScan'
import { formatPersianNumber } from '../../../utils/formatMoney'
import AmountInput from '../../AmountInput'
import AppIcon from '../../AppIcon'
import FormField from '../../form/FormField'
import Alert from '../../ui/Alert'
import {
  invoiceScanCheckClass,
  invoiceScanNameInputClass,
  invoiceScanOkClass,
  invoiceScanPhotoClass,
  invoiceScanRowClass,
  invoiceScanRowFieldsClass,
  invoiceScanRowWarnClass,
  invoiceScanWarnClass
} from '../../ui/invoiceScanStyles'
import { lineItemRemoveClass } from '../../ui/lineItemStyles'

/** A printed grand total below this (in the app currency) is almost always a misread. */
const MIN_PLAUSIBLE_TOTAL = 1000

interface InvoiceScanReviewProps {
  photoUrl: string
  rows: ScanRow[]
  /** Sum of the rows the form can take. */
  sum: number
  /** Grand total read from the invoice, in the app currency; null when none was found. */
  total: number | null
  onTotalChange: (total: number | null) => void
  onEdit: (id: number, patch: Partial<ScanRow>) => void
  onRemove: (id: number) => void
}

/** What was read, next to the photo, so every digit can be checked by eye before it is added. */
export default function InvoiceScanReview({
  photoUrl,
  rows,
  sum,
  total,
  onTotalChange,
  onEdit,
  onRemove
}: InvoiceScanReviewProps) {
  const matches = total !== null && total > 0 && sum === total
  const tinyTotal = total !== null && total > 0 && total < MIN_PLAUSIBLE_TOTAL

  return (
    <>
      {photoUrl ? <img src={photoUrl} alt="عکس فاکتور" className={invoiceScanPhotoClass} /> : null}

      {!rows.length ? (
        <Alert variant="warning">
          {total === null
            ? 'چیزی خوانده نشد. عکس را نزدیک‌تر و با نور بهتر بگیر، یا اقلام را دستی بنویس.'
            : 'اقلام خوانده نشد، فقط مبلغ کل. با «افزودن به فرم» همان مبلغ ثبت می‌شود.'}
        </Alert>
      ) : (
        <>
          <p className="text-[0.82rem] text-muted">
            ارقام را با عکس مقایسه کن؛ خواندن ارقام فارسی همیشه دقیق نیست.
          </p>
          <div role="group" aria-label="اقلام خوانده‌شده">
            {rows.map((row, index) => (
              <div key={row.id} className={invoiceScanRowClass}>
                <div className={invoiceScanRowFieldsClass}>
                  <input
                    type="text"
                    value={row.name}
                    autoComplete="off"
                    className={invoiceScanNameInputClass}
                    aria-label={`نام قلم ${formatPersianNumber(index + 1)}`}
                    onChange={event => onEdit(row.id, { name: event.target.value })}
                  />
                  <AmountInput
                    compact
                    hideWords
                    value={row.amount}
                    aria-label={`مبلغ قلم ${formatPersianNumber(index + 1)}`}
                    onChange={amount => onEdit(row.id, { amount })}
                  />
                </div>
                <button
                  type="button"
                  className={lineItemRemoveClass}
                  onClick={() => onRemove(row.id)}
                  aria-label={`حذف قلم ${formatPersianNumber(index + 1)}`}
                >
                  <AppIcon name="close" size={16} />
                </button>
                {row.uncertain ? (
                  <p className={invoiceScanRowWarnClass}>
                    ارقام این ردیف جور درنمی‌آید؛ با عکس مقایسه کن.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}

      <FormField
        label="مبلغ فاکتور"
        hint="جمع کل چاپ‌شده روی فاکتور؛ اگر درست نیست اصلاحش کن"
        controlWidth="full"
      >
        <AmountInput
          value={total ?? ''}
          onChange={next => onTotalChange(next === '' ? null : next)}
        />
      </FormField>

      <p className={invoiceScanCheckClass} role="status">
        <span>{`جمع اقلام ${formatPersianNumber(sum)}`}</span>
        {total === null || total <= 0 ? null : (
          <span className={matches ? invoiceScanOkClass : invoiceScanWarnClass}>
            {matches
              ? '✓ با مبلغ فاکتور یکی است'
              : `مبلغ فاکتور ${formatPersianNumber(total)}؛ با جمع اقلام نمی‌خواند`}
          </span>
        )}
      </p>
      {tinyTotal ? (
        <p className={invoiceScanRowWarnClass}>
          مبلغ فاکتور خیلی کم به نظر می‌رسد؛ با عکس مقایسه‌اش کن.
        </p>
      ) : null}
    </>
  )
}
