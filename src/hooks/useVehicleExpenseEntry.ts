import { useCallback, useEffect, useMemo, useState } from 'react'

import { VEHICLE_FUEL_EXPENSE_TYPE, VEHICLE_OTHER_OPTION } from '../components/vehicles/constants'
import { syncCategoriesFromSheet } from '../services/categories'
import { getSettings, isConfigured } from '../services/settings'
import { getVehicleExpenseCategories } from '../services/vehicleExpenseCategories'
import { fetchVehiclePeriodicServices } from '../services/vehiclePeriodicServices'
import { fetchVehicles } from '../services/vehicleProfiles'
import type { VehiclePeriodicService, VehicleProfile } from '../types/vehicles'
import { requireAuth } from '../utils/authGuard'
import { shareInFlight } from '../utils/shareInFlight'
import { handleSheetError } from '../utils/sheetError'
import {
  isFuelExpenseType,
  isMileageRequired,
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

/** `allowRenew`: a new entry may also renew the vehicle's periodic service of the same type. */
export function useVehicleExpenseEntry(active: boolean, allowRenew = false) {
  const [vehicles, setVehicles] = useState<VehicleProfile[]>([])
  const [periodics, setPeriodics] = useState<VehiclePeriodicService[]>([])
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
      const id = settings.spreadsheetId

      // Several cards (bank SMS) may load at once: they share each request.
      await shareInFlight(`categories:${id}`, () => syncCategoriesFromSheet(id))
      setExpenseTypes(getVehicleExpenseCategories())
      const [items, periodicItems] = await Promise.all([
        shareInFlight(`vehicles:${id}`, () => fetchVehicles(id)),
        allowRenew ? shareInFlight(`periodics:${id}`, () => fetchVehiclePeriodicServices(id)) : null
      ])
      const activeVehicles = items.filter(item => item.active)

      setVehicles(activeVehicles)
      if (periodicItems) setPeriodics(periodicItems)
      setVehicleValues(current => {
        const hasValidVehicle = activeVehicles.some(item => item.id === current.vehicleId)
        const vehicleId = hasValidVehicle
          ? current.vehicleId
          : activeVehicles[0]?.id ?? VEHICLE_OTHER_OPTION
        const vehicle = activeVehicles.find(item => item.id === vehicleId)
        const shouldSeedMileage =
          isMileageRequired(vehicle, current.expenseType) &&
          vehicleId !== VEHICLE_OTHER_OPTION &&
          vehicle

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
  }, [allowRenew])

  useEffect(() => {
    if (!active) return

    void loadData()
  }, [active, loadData])

  const renewableService = useMemo(
    () =>
      allowRenew
        ? periodics.find(
            item =>
              item.vehicleId === vehicleValues.vehicleId &&
              item.serviceType.trim() === vehicleValues.expenseType.trim()
          )
        : undefined,
    [allowRenew, periodics, vehicleValues.vehicleId, vehicleValues.expenseType]
  )

  const renewing = Boolean(renewableService) && vehicleValues.renewPeriodic !== false

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
          next.fuelPricePerLiter = ''
        }

        if ('vehicleId' in patch || 'expenseType' in patch) {
          const vehicle = vehicles.find(item => item.id === next.vehicleId)
          const previous = vehicles.find(item => item.id === current.vehicleId)
          const typedByUser =
            current.mileage !== '' && String(current.mileage) !== String(previous?.mileage ?? '')

          // The vehicle's current mileage only seeds a required field; an optional one stays
          // empty unless the user typed a value.
          if (vehicle && isMileageRequired(vehicle, next.expenseType)) {
            next.mileage = vehicle.mileage
          } else if (!typedByUser) {
            next.mileage = ''
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
      if (
        isFuelExpenseType(vehicleValues.expenseType) &&
        parseNumericField(vehicleValues.fuelPricePerLiter) <= 0
      ) {
        errors.fuelPricePerLiter = 'نرخ هر لیتر الزامی است'
      }

      const vehicle =
        vehicleValues.vehicleId && vehicleValues.vehicleId !== VEHICLE_OTHER_OPTION
          ? vehicles.find(item => item.id === vehicleValues.vehicleId)
          : undefined
      const mileage = parseNumericField(vehicleValues.mileage)

      if (mileage <= 0) {
        if (renewing) {
          errors.mileage = 'برای تمدید سرویس، کارکرد لازم است'
        } else if (isMileageRequired(vehicle, vehicleValues.expenseType)) {
          errors.mileage = 'کارکرد الزامی است'
        }
      } else if (vehicle && mileage < vehicle.mileage) {
        errors.mileage = 'کارکرد نمی‌تواند کمتر از کارکرد فعلی خودرو باشد'
      }
      if (parseNumericField(amount) <= 0) {
        errors.amount = 'مبلغ الزامی است'
      }

      setFieldErrors(errors)

      return Object.keys(errors).length ? errors : null
    },
    [vehicleValues, vehicles, renewing]
  )

  const buildVehicleExpenseInput = useCallback(
    (formValues: Record<string, string | number>) => ({
      ...vehicleValues,
      date: String(formValues.date ?? ''),
      amount: parseNumericField(formValues.amount),
      note: String(formValues.note ?? ''),
      walletAccount: String(formValues.walletAccount ?? ''),
      walletApply: String(formValues.walletApply ?? ''),
      renewServiceId: renewing ? renewableService?.id : undefined
    }),
    [vehicleValues, renewing, renewableService]
  )

  return {
    vehicles,
    expenseTypes,
    renewableService,
    renewing,
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
