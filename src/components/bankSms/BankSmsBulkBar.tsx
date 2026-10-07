import { useState } from 'react'

import { formatPersianNumber } from '../../utils/formatMoney'
import ConfirmActionModal from '../ConfirmActionModal'
import { smsActionsRowClass, smsCardClass, smsHintClass } from '../ui/bankSmsStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'

type BankSmsBulkBarProps = {
  count: number
  busy: boolean
  onConfirmAll: () => void
}

/** «ثبت همه»: confirm every recognised SMS with its suggested title and category. */
export default function BankSmsBulkBar({ count, busy, onConfirmAll }: BankSmsBulkBarProps) {
  const [asking, setAsking] = useState(false)

  if (count < 2) return null

  const countLabel = formatPersianNumber(count)

  return (
    <Card className={smsCardClass}>
      <p className={smsHintClass}>
        {countLabel} پیامک شناخته شد. هر کارت را جدا با دکمه «ثبت هزینه/درآمد» ثبت کنید، یا همه را
        یک‌جا با دسته پیشنهادی ثبت کنید. موارد «احتمالاً تکراری» و «کدام حساب؟» ثبت نمی‌شوند.
      </p>
      <div className={smsActionsRowClass}>
        <Button type="button" size="sm" loading={busy} onClick={() => setAsking(true)}>
          ثبت همه ({countLabel})
        </Button>
      </div>
      <ConfirmActionModal
        open={asking}
        title="ثبت همه پیامک‌ها"
        message={`${countLabel} تراکنش با دسته پیشنهادی در درآمد/هزینه ثبت و موجودی حساب‌ها به‌روز می‌شود. ادامه می‌دهید؟`}
        confirmLabel="ثبت همه"
        confirming={busy}
        onClose={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false)
          onConfirmAll()
        }}
      />
    </Card>
  )
}
