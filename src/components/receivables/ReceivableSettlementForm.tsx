import { useMemo } from 'react'

import { useForm } from '../../hooks/useForm'
import { formatMoney } from '../../utils/formatMoney'
import { FormField } from '../form'
import type { SettlementFormState } from './types'
import Button from '../ui/Button'
import { spinnerClass } from '../ui/displayStyles'
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

export default function ReceivableSettlementForm({
  receivableId,
  remaining,
  defaultTitle,
  defaultNote,
  settling,
  onSubmit,
  onCancel
}: ReceivableSettlementFormProps) {
  const initialValues = useMemo(
    () => ({ title: defaultTitle, note: defaultNote }),
    [defaultTitle, defaultNote]
  )

  const form = useForm(initialValues, { resetKey: receivableId })

  return (
    <div className={receivablePaymentFormClass}>
      <FormField label="عنوان درآمد" required style={{ marginBottom: '0.75rem' }}>
        <input
          type="text"
          value={form.values.title}
          onChange={e => form.setField('title', e.target.value)}
          placeholder="مثلاً: طلب: علی محمدی"
        />
      </FormField>
      <FormField label="مبلغ تسویه" style={{ marginBottom: '0.75rem' }}>
        <input type="text" value={formatMoney(remaining)} readOnly dir="ltr" />
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
        <Button
          type="button"
          variant="inflow"
          size="sm"
          disabled={settling}
          onClick={() => onSubmit(form.values)}
        >
          {settling && <span className={spinnerClass} />}
          تسویه
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </div>
  )
}
