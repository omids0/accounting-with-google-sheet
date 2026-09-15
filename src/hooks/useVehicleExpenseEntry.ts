import { useCallback, useEffect, useState } from 'react'

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

export type VehicleExpenseFieldErrors = Partial<
  Record<keyof VehicleExpenseFormValues | 'amount', string>
>

function createDefaultValues(vehicles: VehicleProfile[]): VehicleExpenseFormValues {
  return {
    vehicleId: vehicles[0]?.id ?? VEHICLE_OTHER_OPTION,
    expenseType: VEHICLE_FUEL_EXPENSE_TYPE,
    fuelPricePerLiter: '',
    mileage: ''
  }
}

export function useVehicleExpenseEntry(active: boolean) {
  const [vehicles, setVehicles] = useState<VehicleProfile[]>([])
  const [expenseTypes, setExpenseTypes] = useState<string[]>(() => getVehicleExpenseCategories())
  const [vehicleValues, setVehicleValues] = useState<VehicleExpenseFormValues>(() =>
    createDefaultValues([])
  )
  const [fieldErrors, setFieldErrors] = useState<VehicleExpenseFieldErrors>({})
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId || !isConfigured() || !requireAuth()) return

    setLoading(true)
    try {
      await syncCategoriesFromSheet(settings.spreadsheetId)
      setExpenseTypes(getVehicleExpenseCategories())
      const items = await fetchVehicles(settings.spreadsheetId)
      const activeVehicles = items.filter(item => item.active)

      setVehicles(activeVehicles)
      setVehicleValues(current => {
        const hasValidVehicle = activeVehicles.some(item => item.id === current.vehicleId)
        const vehicleId = hasValidVehicle
          ? current.vehicleId
          : activeVehicles[0]?.id ?? VEHICLE_OTHER_OPTION
        const vehicle = activeVehicles.find(item => item.id === vehicleId)
        const shouldSeedMileage =
          isFuelExpenseType(current.expenseType) && vehicleId !== VEHICLE_OTHER_OPTION && vehicle

        return {
          ...current,
          vehicleId,
          mileage: shouldSeedMileage ? vehicle.mileage : current.mileage
        }
      })
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

  const resetVehicleValues = useCallback(
    (seed?: Partial<VehicleExpenseFormValues>) => {
      setFieldErrors({})
      setVehicleValues({ ...createDefaultValues(vehicles), ...seed })
    },
    [vehicles]
  )

  const clearFieldError = useCallback((key: keyof VehicleExpenseFieldErrors) => {
    setFieldErrors(current => {
      if (!current[key]) return current

      const next = { ...current }

      delete next[key]

      return next
    })
  }, [])

  const patchVehicleValues = useCallback(
    (patch: Partial<VehicleExpenseFormValues>) => {
      setFieldErrors(current => {
        const next = { ...current }

        for (const key of Object.keys(patch) as Array<keyof VehicleExpenseFormValues>) {
          delete next[key]
        }

        return next
      })

      setVehicleValues(current => {
        const next = { ...current, ...patch }

        if ('expenseType' in patch && !isFuelExpenseType(next.expenseType)) {
          next.mileage = ''
          next.fuelPricePerLiter = ''
        }

        const shouldSyncMileage =
          isFuelExpenseType(next.expenseType) &&
          ('vehicleId' in patch || 'expenseType' in patch || current.mileage === '')

        if (shouldSyncMileage) {
          if (!next.vehicleId || next.vehicleId === VEHICLE_OTHER_OPTION) {
            next.mileage = ''
          } else {
            const vehicle = vehicles.find(item => item.id === next.vehicleId)

            if (vehicle) next.mileage = vehicle.mileage
          }
        }

        return next
      })
    },
    [vehicles]
  )

  const validateVehicleExpense = useCallback(
    (category: string, amount: string | number): VehicleExpenseFieldErrors | null => {
      if (!isVehicleExpenseCategory(category)) {
        setFieldErrors({})

        return null
      }

      const errors: VehicleExpenseFieldErrors = {}

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

      setFieldErrors(errors)

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

  return {
    vehicles,
    expenseTypes,
    vehicleValues,
    fieldErrors,
    loading,
    setExpenseTypes,
    resetVehicleValues,
    patchVehicleValues,
    clearFieldError,
    validateVehicleExpense,
    buildVehicleExpenseInput,
    isVehicleCategory: (category: string) => isVehicleExpenseCategory(category)
  }
}
