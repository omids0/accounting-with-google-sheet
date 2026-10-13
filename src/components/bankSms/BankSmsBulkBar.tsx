import { useState } from 'react'

import { formatPersianNumber } from '../../utils/formatMoney'
import ConfirmActionModal from '../ConfirmActionModal'
import { smsBulkBarClass, smsBulkBarSpacerClass, smsHintClass } from '../ui/bankSmsStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'

type BankSmsBulkBarProps = {
  count: number
  busy: boolean
  onConfirmAll: () => void
}

/**
 * Bottom bar «ثبت همه شناخته‌شده‌ها (N)»: every recognised SMS that has a suggested
 * category is saved with it; «تکراری؟», «کدام حساب؟» and cards without a category stay.
 */
export default function BankSmsBulkBar({ count, busy, onConfirmAll }: BankSmsBulkBarProps) {
  const [asking, setAsking] = useState(false)

  if (count < 2) return null

  const countLabel = formatPersianNumber(count)

  return (
    <>
      <div className={smsBulkBarSpacerClass} aria-hidden />
      <Card className={smsBulkBarClass}>
        <p className={smsHintClass}>{countLabel} پیامک شناخته‌شده با دسته پیشنهادی</p>
        <Button type="button" size="sm" loading={busy} onClick={() => setAsking(true)}>
          ثبت همه شناخته‌شده‌ها ({countLabel})
        </Button>
        <ConfirmActionModal
          open={asking}
          title="ثبت همه شناخته‌شده‌ها"
          message={`${countLabel} تراکنش هرکدام با دسته پیشنهادی همان کارت در درآمد/هزینه ثبت و موجودی حساب‌ها به‌روز می‌شود. کارت‌های «تکراری؟» و بدون دسته می‌مانند. ادامه می‌دهید؟`}
          confirmLabel="ثبت همه"
          confirming={busy}
          onClose={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false)
            onConfirmAll()
          }}
        />
      </Card>
    </>
  )
}
