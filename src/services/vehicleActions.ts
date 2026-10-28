import { updateVehicleDeadline } from './vehicleDeadlines'
import { fetchVehicleExpenseMetaByVehicle } from './vehicleExpenseRecords'
import { createVehicleExpense } from './vehicleExpenses'
import { createVehicleHistoryEntry, fetchVehicleHistory, logMileageReading } from './vehicleHistory'
import { createVehicleMechanicVisit, formatMechanicItemsSummary } from './vehicleMechanicVisits'
import { fetchVehicles, updateVehicleMileage } from './vehicleProfiles'
import type { VehicleMechanicItem, VehicleProfile } from '../types/vehicles'
import { getTodayIso } from '../utils/jalaliDate'

/** Raises the vehicle's mileage and logs the reading; `note` says what raised it. */
export async function syncVehicleMileage(
  spreadsheetId: string,
  vehicle: VehicleProfile & { rowNumber: number },
  mileage: number,
  date = getTodayIso(),
  note = ''
): Promise<void> {
  if (mileage <= vehicle.mileage) return

  await updateVehicleMileage(spreadsheetId, vehicle.rowNumber, mileage, date)
  await logMileageReading(spreadsheetId, vehicle.id, mileage, date, note)
}

/** An expense carried a reading: raises the vehicle's mileage (never lowers it) and logs it. */
export async function syncMileageFromExpense(
  spreadsheetId: string,
  vehicleId: string,
  mileage: number,
  date: string,
  expense: { recordId: string; expenseType: string }
): Promise<void> {
  if (!vehicleId || mileage <= 0) return

  const vehicles = await fetchVehicles(spreadsheetId)
  const vehicle = vehicles.find(item => item.id === vehicleId)

  if (!vehicle) return

  if (mileage >= vehicle.mileage) {
    await updateVehicleMileage(spreadsheetId, vehicle.rowNumber, mileage, date)
  }
  if (mileage > vehicle.mileage) {
    const note = `هزینه · ${expense.expenseType}`

    await logMileageReading(spreadsheetId, vehicleId, mileage, date, note, expense.recordId)
  }
}

/** A wrong reading was typed: sets the mileage to the right number, lower or not, and logs it. */
export async function correctVehicleMileage(
  spreadsheetId: string,
  vehicle: VehicleProfile & { rowNumber: number },
  mileage: number,
  date = getTodayIso()
): Promise<void> {
  await updateVehicleMileage(spreadsheetId, vehicle.rowNumber, mileage, date)
  await logMileageReading(
    spreadsheetId,
    vehicle.id,
    mileage,
    date,
    `اصلاح کارکرد (قبلاً ${vehicle.mileage.toLocaleString('fa-IR')} km)`
  )
}

/**
 * A «ثبت کارکرد» line was deleted: when it held the current mileage, the vehicle falls back
 * to the highest reading still on record. Without any other reading nothing changes.
 */
export async function rollbackMileageAfterLogDelete(
  spreadsheetId: string,
  vehicleId: string,
  deletedMileage: number
): Promise<void> {
  const vehicle = (await fetchVehicles(spreadsheetId)).find(item => item.id === vehicleId)

  if (!vehicle || vehicle.mileage !== deletedMileage) return

  const [history, metas] = await Promise.all([
    fetchVehicleHistory(spreadsheetId, vehicleId),
    fetchVehicleExpenseMetaByVehicle(spreadsheetId, vehicleId)
  ])
  const remaining = [...history, ...metas].map(item => item.mileage).filter(value => value > 0)
  const best = remaining.length ? Math.max(...remaining) : 0

  if (best > 0 && best < vehicle.mileage) {
    await updateVehicleMileage(spreadsheetId, vehicle.rowNumber, best)
  }
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
    await syncVehicleMileage(spreadsheetId, vehicle, mileage, date, 'مراجعه به مکانیک')
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
