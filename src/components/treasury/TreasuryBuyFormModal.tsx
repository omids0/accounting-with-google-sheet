import { useMemo } from 'react'

import { useForm } from '../../hooks/useForm'
import { getAssetUnit, VAULT_ASSET_OPTIONS } from '../../services/tgju'
import type { VaultAssetType } from '../../types'
import AmountInput from '../AmountInput'
import { FormField, FormSelect } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import type { TransactionWithRow, VaultFormState } from './types'
import { createEmptyBuyForm } from './useTreasuryForms'
import { parseQuantityInput } from './utils'
import { treasuryHintClass } from '../ui/treasuryReceivableStyles'

type TreasuryBuyFormModalProps = {
  open: boolean
  editingTx: TransactionWithRow | null
  saving: boolean
  onClose: () => void
  onSubmit: (values: VaultFormState) => void | Promise<void>
}

export default function TreasuryBuyFormModal({
  open,
  editingTx,
  saving,
  onClose,
  onSubmit
}: TreasuryBuyFormModalProps) {
  const initialValues = useMemo<VaultFormState>(
    () =>
      editingTx
        ? {
            assetType: editingTx.assetType,
            quantity: editingTx.quantity,
            unitPrice: editingTx.unitPrice,
            transactionDate: editingTx.transactionDate,
            note: editingTx.note
          }
        : createEmptyBuyForm(),
    [editingTx]
  )

  const form = useForm(initialValues, {
    active: open,
    resetKey: editingTx?.id ?? 'create'
  })

  const selectedAsset = VAULT_ASSET_OPTIONS.find(a => a.value === form.values.assetType)
  const allowDecimal = form.values.assetType === 'geram18'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void onSubmit(form.values)
  }

  return (
    <FormModal
      open={open}
      title={editingTx ? 'ویرایش خرید' : 'ثبت خرید'}
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      saveLabel={editingTx ? 'ذخیره تغییرات' : 'ذخیره خرید'}
      saveButtonVariant="outflow"
    >
      <FormSelect
        label="نوع دارایی"
        required
        value={form.values.assetType}
        onChange={next =>
          form.setFields({
            assetType: next as VaultAssetType,
            quantity: ''
          })
        }
        options={VAULT_ASSET_OPTIONS.map(opt => ({
          value: opt.value,
          label: opt.label
        }))}
        hint={
          selectedAsset?.hint ? (
            <p className={treasuryHintClass}>{selectedAsset.hint}</p>
          ) : undefined
        }
      />

      <FormField label={`مقدار (${getAssetUnit(form.values.assetType)})`} required>
        <input
          type="text"
          inputMode={allowDecimal ? 'decimal' : 'numeric'}
          dir="ltr"
          value={form.values.quantity === '' ? '' : String(form.values.quantity)}
          onChange={e =>
            form.setField('quantity', parseQuantityInput(e.target.value, allowDecimal))
          }
          placeholder={allowDecimal ? 'مثلاً ۲.۵' : 'مثلاً ۳'}
        />
      </FormField>

      <FormField label={`قیمت هر ${getAssetUnit(form.values.assetType)} (تومان)`} required>
        <AmountInput
          value={form.values.unitPrice}
          onChange={val => form.setField('unitPrice', val)}
        />
      </FormField>

      <FormField label="تاریخ خرید" required>
        <JalaliDatePicker
          value={form.values.transactionDate}
          onChange={iso => form.setField('transactionDate', iso)}
        />
      </FormField>

      <FormField label="توضیحات">
        <textarea
          value={form.values.note}
          onChange={e => form.setField('note', e.target.value)}
          placeholder="توضیحات اختیاری"
        />
      </FormField>
    </FormModal>
  )
}
