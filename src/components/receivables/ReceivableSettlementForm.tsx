import { useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
import type { SettleOptions } from '../../services/settleOptions'
import { formatMoney } from '../../utils/formatMoney'
import { FormField } from '../form'
import type { SettlementFormState } from './types'
import SettleFields from '../settle/SettleFields'
import { useSettleFields } from '../settle/useSettleFields'
import Button from '../ui/Button'
import { receivablePaymentFormClass } from '../ui/treasuryReceivableStyles'

type ReceivableSettlementFormProps = {
  receivableId: string
  remaining: number
  defaultTitle: string
  defaultNote: string
  settling: boolean
  /** `transactionRecordId` of every receivable payment (the duplicate check skips them). */
  linkedIds: readonly string[]
  onSubmit: (values: Omit<SettlementFormState, 'receivableId'>, options: SettleOptions) => void
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
  linkedIds,
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

  const settle = useSettleFields({ type: 'income', amount: remaining, linkedIds })

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
      <SettleFields state={settle} type="income" />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button
          type="button"
          variant="inflow"
          size="sm"
          disabled={settling}
          loading={settling}
          onClick={() => void handleSubmit(values => onSubmit(values, settle.commit()))()}
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
