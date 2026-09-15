export type VehicleMileageReminderInterval =
  | 'first-of-month'
  | 'every-2-months'
  | 'every-3-months'
  | 'every-6-months'
  | 'yearly'
  | 'weekly'
  | 'biweekly'
  | 'triweekly'
  | 'daily'
  | 'every-3-days'
  | 'every-10-days'

export type VehicleRecordKind = 'periodic' | 'deadline' | 'mechanic'

export interface VehicleProfile {
  id: string
  createdAt: string
  title: string
  mileage: number
  vin: string
  buildYear: string
  capacity: string
  plate: string
  mileageReminderInterval: VehicleMileageReminderInterval
  lastMileageUpdate: string
  active: boolean
}

export interface VehiclePeriodicService {
  id: string
  vehicleId: string
  createdAt: string
  serviceType: string
  currentMileage: number
  intervalKm: number
  nextKm: number
  brand: string
  location: string
  amount: number
  notes: string
  expenseRecordId: string
  active: boolean
}

export interface VehicleDeadline {
  id: string
  vehicleId: string
  createdAt: string
  category: string
  startDate: string
  endDate: string
  amount: number
  notes: string
  expenseRecordId: string
  active: boolean
  reminderEnabled: boolean
  daysBefore: number
}

export interface VehicleMechanicItem {
  category: string
  note: string
}

export interface VehicleMechanicVisit {
  id: string
  vehicleId: string
  createdAt: string
  date: string
  mileage: number
  location: string
  totalAmount: number
  items: VehicleMechanicItem[]
  notes: string
  expenseRecordId: string
}

export interface VehicleHistoryEntry {
  id: string
  vehicleId: string
  createdAt: string
  recordKind: VehicleRecordKind
  referenceId: string
  date: string
  mileage: number
  nextKm: number
  details: string
  amount: number
  expenseRecordId: string
}

export type VehicleUrgencyLevel = 'overdue' | 'soon' | 'ok'

export interface VehicleExpenseMeta {
  id: string
  expenseRecordId: string
  vehicleId: string
  expenseType: string
  fuelPricePerLiter: number
  fuelLiters: number
  mileage: number
  createdAt: string
}

export type VehicleTransactionSource = 'expense' | 'periodic' | 'deadline' | 'mechanic' | 'history'

export interface VehicleTransactionItem {
  id: string
  source: VehicleTransactionSource
  date: string
  title: string
  amount: number
  expenseType?: string
  expenseRecordId: string
  fuelLiters?: number
  fuelPricePerLiter?: number
  mileage?: number
  metaRowNumber?: number
}

export interface MonthlyFuelPriceBreakdown {
  price: number
  liters: number
  amount: number
}

export interface MonthlyFuelEntry {
  date: string
  liters: number
  amount: number
  price: number
  mileage?: number
}

export interface MonthlyFuelStats {
  monthKey: string
  totalLiters: number
  totalAmount: number
  byPrice: MonthlyFuelPriceBreakdown[]
  efficiencyL100km: number | null
  entries: MonthlyFuelEntry[]
}

export interface VehicleActiveListItem {
  id: string
  vehicleId: string
  kind: 'periodic' | 'deadline'
  title: string
  subtitle: string
  detailLines?: string[]
  urgency: VehicleUrgencyLevel
  sortKey: number
  remainingKm: number | null
  remainingDays: number | null
  periodic?: VehiclePeriodicService & { rowNumber: number }
  deadline?: VehicleDeadline & { rowNumber: number }
}
