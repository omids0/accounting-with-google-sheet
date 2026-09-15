import { useMemo } from 'react'

import VehicleSelect from './VehicleSelect'
import { getVehicleExpenseCategories } from '../../services/vehicleExpenseCategories'
import type { VehicleProfile } from '../../types/vehicles'
import { LOCKED_VEHICLE_EXPENSE_TYPES } from '../../utils/protectedCategories'
import {
  calculateFuelLiters,
  isFuelExpenseType,
  type VehicleExpenseFormValues
} from '../../utils/vehicleExpenseUtils'
import AmountInput from '../AmountInput'
import CategorySelect from '../form/CategorySelect'
import FormField from '../form/FormField'
import { VEHICLE_OTHER_OPTION } from '../vehicles/constants'
import MileageInput from '../vehicles/MileageInput'

type VehicleExpenseFieldsProps = {
  values: VehicleExpenseFormValues
  amount: string | number
  onChange: (patch: Partial<VehicleExpenseFormValues>) => void
  vehicles: VehicleProfile[]
  expenseTypes?: string[]
  onExpenseTypesChange?: (categories: string[]) => void
  disabled?: boolean
  errors?: Partial<Record<keyof VehicleExpenseFormValues | 'amount', string>>
}

export default function VehicleExpenseFields({
  values,
  amount,
  onChange,
  vehicles,
  expenseTypes,
  onExpenseTypesChange,
  disabled = false,
  errors = {}
}: VehicleExpenseFieldsProps) {
  const categories = expenseTypes ?? getVehicleExpenseCategories()
  const isFuel = isFuelExpenseType(values.expenseType)
  const fuelLiters = useMemo(() => {
    if (!isFuel) return 0

    const price = Number(values.fuelPricePerLiter) || 0
    const total = Number(amount) || 0

    return calculateFuelLiters(total, price)
  }, [amount, isFuel, values.fuelPricePerLiter])

  return (
    <>
      <VehicleSelect
        value={values.vehicleId || VEHICLE_OTHER_OPTION}
        onChange={vehicleId => onChange({ vehicleId })}
        vehicles={vehicles}
        invalid={Boolean(errors.vehicleId)}
        disabled={disabled}
      />

      <FormField label="نوع هزینه" required controlWidth="full" error={errors.expenseType}>
        <CategorySelect
          value={values.expenseType}
          onChange={expenseType => onChange({ expenseType })}
          categories={categories}
          categoryScope="vehicleExpense"
          onCategoriesChange={onExpenseTypesChange}
          lockedCategories={[...LOCKED_VEHICLE_EXPENSE_TYPES]}
          disabled={disabled}
          invalid={Boolean(errors.expenseType)}
          aria-label="نوع هزینه خودرو"
          placeholder="انتخاب نوع هزینه"
        />
      </FormField>

      {isFuel ? (
        <>
          <FormField
            label="نرخ هر لیتر (تومان)"
            required
            controlWidth="full"
            error={errors.fuelPricePerLiter}
          >
            <AmountInput
              value={values.fuelPricePerLiter}
              onChange={next => onChange({ fuelPricePerLiter: next })}
              invalid={Boolean(errors.fuelPricePerLiter)}
            />
          </FormField>

          <FormField label="کارکرد فعلی" required controlWidth="full" error={errors.mileage}>
            <MileageInput
              value={values.mileage}
              onChange={mileage => onChange({ mileage })}
              invalid={Boolean(errors.mileage)}
            />
          </FormField>

          {fuelLiters > 0 ? (
            <p className="text-[0.82rem] text-muted">
              معادل{' '}
              <span className="font-semibold text-foreground" dir="ltr">
                {fuelLiters.toLocaleString('fa-IR', { maximumFractionDigits: 2 })}
              </span>{' '}
              لیتر بنزین
            </p>
          ) : null}
        </>
      ) : null}
    </>
  )
}
