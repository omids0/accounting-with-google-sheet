import { getAssetUnit } from '../../services/tgju'
import type { VaultAssetType } from '../../types'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import JalaliDatePicker from '../JalaliDatePicker'
import type { VaultFormState } from './types'
import { parseQuantityInput } from './utils'

type TreasurySellFormProps = {
  assetType: VaultAssetType
  sellForm: VaultFormState
  selling: boolean
  onSellFormChange: (updater: (prev: VaultFormState) => VaultFormState) => void
  onSell: () => void
  onCancel: () => void
}

export default function TreasurySellForm({
  assetType,
  sellForm,
  selling,
  onSellFormChange,
  onSell,
  onCancel
}: TreasurySellFormProps) {
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
          value={sellForm.quantity === '' ? '' : String(sellForm.quantity)}
          onChange={e =>
            onSellFormChange(f => ({
              ...f,
              quantity: parseQuantityInput(e.target.value, allowDecimal)
            }))
          }
          placeholder={allowDecimal ? 'مثلاً ۱' : 'مثلاً ۱'}
        />
      </FormField>
      <FormField
        label={`قیمت هر ${getAssetUnit(assetType)} (تومان)`}
        style={{ marginBottom: '0.75rem' }}
      >
        <AmountInput
          value={sellForm.unitPrice}
          onChange={val => onSellFormChange(f => ({ ...f, unitPrice: val }))}
        />
      </FormField>
      <FormField label="تاریخ فروش" style={{ marginBottom: '0.75rem' }}>
        <JalaliDatePicker
          value={sellForm.transactionDate}
          onChange={iso => onSellFormChange(f => ({ ...f, transactionDate: iso }))}
        />
      </FormField>
      <FormField label="توضیحات" style={{ marginBottom: '0.75rem' }}>
        <input
          type="text"
          value={sellForm.note}
          onChange={e => onSellFormChange(f => ({ ...f, note: e.target.value }))}
          placeholder="اختیاری"
        />
      </FormField>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          className="btn btn-outflow btn-sm"
          disabled={selling}
          onClick={onSell}
        >
          {selling && <span className="spinner" />}
          ثبت فروش
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
          انصراف
        </button>
      </div>
    </div>
  )
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
