import { useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
import { resolveVaultAsset } from '../../services/treasuryCatalog'
import type { VaultAsset, VaultAssetClass } from '../../types'
import AmountInput from '../AmountInput'
import { FormField, FormRow } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import QuantityInput from './QuantityInput'
import TreasuryAssetPicker, { defaultAssetForClass, emptyNewAsset } from './TreasuryAssetPicker'
import { NEW_ASSET_OPTION, type TransactionWithRow, type VaultFormState } from './types'
import { getTodayIso } from '../../utils/jalaliDate'

type TreasuryBuyFormModalProps = {
  open: boolean
  editingTx: TransactionWithRow | null
  catalog: VaultAsset[]
  /** Class a new purchase starts in (the selected chip). */
  defaultClass: VaultAssetClass
  saving: boolean
  onClose: () => void
  onSubmit: (values: VaultFormState) => void | Promise<void>
}

export function createEmptyBuyForm(
  catalog: VaultAsset[],
  assetClass: VaultAssetClass = 'gold'
): VaultFormState {
  return {
    assetClass,
    assetType: defaultAssetForClass(catalog, assetClass),
    newAsset: emptyNewAsset(assetClass),
    quantity: '',
    unitPrice: '',
    transactionDate: getTodayIso(),
    note: ''
  }
}

export default function TreasuryBuyFormModal({
  open,
  editingTx,
  catalog,
  defaultClass,
  saving,
  onClose,
  onSubmit
}: TreasuryBuyFormModalProps) {
  const initialValues = useMemo<VaultFormState>(() => {
    if (!editingTx) return createEmptyBuyForm(catalog, defaultClass)

    const { assetClass } = resolveVaultAsset(editingTx.assetType, catalog)

    return {
      assetClass,
      assetType: editingTx.assetType,
      newAsset: emptyNewAsset(assetClass),
      quantity: editingTx.quantity,
      unitPrice: editingTx.unitPrice,
      transactionDate: editingTx.transactionDate,
      note: editingTx.note
    }
    // The catalog only fills in the form when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTx, defaultClass, open])

  const { handleSubmit, reset, setValue, watch } = useForm<VaultFormState>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingTx?.id ?? `create-${defaultClass}`
  })

  const assetClass = watch('assetClass')
  const assetType = watch('assetType')
  const newAsset = watch('newAsset')
  const isNew = assetType === NEW_ASSET_OPTION
  const asset = isNew ? null : resolveVaultAsset(assetType, catalog)
  const decimals = asset ? asset.decimals : newAsset.decimals
  const unit = (asset ? asset.unit : newAsset.unit) || 'واحد'

  const onFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    return handleSubmit(values => onSubmit(values))(event)
  }

  return (
    <FormModal
      variant="panel"
      open={open}
      title={editingTx ? 'ویرایش خرید' : 'ثبت خرید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingTx ? 'ذخیره تغییرات' : 'ذخیره خرید'}
      saveButtonVariant="outflow"
    >
      <TreasuryAssetPicker
        catalog={catalog}
        value={{ assetClass, assetType, newAsset }}
        allowNew={!editingTx}
        onChange={patch => {
          for (const [key, value] of Object.entries(patch)) {
            setValue(key as keyof typeof patch, value as never)
          }
          if (patch.assetType !== undefined) setValue('quantity', '')
        }}
      />

      <FormRow>
        <FormField label={`مقدار (${unit})`} required controlWidth="standard">
          <QuantityInput
            value={watch('quantity')}
            decimals={decimals}
            onChange={value => setValue('quantity', value)}
          />
        </FormField>

        <FormField label={`قیمت هر ${unit} (تومان)`} required>
          <AmountInput value={watch('unitPrice')} onChange={val => setValue('unitPrice', val)} />
        </FormField>
      </FormRow>

      <FormField label="تاریخ خرید" required>
        <JalaliDatePicker
          value={watch('transactionDate')}
          onChange={iso => setValue('transactionDate', iso)}
        />
      </FormField>

      <FormField label="توضیحات" controlWidth="full">
        <textarea
          value={watch('note')}
          onChange={e => setValue('note', e.target.value)}
          placeholder="توضیحات اختیاری"
        />
      </FormField>
    </FormModal>
  )
}
