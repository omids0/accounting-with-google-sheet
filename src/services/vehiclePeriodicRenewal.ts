import { createVehicleHistoryEntry } from './vehicleHistory'
import {
  fetchVehiclePeriodicServices,
  updateVehiclePeriodicService
} from './vehiclePeriodicServices'
import { calculateNextKm } from '../components/vehicles/utils'

/**
 * An expense entered by hand is also the renewal of one of the vehicle's periodic services.
 * The service takes this expense (no second record is made), its next due km moves on from
 * `mileage`, and the history gets its line. The expense id on both lets the transaction list
 * show the expense once.
 */
export async function renewPeriodicFromExpense(
  spreadsheetId: string,
  params: {
    vehicleId: string
    serviceId: string
    expenseRecordId: string
    amount: number
    mileage: number
    date: string
  }
): Promise<void> {
  const { vehicleId, serviceId, expenseRecordId, amount, mileage, date } = params
  const services = await fetchVehiclePeriodicServices(spreadsheetId, vehicleId)
  const service = services.find(item => item.id === serviceId)

  if (!service || mileage <= 0) return

  const nextKm = calculateNextKm(mileage, service.intervalKm)

  await updateVehiclePeriodicService(spreadsheetId, service.rowNumber, {
    currentMileage: mileage,
    nextKm,
    amount,
    expenseRecordId
  })
  await createVehicleHistoryEntry(spreadsheetId, {
    vehicleId,
    recordKind: 'periodic',
    referenceId: service.id,
    date,
    mileage,
    nextKm,
    details: [service.serviceType, service.brand, service.location, service.notes]
      .filter(Boolean)
      .join(' · '),
    amount,
    expenseRecordId
  })
}
