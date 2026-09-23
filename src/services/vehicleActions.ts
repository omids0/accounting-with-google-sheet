import { updateVehicleDeadline } from './vehicleDeadlines'
import { createVehicleExpense, deleteVehicleExpense } from './vehicleExpenses'
import { createVehicleHistoryEntry } from './vehicleHistory'
import { createVehicleMechanicVisit, formatMechanicItemsSummary } from './vehicleMechanicVisits'
import { updateVehiclePeriodicService } from './vehiclePeriodicServices'
import { updateVehicleMileage } from './vehicleProfiles'
import { calculateNextKm } from '../components/vehicles/utils'
import type { VehicleMechanicItem, VehicleProfile } from '../types/vehicles'
import { getTodayIso } from '../utils/jalaliDate'

export async function syncVehicleMileage(
  spreadsheetId: string,
  vehicle: VehicleProfile & { rowNumber: number },
  mileage: number,
  date = getTodayIso()
): Promise<void> {
  if (mileage <= vehicle.mileage) return

  await updateVehicleMileage(spreadsheetId, vehicle.rowNumber, mileage, date)
}

export async function completePeriodicService(params: {
  spreadsheetId: string
  vehicle: VehicleProfile & { rowNumber: number }
  rowNumber: number
  serviceType: string
  serviceId: string
  mileage: number
  intervalKm: number
  brand: string
  location: string
  amount: number
  notes: string
  date: string
  previousExpenseId?: string
  isHistorical?: boolean
}): Promise<void> {
  const {
    spreadsheetId,
    vehicle,
    rowNumber,
    serviceType,
    serviceId,
    mileage,
    intervalKm,
    brand,
    location,
    amount,
    notes,
    date,
    previousExpenseId,
    isHistorical = false
  } = params

  if (previousExpenseId) {
    await deleteVehicleExpense(spreadsheetId, previousExpenseId)
  }

  if (!isHistorical && mileage > vehicle.mileage) {
    await syncVehicleMileage(spreadsheetId, vehicle, mileage, date)
  }

  const nextKm = calculateNextKm(mileage, intervalKm)
  const expenseRecordId =
    amount > 0
      ? await createVehicleExpense(spreadsheetId, {
          title: `${serviceType} — ${vehicle.title}`,
          amount,
          subCategory: serviceType,
          date,
          note: [brand, location, notes].filter(Boolean).join(' · ')
        })
      : ''

  await updateVehiclePeriodicService(spreadsheetId, rowNumber, {
    currentMileage: mileage,
    intervalKm,
    nextKm,
    brand,
    location,
    amount,
    notes,
    expenseRecordId
  })

  await createVehicleHistoryEntry(spreadsheetId, {
    vehicleId: vehicle.id,
    recordKind: 'periodic',
    referenceId: serviceId,
    date,
    mileage,
    nextKm,
    details: [serviceType, brand, location, notes].filter(Boolean).join(' · '),
    amount,
    expenseRecordId
  })
}

export async function renewVehicleDeadline(params: {
  spreadsheetId: string
  vehicle: VehicleProfile & { rowNumber: number }
  rowNumber: number
  deadlineId: string
  category: string
  startDate: string
  endDate: string
  amount: number
  notes: string
  date: string
  reminderEnabled: boolean
  daysBefore: number
}): Promise<void> {
  const {
    spreadsheetId,
    vehicle,
    rowNumber,
    deadlineId,
    category,
    startDate,
    endDate,
    amount,
    notes,
    date,
    reminderEnabled,
    daysBefore
  } = params

  await updateVehicleDeadline(spreadsheetId, rowNumber, {
    startDate,
    endDate,
    amount,
    notes,
    reminderEnabled,
    daysBefore,
    expenseRecordId: ''
  })

  await createVehicleHistoryEntry(spreadsheetId, {
    vehicleId: vehicle.id,
    recordKind: 'deadline',
    referenceId: deadlineId,
    date,
    mileage: vehicle.mileage,
    nextKm: 0,
    details: `${category} · پایان: ${endDate}${notes ? ` · ${notes}` : ''}`,
    amount,
    expenseRecordId: ''
  })
}

export async function saveMechanicVisit(params: {
  spreadsheetId: string
  vehicle: VehicleProfile & { rowNumber: number }
  date: string
  mileage: number
  location: string
  totalAmount: number
  items: VehicleMechanicItem[]
  notes: string
  isHistorical?: boolean
}): Promise<void> {
  const {
    spreadsheetId,
    vehicle,
    date,
    mileage,
    location,
    totalAmount,
    items,
    notes,
    isHistorical = false
  } = params

  if (mileage > 0 && !isHistorical) {
    await syncVehicleMileage(spreadsheetId, vehicle, mileage, date)
  }

  const summary = formatMechanicItemsSummary(items)
  const expenseRecordId =
    totalAmount > 0
      ? await createVehicleExpense(spreadsheetId, {
          title: `مکانیک — ${vehicle.title}`,
          amount: totalAmount,
          subCategory: 'مکانیک',
          date,
          note: [summary, location, notes].filter(Boolean).join(' · ')
        })
      : ''

  const visit = await createVehicleMechanicVisit(spreadsheetId, {
    vehicleId: vehicle.id,
    date,
    mileage,
    location,
    totalAmount,
    items,
    notes,
    expenseRecordId
  })

  await createVehicleHistoryEntry(spreadsheetId, {
    vehicleId: vehicle.id,
    recordKind: 'mechanic',
    referenceId: visit.id,
    date,
    mileage,
    nextKm: 0,
    details: [summary, location, notes].filter(Boolean).join(' · '),
    amount: totalAmount,
    expenseRecordId
  })
}
