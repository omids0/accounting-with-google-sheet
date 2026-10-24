import { useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { emptyNewAsset } from './TreasuryAssetPicker'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { resolveVaultAsset } from '../../services/treasuryCatalog'
import type { VaultAssetType } from '../../types'
import { focusFirstInvalidField } from '../../utils/focusInvalidField'
import { getTodayIso } from '../../utils/jalaliDate'
import { showError } from '../../utils/toast'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import JalaliDatePicker from '../JalaliDatePicker'
import QuantityInput from './QuantityInput'
import { tradeFormErrors, type TradeFormErrors } from './tradeErrors'
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

  const rootRef = useRef<HTMLDivElement>(null)
  const [errors, setErrors] = useState<TradeFormErrors>({})

  const clearError = (field: keyof TradeFormErrors) =>
    setErrors(c => ({ ...c, [field]: undefined }))

  const submit = () => {
    void handleSubmit(values => {
      const found = tradeFormErrors(values, decimals, {
        price: 'قیمت فروش را وارد کنید',
        date: 'تاریخ فروش الزامی است',
        emptyQuantity: 'مقدار فروش را وارد کنید'
      })

      setErrors(found)

      const first = found.quantity ?? found.unitPrice ?? found.transactionDate

      if (first) {
        showError(first)
        focusFirstInvalidField(rootRef.current)

        return
      }

      onSell(values)
    })()
  }

  return (
    <div ref={rootRef} className={receivablePaymentFormClass}>
      <FormField
        label={`مقدار فروش (${unit})`}
        style={{ marginBottom: '0.75rem' }}
        controlWidth="standard"
        error={errors.quantity}
      >
        <QuantityInput
          value={watch('quantity')}
          decimals={decimals}
          onChange={value => {
            clearError('quantity')
            setValue('quantity', value)
          }}
        />
      </FormField>
      <FormField
        label={`قیمت هر ${unit} (تومان)`}
        style={{ marginBottom: '0.75rem' }}
        error={errors.unitPrice}
      >
        <AmountInput
          value={watch('unitPrice')}
          onChange={val => {
            clearError('unitPrice')
            setValue('unitPrice', val)
          }}
        />
      </FormField>
      <FormField
        label="تاریخ فروش"
        style={{ marginBottom: '0.75rem' }}
        error={errors.transactionDate}
      >
        <JalaliDatePicker
          value={watch('transactionDate')}
          onChange={iso => {
            clearError('transactionDate')
            setValue('transactionDate', iso)
          }}
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
          onClick={submit}
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
