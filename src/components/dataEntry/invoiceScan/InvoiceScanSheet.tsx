import type { FormEvent } from 'react'

import InvoiceScanReview from './InvoiceScanReview'
import { useInvoiceScan } from './useInvoiceScan'
import { sumLineItems, type LineItem } from '../../../utils/lineItems'
import PhotoSourceButtons from '../../attachments/PhotoSourceButtons'
import FormModal from '../../FormModal'
import {
  invoiceScanSourceButtonClass,
  invoiceScanSourcesClass,
  invoiceScanWorkingClass
} from '../../ui/invoiceScanStyles'
import Spinner from '../../ui/Spinner'

interface InvoiceScanSheetProps {
  open: boolean
  onClose: () => void
  /** The reviewed proposal and the photo it came from. */
  onApply: (result: { items: LineItem[]; total: number | null; photo: File | null }) => void
}

const STAGE_TEXT = {
  preparing: 'در حال آماده‌سازی عکس…',
  loading: 'در حال بارگذاری ابزار خواندن…',
  reading: 'در حال خواندن فاکتور…'
} as const

/** «اسکن فاکتور»: photo in, a proposal to check out. The form decides what to do with it. */
export default function InvoiceScanSheet({ open, onClose, onApply }: InvoiceScanSheetProps) {
  const scan = useInvoiceScan(open)
  const sum = sumLineItems(scan.items)
  const canApply = scan.items.length > 0 || (scan.total !== null && scan.total > 0)
  const reviewing = scan.phase === 'review'

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canApply) return

    onApply({ items: scan.items, total: scan.total, photo: scan.photo })
    onClose()
  }

  return (
    <FormModal
      open={open}
      title="اسکن فاکتور"
      onClose={onClose}
      onSubmit={handleSubmit}
      saveLabel="افزودن به فرم"
      hideSave={!reviewing}
      saveDisabled={!canApply}
      cancelLabel={reviewing ? 'عکس دیگر' : 'انصراف'}
      onCancel={reviewing ? scan.startOver : onClose}
      saving={scan.phase === 'working'}
    >
      {scan.phase === 'choose' ? (
        <>
          <div className={invoiceScanSourcesClass}>
            <PhotoSourceButtons
              onFiles={files => void scan.scan(files)}
              pickerAcceptsPdf={false}
              buttonClassName={invoiceScanSourceButtonClass}
              labels={{ camera: 'عکس با دوربین', picker: 'انتخاب از گالری' }}
            />
          </div>
          <p className="text-[0.82rem] text-muted">
            فاکتور را صاف و با نور خوب بگیر. خواندن روی همین گوشی انجام می‌شود و عکس جایی فرستاده
            نمی‌شود.
          </p>
        </>
      ) : null}

      {scan.phase === 'working' ? (
        <div className={invoiceScanWorkingClass} role="status">
          <Spinner size="sm" decorative />
          <span>{STAGE_TEXT[scan.stage]}</span>
          {scan.stage === 'loading' ? <span>بار اول چند ثانیه بیشتر طول می‌کشد.</span> : null}
        </div>
      ) : null}

      {reviewing ? (
        <InvoiceScanReview
          photoUrl={scan.photoUrl}
          rows={scan.rows}
          sum={sum}
          total={scan.total}
          onTotalChange={scan.setTotal}
          onEdit={scan.editRow}
          onRemove={scan.removeRow}
        />
      ) : null}
    </FormModal>
  )
}
