import { useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import Button from '../ui/Button'
import { spinnerClass } from '../ui/displayStyles'
import { receivablePaymentFormClass } from '../ui/treasuryReceivableStyles'

type PaymentFormValues = {
  amount: number | ''
  note: string
}

type ReceivablePaymentFormProps = {
  receivableId: string
  paying: boolean
  onSubmit: (values: PaymentFormValues) => void
  onCancel: () => void
}

export default function ReceivablePaymentForm({
  receivableId,
  paying,
  onSubmit,
  onCancel
}: ReceivablePaymentFormProps) {
  const initialValues: PaymentFormValues = { amount: '', note: '' }

  const { handleSubmit, reset, setValue, watch } = useForm<PaymentFormValues>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, { resetKey: receivableId })

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
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={paying}
          onClick={() => void handleSubmit(values => onSubmit(values))()}
        >
          {paying && <span className={spinnerClass} />}
          ثبت بخشی از پرداخت
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </div>
  )
}
