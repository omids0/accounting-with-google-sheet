import type {
  VehicleCompleteFormState,
  VehicleDeadlineFormState,
  VehiclePeriodicFormState,
  VehicleProfileWithRow
} from './types'
import type { DeadlineWithRow, PeriodicWithRow } from './vehicleDetailMutations'

export function buildPeriodicInitialValues(
  editingPeriodic: PeriodicWithRow | null,
  currentMileage: number
): Partial<VehiclePeriodicFormState> | undefined {
  if (!editingPeriodic) return undefined

  return {
    serviceType: editingPeriodic.serviceType,
    mileage: String(editingPeriodic.currentMileage),
    isHistorical: editingPeriodic.currentMileage < currentMileage,
    intervalKm: String(editingPeriodic.intervalKm),
    brand: editingPeriodic.brand,
    location: editingPeriodic.location,
    amount: editingPeriodic.amount > 0 ? editingPeriodic.amount : '',
    notes: editingPeriodic.notes
  }
}

export function buildDeadlineInitialValues(
  editingDeadline: DeadlineWithRow | null
): Partial<VehicleDeadlineFormState> | undefined {
  if (!editingDeadline) return undefined

  return {
    category: editingDeadline.category,
    startDate: editingDeadline.startDate,
    endDate: editingDeadline.endDate,
    amount: editingDeadline.amount > 0 ? editingDeadline.amount : '',
    notes: editingDeadline.notes,
    reminderEnabled: editingDeadline.reminderEnabled,
    daysBefore: editingDeadline.daysBefore
  }
}

export function buildCompleteInitialValues(
  completingPeriodic: PeriodicWithRow | null,
  currentVehicle: VehicleProfileWithRow
): Partial<VehicleCompleteFormState> | undefined {
  if (!completingPeriodic) return undefined

  return {
    mileage: String(
      completingPeriodic.currentMileage < currentVehicle.mileage
        ? completingPeriodic.currentMileage
        : currentVehicle.mileage
    ),
    isHistorical: completingPeriodic.currentMileage < currentVehicle.mileage,
    intervalKm: String(completingPeriodic.intervalKm),
    brand: completingPeriodic.brand,
    location: completingPeriodic.location,
    amount: completingPeriodic.amount > 0 ? completingPeriodic.amount : '',
    notes: completingPeriodic.notes
  }
}
