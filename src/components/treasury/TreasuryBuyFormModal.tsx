import { getAssetUnit, VAULT_ASSET_OPTIONS } from '../../services/tgju'
import type { VaultAssetType } from '../../types'
import AmountInput from '../AmountInput'
import { FormField, FormSelect } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import type { TransactionWithRow, VaultFormState } from './types'
import { parseQuantityInput } from './utils'

type TreasuryBuyFormModalProps = {
  open: boolean
  editingTx: TransactionWithRow | null
  form: VaultFormState
  saving: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onFormChange: (updater: (prev: VaultFormState) => VaultFormState) => void
}

export default function TreasuryBuyFormModal({
  open,
  editingTx,
  form,
  saving,
  onClose,
  onSubmit,
  onFormChange
}: TreasuryBuyFormModalProps) {
  const selectedAsset = VAULT_ASSET_OPTIONS.find(a => a.value === form.assetType)
  const allowDecimal = form.assetType === 'geram18'

  return (
    <FormModal
      open={open}
      title={editingTx ? 'ویرایش خرید' : 'ثبت خرید'}
      onClose={onClose}
      onSubmit={onSubmit}
      saving={saving}
      saveLabel={editingTx ? 'ذخیره تغییرات' : 'ذخیره خرید'}
      saveButtonClassName="btn btn-outflow"
    >
      <FormSelect
        label="نوع دارایی"
        required
        value={form.assetType}
        onChange={next =>
          onFormChange(f => ({
            ...f,
            assetType: next as VaultAssetType,
            quantity: ''
          }))
        }
        options={VAULT_ASSET_OPTIONS.map(opt => ({
          value: opt.value,
          label: opt.label
        }))}
        hint={
          selectedAsset?.hint ? <p className="treasury-hint">{selectedAsset.hint}</p> : undefined
        }
      />

      <FormField label={`مقدار (${getAssetUnit(form.assetType)})`} required>
        <input
          type="text"
          inputMode={allowDecimal ? 'decimal' : 'numeric'}
          dir="ltr"
          value={form.quantity === '' ? '' : String(form.quantity)}
          onChange={e =>
            onFormChange(f => ({
              ...f,
              quantity: parseQuantityInput(e.target.value, allowDecimal)
            }))
          }
          placeholder={allowDecimal ? 'مثلاً ۲.۵' : 'مثلاً ۳'}
        />
      </FormField>

      <FormField label={`قیمت هر ${getAssetUnit(form.assetType)} (تومان)`} required>
        <AmountInput
          value={form.unitPrice}
          onChange={val => onFormChange(f => ({ ...f, unitPrice: val }))}
        />
      </FormField>

      <FormField label="تاریخ خرید" required>
        <JalaliDatePicker
          value={form.transactionDate}
          onChange={iso => onFormChange(f => ({ ...f, transactionDate: iso }))}
        />
      </FormField>

      <FormField label="توضیحات">
        <textarea
          value={form.note}
          onChange={e => onFormChange(f => ({ ...f, note: e.target.value }))}
          placeholder="توضیحات اختیاری"
        />
      </FormField>
    </FormModal>
  )
}
