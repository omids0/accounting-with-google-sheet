import { fetchVehicleDeadlines } from './vehicleDeadlines'
import { fetchVehicleExpenseMetaByVehicle } from './vehicleExpenseRecords'
import { fetchVehicleHistory } from './vehicleHistory'
import { fetchVehicleMechanicVisits } from './vehicleMechanicVisits'
import { fetchVehiclePeriodicServices } from './vehiclePeriodicServices'

/** What hangs off a vehicle in the other tabs; deleting the vehicle row leaves all of it behind. */
export interface VehicleLinkedCounts {
  services: number
  deadlines: number
  /** History lines, fuel/expense details and mechanic visits. */
  records: number
}

export async function countVehicleLinkedRows(
  spreadsheetId: string,
  vehicleId: string
): Promise<VehicleLinkedCounts> {
  const [services, deadlines, history, metas, visits] = await Promise.all([
    fetchVehiclePeriodicServices(spreadsheetId, vehicleId),
    fetchVehicleDeadlines(spreadsheetId, vehicleId),
    fetchVehicleHistory(spreadsheetId, vehicleId),
    fetchVehicleExpenseMetaByVehicle(spreadsheetId, vehicleId),
    fetchVehicleMechanicVisits(spreadsheetId, vehicleId)
  ])

  return {
    services: services.length,
    deadlines: deadlines.length,
    records: history.length + metas.length + visits.length
  }
}
