import { useState } from 'react'

import AmountInput from '../AmountInput'
import { FormField } from '../form'
import Button from '../ui/Button'
import {
  receivableAddPaymentActionsClass,
  receivablePaymentFormClass
} from '../ui/treasuryReceivableStyles'

export default function DangSplitPaymentForm({
  remaining,
  saving,
  onSubmit,
  onCancel
}: {
  remaining: number
  saving: boolean
  onSubmit: (amount: number | '') => void
  onCancel: () => void
}) {
  const [amount, setAmount] = useState<number | ''>('')

  return (
    <div className={receivablePaymentFormClass}>
      <FormField label="مبلغ پرداخت" hint={`مانده: ${remaining.toLocaleString('fa-IR')} تومان`}>
        <AmountInput value={amount} onChange={setAmount} />
      </FormField>
      <div className={receivableAddPaymentActionsClass}>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={saving}
          loading={saving}
          onClick={() => onSubmit(amount)}
        >
          ثبت پرداخت
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </div>
  )
}
