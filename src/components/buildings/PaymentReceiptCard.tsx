import { useState } from 'react'

import type { PaymentResult } from '../../services/buildingPayment'
import { receiptImage, receiptSummary, receiptText } from '../../services/buildingReceipt'
import { runExport } from '../../utils/exportFeedback'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { toPersianDigits } from '../../utils/normalizeDigits'
import { saveExportFile } from '../../utils/saveFile'
import { shareText } from '../../utils/shareText'
import Button from '../ui/Button'

/** The receipt of a saved payment, with «اشتراک رسید» (text) and «تصویر» (PNG). */
export default function PaymentReceiptCard({
  building,
  result
}: {
  building: string
  result: PaymentResult
}) {
  const [saving, setSaving] = useState(false)

  const savePng = async () => {
    setSaving(true)
    await runExport(async () => {
      const { renderStatCardPng } = await import('../../utils/statCardPng')

      return saveExportFile(
        `رسید-واحد-${result.unitNumber}.png`,
        await renderStatCardPng(receiptImage(building, result))
      )
    }, 'ساخت تصویر رسید انجام نشد')
    setSaving(false)
  }

  return (
    <>
      <div
        className="flex flex-col gap-1 rounded-[12px] border border-dashed border-primary bg-[color-mix(in_srgb,var(--color-primary)_7%,var(--color-surface))] p-4 text-sm leading-[1.9] text-text"
        role="region"
        aria-label="رسید پرداخت"
      >
        <h3 className="m-0 text-[0.95rem] font-extrabold">
          رسید پرداخت · {formatIsoDatePersian(result.date)}
        </h3>
        <span>
          واحد {toPersianDigits(result.unitNumber)}
          {result.debtor ? ` · ${result.debtor}` : ''}
        </span>
        <b>{receiptSummary(result)}</b>
        {result.credit ? <span>اعتبار ثبت‌شده: {formatMoney(result.credit)}</span> : null}
        {result.accountTitle ? <span>واریز به {result.accountTitle}</span> : null}
        <span>ماندهٔ بدهی: {formatMoney(result.remaining)}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => void shareText(receiptText(building, result), 'رسید پرداخت')}
        >
          اشتراک رسید
        </Button>
        <Button type="button" variant="secondary" loading={saving} onClick={() => void savePng()}>
          ذخیرهٔ عکس رسید
        </Button>
      </div>
    </>
  )
}
