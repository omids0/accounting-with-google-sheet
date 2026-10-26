import { useMemo } from 'react'
import { useForm } from 'react-hook-form'

import type { PartialPaymentType, SettlementFormLabels, SettlementFormValues } from './types'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import type { SettleOptions } from '../../services/settleOptions'
import { formatMoney } from '../../utils/formatMoney'
import { FormField } from '../form'
import SettleFields from '../settle/SettleFields'
import { useSettleFields } from '../settle/useSettleFields'
import Button from '../ui/Button'
import { receivablePaymentFormClass } from '../ui/treasuryReceivableStyles'

type PartialSettlementFormProps = {
  /** The form starts again when this changes (another item opened). */
  itemId: string
  /** Money in (a receivable) or out (a debt): picks the button colour and the settle answers. */
  type: PartialPaymentType
  labels: SettlementFormLabels
  remaining: number
  defaultTitle: string
  defaultNote: string
  settling: boolean
  /** `transactionRecordId` of every payment of the module (the duplicate check skips them). */
  linkedIds: readonly string[]
  onSubmit: (values: SettlementFormValues, options: SettleOptions) => void
  onCancel: () => void
}

/** Paying the rest in one go: the amount is the remaining, fixed. */
export default function PartialSettlementForm({
  itemId,
  type,
  labels,
  remaining,
  defaultTitle,
  defaultNote,
  settling,
  linkedIds,
  onSubmit,
  onCancel
}: PartialSettlementFormProps) {
  const initialValues = useMemo<SettlementFormValues>(
    () => ({ title: defaultTitle, note: defaultNote }),
    [defaultTitle, defaultNote]
  )

  const { register, handleSubmit, reset } = useForm<SettlementFormValues>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, { resetKey: itemId })

  const settle = useSettleFields({ type, amount: remaining, linkedIds })

  return (
    <div className={receivablePaymentFormClass}>
      {labels.titleLabel && (
        <FormField label={labels.titleLabel} required style={{ marginBottom: '0.75rem' }}>
          <input type="text" {...register('title')} placeholder={labels.titlePlaceholder} />
        </FormField>
      )}
      <FormField label={labels.amountLabel} style={{ marginBottom: '0.75rem' }}>
        <input type="text" value={formatMoney(remaining)} readOnly dir="ltr" />
      </FormField>
      <FormField label="توضیحات" style={{ marginBottom: '0.75rem' }}>
        <input type="text" {...register('note')} placeholder="اختیاری" />
      </FormField>
      <SettleFields state={settle} type={type} />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button
          type="button"
          variant={type === 'income' ? 'inflow' : 'outflow'}
          size="sm"
          disabled={settling}
          loading={settling}
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
