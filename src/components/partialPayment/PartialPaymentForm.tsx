import { useMemo } from 'react'
import { useForm } from 'react-hook-form'

import type { PartialPaymentType, PaymentFormLabels, PaymentFormValues } from './types'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import type { SettleOptions } from '../../services/settleOptions'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import SettleFields from '../settle/SettleFields'
import { useSettleFields } from '../settle/useSettleFields'
import Button from '../ui/Button'
import { receivablePaymentFormClass } from '../ui/treasuryReceivableStyles'

type PartialPaymentFormProps = {
  /** The form starts again when this changes (another item opened). */
  itemId: string
  /** Money in (a receivable) or out (a debt): the settle answers say «به حساب» or «از حساب». */
  type: PartialPaymentType
  labels: PaymentFormLabels
  paying: boolean
  /** Amount the field starts with; empty when unset. */
  defaultAmount?: number
  /** `transactionRecordId` of every payment of the module (the duplicate check skips them). */
  linkedIds: readonly string[]
  onSubmit: (values: PaymentFormValues, options: SettleOptions) => void
  onCancel: () => void
}

export default function PartialPaymentForm({
  itemId,
  type,
  labels,
  paying,
  defaultAmount,
  linkedIds,
  onSubmit,
  onCancel
}: PartialPaymentFormProps) {
  const initialValues = useMemo<PaymentFormValues>(
    () => ({ amount: defaultAmount || '', note: '' }),
    [defaultAmount]
  )

  const { handleSubmit, reset, setValue, watch } = useForm<PaymentFormValues>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, { resetKey: itemId })

  const settle = useSettleFields({ type, amount: Number(watch('amount')) || 0, linkedIds })

  return (
    <div className={receivablePaymentFormClass}>
      <FormField label={labels.amountLabel} style={{ marginBottom: '0.75rem' }}>
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
      <SettleFields state={settle} type={type} />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={paying}
          loading={paying}
          onClick={() => void handleSubmit(values => onSubmit(values, settle.commit()))()}
        >
          {labels.submitLabel}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </div>
  )
}
