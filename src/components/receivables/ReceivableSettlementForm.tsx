import { useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
import { formatMoney } from '../../utils/formatMoney'
import { FormField } from '../form'
import type { SettlementFormState } from './types'
import Button from '../ui/Button'
import { receivablePaymentFormClass } from '../ui/treasuryReceivableStyles'

type ReceivableSettlementFormProps = {
  receivableId: string
  remaining: number
  defaultTitle: string
  defaultNote: string
  settling: boolean
  onSubmit: (values: Omit<SettlementFormState, 'receivableId'>) => void
  onCancel: () => void
}

type SettlementFormValues = {
  title: string
  note: string
}

export default function ReceivableSettlementForm({
  receivableId,
  remaining,
  defaultTitle,
  defaultNote,
  settling,
  onSubmit,
  onCancel
}: ReceivableSettlementFormProps) {
  const initialValues = useMemo<SettlementFormValues>(
    () => ({ title: defaultTitle, note: defaultNote }),
    [defaultTitle, defaultNote]
  )

  const { register, handleSubmit, reset } = useForm<SettlementFormValues>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, { resetKey: receivableId })

  return (
    <div className={receivablePaymentFormClass}>
      <FormField label="عنوان درآمد" required style={{ marginBottom: '0.75rem' }}>
        <input type="text" {...register('title')} placeholder="مثلاً: طلب: علی محمدی" />
      </FormField>
      <FormField label="مبلغ تسویه" style={{ marginBottom: '0.75rem' }}>
        <input type="text" value={formatMoney(remaining)} readOnly dir="ltr" />
      </FormField>
      <FormField label="توضیحات" style={{ marginBottom: '0.75rem' }}>
        <input type="text" {...register('note')} placeholder="اختیاری" />
      </FormField>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button
          type="button"
          variant="inflow"
          size="sm"
          disabled={settling}
          loading={settling}
          onClick={() => void handleSubmit(values => onSubmit(values))()}
        >
          تسویه
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </div>
  )
}
