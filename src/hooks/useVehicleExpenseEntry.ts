import { useCallback, useEffect, useMemo, useState } from 'react'

import { VEHICLE_FUEL_EXPENSE_TYPE, VEHICLE_OTHER_OPTION } from '../components/vehicles/constants'
import { syncCategoriesFromSheet } from '../services/categories'
import { getSettings, isConfigured } from '../services/settings'
import { getVehicleExpenseCategories } from '../services/vehicleExpenseCategories'
import { fetchVehicles } from '../services/vehicleProfiles'
import type { VehicleProfile } from '../types/vehicles'
import { requireAuth } from '../utils/authGuard'
import { handleSheetError } from '../utils/sheetError'
import {
  isFuelExpenseType,
  isVehicleExpenseCategory,
  parseNumericField,
  type VehicleExpenseFormValues
} from '../utils/vehicleExpenseUtils'

const DEFAULT_VALUES: VehicleExpenseFormValues = {
  vehicleId: VEHICLE_OTHER_OPTION,
  expenseType: VEHICLE_FUEL_EXPENSE_TYPE,
  fuelPricePerLiter: '',
  mileage: ''
}

export function useVehicleExpenseEntry(active: boolean) {
  const [vehicles, setVehicles] = useState<VehicleProfile[]>([])
  const [expenseTypes, setExpenseTypes] = useState<string[]>(() => getVehicleExpenseCategories())
  const [vehicleValues, setVehicleValues] = useState<VehicleExpenseFormValues>(DEFAULT_VALUES)
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId || !isConfigured() || !requireAuth()) return

    setLoading(true)
    try {
      await syncCategoriesFromSheet(settings.spreadsheetId)
      setExpenseTypes(getVehicleExpenseCategories())
      const items = await fetchVehicles(settings.spreadsheetId)

      setVehicles(items.filter(item => item.active))
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری خودروها' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!active) return

    void loadData()
  }, [active, loadData])

  const resetVehicleValues = useCallback((seed?: Partial<VehicleExpenseFormValues>) => {
    setVehicleValues({ ...DEFAULT_VALUES, ...seed })
  }, [])

  const patchVehicleValues = useCallback((patch: Partial<VehicleExpenseFormValues>) => {
    setVehicleValues(current => ({ ...current, ...patch }))
  }, [])

  const validateVehicleExpense = useCallback(
    (
      category: string,
      amount: string | number
    ): Partial<Record<keyof VehicleExpenseFormValues | 'amount', string>> | null => {
      if (!isVehicleExpenseCategory(category)) return null

      const errors: Partial<Record<keyof VehicleExpenseFormValues | 'amount', string>> = {}

      if (!vehicleValues.expenseType.trim()) {
        errors.expenseType = 'نوع هزینه الزامی است'
      }
      if (isFuelExpenseType(vehicleValues.expenseType)) {
        if (parseNumericField(vehicleValues.fuelPricePerLiter) <= 0) {
          errors.fuelPricePerLiter = 'نرخ هر لیتر الزامی است'
        }
        if (parseNumericField(vehicleValues.mileage) <= 0) {
          errors.mileage = 'کارکرد الزامی است'
        } else if (vehicleValues.vehicleId && vehicleValues.vehicleId !== VEHICLE_OTHER_OPTION) {
          const vehicle = vehicles.find(item => item.id === vehicleValues.vehicleId)

          if (vehicle && parseNumericField(vehicleValues.mileage) < vehicle.mileage) {
            errors.mileage = 'کارکرد نمی‌تواند کمتر از کارکرد فعلی خودرو باشد'
          }
        }
      }
      if (parseNumericField(amount) <= 0) {
        errors.amount = 'مبلغ الزامی است'
      }

      return Object.keys(errors).length ? errors : null
    },
    [vehicleValues, vehicles]
  )

  const buildVehicleExpenseInput = useCallback(
    (formValues: Record<string, string | number>) => ({
      ...vehicleValues,
      date: String(formValues.date ?? ''),
      amount: parseNumericField(formValues.amount),
      note: String(formValues.note ?? '')
    }),
    [vehicleValues]
  )

  const defaultMileageSeed = useMemo(() => {
    if (!vehicleValues.vehicleId || vehicleValues.vehicleId === VEHICLE_OTHER_OPTION) return ''

    const vehicle = vehicles.find(item => item.id === vehicleValues.vehicleId)

    return vehicle?.mileage ?? ''
  }, [vehicleValues.vehicleId, vehicles])

  useEffect(() => {
    if (!isFuelExpenseType(vehicleValues.expenseType)) return
    if (vehicleValues.mileage !== '' && vehicleValues.mileage !== undefined) return
    if (!defaultMileageSeed) return

    setVehicleValues(current => ({ ...current, mileage: defaultMileageSeed }))
  }, [defaultMileageSeed, vehicleValues.expenseType, vehicleValues.mileage])

  return {
    vehicles,
    expenseTypes,
    vehicleValues,
    loading,
    setExpenseTypes,
    resetVehicleValues,
    patchVehicleValues,
    validateVehicleExpense,
    buildVehicleExpenseInput,
    isVehicleCategory: (category: string) => isVehicleExpenseCategory(category)
  }
}
