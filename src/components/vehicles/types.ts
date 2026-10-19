import type {
  VehicleDeadline,
  VehicleHistoryEntry,
  VehicleMileageReminderInterval,
  VehiclePeriodicService,
  VehicleProfile
} from '../../types/vehicles'

export type VehicleProfileWithRow = VehicleProfile & { rowNumber: number }

export type VehicleProfileFormState = {
  title: string
  mileage: string
  vin: string
  buildYear: string
  capacity: string
  plate: string
  mileageReminderInterval: VehicleMileageReminderInterval
  /** Expense types that cannot be saved for this vehicle without a mileage. */
  mileageRequiredTypes: string[]
}

export type VehiclePeriodicFormState = {
  serviceType: string
  mileage: string
  intervalKm: string
  brand: string
  location: string
  amount: number | ''
  notes: string
  date: string
  /** تیک «کارکرد خودرو هم به‌روز شود» برداشته شده: کارکرد خودرو به‌روز نمی‌شود و کیلومتر کمتر از فعلی مجاز است */
  isHistorical: boolean
  reminderEnabled: boolean
  reminderThresholdKm: number
}

export type VehicleDeadlineFormState = {
  category: string
  startDate: string
  endDate: string
  amount: number | ''
  notes: string
  reminderEnabled: boolean
  daysBefore: number
}

export type VehicleCompleteFormState = {
  mileage: string
  intervalKm: string
  brand: string
  location: string
  amount: number | ''
  notes: string
  date: string
  /** تیک «کارکرد خودرو هم به‌روز شود» برداشته شده: کارکرد خودرو به‌روز نمی‌شود و کیلومتر کمتر از فعلی مجاز است */
  isHistorical: boolean
}

export type VehicleMechanicItemFormState = {
  category: string
  note: string
}

export type VehicleMechanicFormState = {
  date: string
  mileage: string
  location: string
  totalAmount: number | ''
  notes: string
  items: VehicleMechanicItemFormState[]
  /** تیک «کارکرد خودرو هم به‌روز شود» برداشته شده: کارکرد خودرو به‌روز نمی‌شود و کیلومتر کمتر از فعلی مجاز است */
  isHistorical: boolean
}

export type VehicleMileageFormState = {
  mileage: string
}

export type VehicleDeleteTarget =
  | { kind: 'periodic'; item: VehiclePeriodicService & { rowNumber: number } }
  | { kind: 'deadline'; item: VehicleDeadline & { rowNumber: number } }
  | { kind: 'history'; item: VehicleHistoryEntry & { rowNumber: number } }
