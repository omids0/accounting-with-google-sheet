import { useMemo } from 'react'

import { useForm } from '../../hooks/useForm'
import { getAssetUnit } from '../../services/tgju'
import type { VaultAssetType } from '../../types'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import JalaliDatePicker from '../JalaliDatePicker'
import type { VaultFormState } from './types'
import { parseQuantityInput } from './utils'
import Button from '../ui/Button'

type TreasurySellFormProps = {
  assetType: VaultAssetType
  selling: boolean
  onSell: (values: VaultFormState) => void
  onCancel: () => void
}

export function createEmptySellForm(assetType: VaultAssetType): VaultFormState {
  return {
    assetType,
    quantity: '',
    unitPrice: '',
    transactionDate: getTodayIso(),
    note: ''
  }
}

export default function TreasurySellForm({
  assetType,
  selling,
  onSell,
  onCancel
}: TreasurySellFormProps) {
  const initialValues = useMemo(() => createEmptySellForm(assetType), [assetType])

  const form = useForm(initialValues, { resetKey: assetType })

  const allowDecimal = assetType === 'geram18'

  return (
    <div className="receivable-payment-form">
      <FormField
        label={`مقدار فروش (${getAssetUnit(assetType)})`}
        style={{ marginBottom: '0.75rem' }}
      >
        <input
          type="text"
          inputMode={allowDecimal ? 'decimal' : 'numeric'}
          dir="ltr"
          value={form.values.quantity === '' ? '' : String(form.values.quantity)}
          onChange={e =>
            form.setField('quantity', parseQuantityInput(e.target.value, allowDecimal))
          }
          placeholder={allowDecimal ? 'مثلاً ۱' : 'مثلاً ۱'}
        />
      </FormField>
      <FormField
        label={`قیمت هر ${getAssetUnit(assetType)} (تومان)`}
        style={{ marginBottom: '0.75rem' }}
      >
        <AmountInput
          value={form.values.unitPrice}
          onChange={val => form.setField('unitPrice', val)}
        />
      </FormField>
      <FormField label="تاریخ فروش" style={{ marginBottom: '0.75rem' }}>
        <JalaliDatePicker
          value={form.values.transactionDate}
          onChange={iso => form.setField('transactionDate', iso)}
        />
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
          variant="outflow"
          size="sm"
          disabled={selling}
          onClick={() => onSell(form.values)}
        >
          {selling && <span className="spinner" />}
          ثبت فروش
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </div>
  )
}
