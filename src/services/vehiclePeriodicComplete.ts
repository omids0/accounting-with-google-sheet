import { syncVehicleMileage } from './vehicleActions'
import { createNextCycleVehicleExpense } from './vehicleExpenses'
import { createVehicleHistoryEntry } from './vehicleHistory'
import { serviceCycleExpenseIds } from './vehiclePeriodicLink'
import { updateVehiclePeriodicService } from './vehiclePeriodicServices'
import { calculateNextKm } from '../components/vehicles/utils'
import type { VehicleProfile } from '../types/vehicles'

/**
 * «ثبت انجام سرویس»: closes one service cycle. Every cycle is its own expense and its own history
 * line; the service row keeps pointing at the LATEST cycle's expense (one id is all the sheet
 * holds), and the earlier cycles stay reachable through their history lines. `previousExpenseId`
 * is only read (with the history lines' expenses, when it was deleted), to pay the new cycle from the
 * same account as the last one.
 */
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
  // The row's link may point at a deleted expense: the newest cycle that still has one stands in.
  const earlierExpenseIds = await serviceCycleExpenseIds(
    spreadsheetId,
    vehicle.id,
    serviceId,
    previousExpenseId
  )
  // A new expense on the chosen date; the previous cycle's expense is left as it is.
  const expenseRecordId = await createNextCycleVehicleExpense(spreadsheetId, earlierExpenseIds, {
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
