import { useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { emptyNewAsset } from './TreasuryAssetPicker'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { resolveVaultAsset } from '../../services/treasuryCatalog'
import type { VaultAssetType } from '../../types'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import JalaliDatePicker from '../JalaliDatePicker'
import QuantityInput from './QuantityInput'
import type { VaultFormState } from './types'
import Button from '../ui/Button'
import { receivablePaymentFormClass } from '../ui/treasuryReceivableStyles'

type TreasurySellFormProps = {
  assetType: VaultAssetType
  selling: boolean
  onSell: (values: VaultFormState) => void
  onCancel: () => void
}

export function createEmptySellForm(assetType: VaultAssetType): VaultFormState {
  const { assetClass } = resolveVaultAsset(assetType)

  return {
    assetClass,
    assetType,
    newAsset: emptyNewAsset(assetClass),
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

  const { handleSubmit, reset, setValue, watch } = useForm<VaultFormState>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, { resetKey: assetType })

  const { decimals, unit } = resolveVaultAsset(assetType)

  return (
    <div className={receivablePaymentFormClass}>
      <FormField
        label={`مقدار فروش (${unit})`}
        style={{ marginBottom: '0.75rem' }}
        controlWidth="standard"
      >
        <QuantityInput
          value={watch('quantity')}
          decimals={decimals}
          onChange={value => setValue('quantity', value)}
        />
      </FormField>
      <FormField label={`قیمت هر ${unit} (تومان)`} style={{ marginBottom: '0.75rem' }}>
        <AmountInput value={watch('unitPrice')} onChange={val => setValue('unitPrice', val)} />
      </FormField>
      <FormField label="تاریخ فروش" style={{ marginBottom: '0.75rem' }}>
        <JalaliDatePicker
          value={watch('transactionDate')}
          onChange={iso => setValue('transactionDate', iso)}
        />
      </FormField>
      <FormField label="توضیحات" style={{ marginBottom: '0.75rem' }}>
        <input
          type="text"
          value={watch('note')}
          onChange={e => setValue('note', e.target.value)}
          placeholder="اختیاری"
        />
      </FormField>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button
          type="button"
          variant="outflow"
          size="sm"
          disabled={selling}
          loading={selling}
          onClick={() => void handleSubmit(values => onSell(values))()}
        >
          ثبت فروش
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </div>
  )
}
