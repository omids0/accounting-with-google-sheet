import { useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
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

  const { handleSubmit, reset, setValue, watch } = useForm<VaultFormState>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingTx?.id ?? 'create'
  })

  const assetType = watch('assetType')
  const quantity = watch('quantity')
  const selectedAsset = VAULT_ASSET_OPTIONS.find(asset => asset.value === assetType)
  const allowDecimal = assetType === 'geram18'

  const onFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    void handleSubmit(values => onSubmit(values))(event)
  }

  return (
    <FormModal
      open={open}
      title={editingTx ? 'ویرایش خرید' : 'ثبت خرید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingTx ? 'ذخیره تغییرات' : 'ذخیره خرید'}
      saveButtonVariant="outflow"
    >
      <FormSelect
        label="نوع دارایی"
        required
        value={assetType}
        onChange={next => {
          setValue('assetType', next as VaultAssetType)
          setValue('quantity', '')
        }}
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

      <FormField label={`مقدار (${getAssetUnit(assetType)})`} required>
        <input
          type="text"
          inputMode={allowDecimal ? 'decimal' : 'numeric'}
          dir="ltr"
          value={quantity === '' ? '' : String(quantity)}
          onChange={e => setValue('quantity', parseQuantityInput(e.target.value, allowDecimal))}
          placeholder={allowDecimal ? 'مثلاً ۲.۵' : 'مثلاً ۳'}
        />
      </FormField>

      <FormField label={`قیمت هر ${getAssetUnit(assetType)} (تومان)`} required>
        <AmountInput value={watch('unitPrice')} onChange={val => setValue('unitPrice', val)} />
      </FormField>

      <FormField label="تاریخ خرید" required>
        <JalaliDatePicker
          value={watch('transactionDate')}
          onChange={iso => setValue('transactionDate', iso)}
        />
      </FormField>

      <FormField label="توضیحات">
        <textarea
          value={watch('note')}
          onChange={e => setValue('note', e.target.value)}
          placeholder="توضیحات اختیاری"
        />
      </FormField>
    </FormModal>
  )
}
