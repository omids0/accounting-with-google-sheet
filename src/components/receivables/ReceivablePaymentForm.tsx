import { useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
import type { SettleOptions } from '../../services/settleOptions'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import SettleFields from '../settle/SettleFields'
import { useSettleFields } from '../settle/useSettleFields'
import Button from '../ui/Button'
import { receivablePaymentFormClass } from '../ui/treasuryReceivableStyles'

type PaymentFormValues = {
  amount: number | ''
  note: string
}

type ReceivablePaymentFormProps = {
  receivableId: string
  paying: boolean
  /** `transactionRecordId` of every receivable payment (the duplicate check skips them). */
  linkedIds: readonly string[]
  onSubmit: (values: PaymentFormValues, options: SettleOptions) => void
  onCancel: () => void
}

export default function ReceivablePaymentForm({
  receivableId,
  paying,
  linkedIds,
  onSubmit,
  onCancel
}: ReceivablePaymentFormProps) {
  const initialValues: PaymentFormValues = { amount: '', note: '' }

  const { handleSubmit, reset, setValue, watch } = useForm<PaymentFormValues>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, { resetKey: receivableId })

  const settle = useSettleFields({
    type: 'income',
    amount: Number(watch('amount')) || 0,
    linkedIds
  })

  return (
    <div className={receivablePaymentFormClass}>
      <FormField label="مبلغ پرداخت" style={{ marginBottom: '0.75rem' }}>
        <AmountInput value={watch('amount')} onChange={val => setValue('amount', val)} />
      </FormField>
      <FormField label="توضیحات" style={{ marginBottom: '0.75rem' }}>
        <input
          type="text"
          value={watch('note')}
          onChange={e => setValue('note', e.target.value)}
          placeholder="اختیاری"
        />
      </FormField>
      <SettleFields state={settle} type="income" />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={paying}
          loading={paying}
          onClick={() => void handleSubmit(values => onSubmit(values, settle.commit()))()}
        >
          ثبت پرداخت
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </div>
  )
}
