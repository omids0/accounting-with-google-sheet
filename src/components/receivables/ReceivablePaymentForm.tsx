import { useForm } from '../../hooks/useForm'
import AmountInput from '../AmountInput'
import { FormField } from '../form'

type ReceivablePaymentFormProps = {
  receivableId: string
  paying: boolean
  onSubmit: (values: { amount: number | ''; note: string }) => void
  onCancel: () => void
}

export default function ReceivablePaymentForm({
  receivableId,
  paying,
  onSubmit,
  onCancel
}: ReceivablePaymentFormProps) {
  const form = useForm<{ amount: number | ''; note: string }>(
    { amount: '', note: '' },
    { resetKey: receivableId }
  )

  return (
    <div className="receivable-payment-form">
      <FormField label="مبلغ پرداخت" style={{ marginBottom: '0.75rem' }}>
        <AmountInput value={form.values.amount} onChange={val => form.setField('amount', val)} />
      </FormField>
      <FormField label="توضیحات" style={{ marginBottom: '0.75rem' }}>
        <input
          type="text"
          value={form.values.note}
          onChange={e => form.setField('note', e.target.value)}
          placeholder="اختیاری"
        />
      </FormField>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={paying}
          onClick={() => onSubmit(form.values)}
        >
          {paying && <span className="spinner" />}
          ثبت بخشی از پرداخت
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
          انصراف
        </button>
      </div>
    </div>
  )
}
