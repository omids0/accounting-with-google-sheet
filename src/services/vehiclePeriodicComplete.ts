import { syncVehicleMileage } from './vehicleActions'
import { replaceVehicleExpense } from './vehicleExpenses'
import {
  createVehicleHistoryEntry,
  fetchVehicleHistory,
  updateVehicleHistoryEntry
} from './vehicleHistory'
import { updateVehiclePeriodicService } from './vehiclePeriodicServices'
import { calculateNextKm } from '../components/vehicles/utils'
import type { VehicleProfile } from '../types/vehicles'

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

  // This service's latest line for the expense being redone (history is newest first).
  const earlier = previousExpenseId
    ? (await fetchVehicleHistory(spreadsheetId, vehicle.id)).find(
        item => item.referenceId === serviceId && item.expenseRecordId === previousExpenseId
      )
    : undefined

  if (!isHistorical && mileage > vehicle.mileage) {
    await syncVehicleMileage(
      spreadsheetId,
      vehicle,
      mileage,
      date,
      `سرویس دوره‌ای · ${serviceType}`
    )
  }

  const nextKm = calculateNextKm(mileage, intervalKm)
  // The earlier expense of this service is edited into the new one (one balance change, not a
  // refund plus a new debit) and takes the chosen date. Each cycle still REPLACES the previous
  // cycle's expense by existing design; an owner decision on that is pending.
  const expenseRecordId = await replaceVehicleExpense(spreadsheetId, previousExpenseId ?? '', {
    title: `${serviceType} — ${vehicle.title}`,
    amount,
    subCategory: serviceType,
    date,
    note: [brand, location, notes].filter(Boolean).join(' · ')
  })

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

  const line = {
    vehicleId: vehicle.id,
    recordKind: 'periodic' as const,
    referenceId: serviceId,
    date,
    mileage,
    nextKm,
    details: [serviceType, brand, location, notes].filter(Boolean).join(' · '),
    amount,
    expenseRecordId
  }

  // The same service redone with the same day, km and amount is the same event: its line is
  // refreshed (brand, notes, next km), not repeated. A change of day, km or amount adds a line.
  const same =
    earlier &&
    earlier.expenseRecordId === expenseRecordId &&
    earlier.date === date &&
    earlier.mileage === mileage &&
    earlier.amount === amount

  if (same) await updateVehicleHistoryEntry(spreadsheetId, earlier.rowNumber, line)
  else await createVehicleHistoryEntry(spreadsheetId, line)
}
