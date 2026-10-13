import { logRecordActivity } from '../../services/activityLog'
import { appendRecord } from '../../services/sheets'
import { createManualVehicleExpense } from '../../services/vehicleExpenseActions'
import type { CustomForm } from '../../types'

type VehicleExpenseInput = Parameters<typeof createManualVehicleExpense>[1]

/**
 * Writes a new entry (a vehicle expense goes through its own service, which
 * returns the record id) and adds its «فعالیت_ها» line. Throws on failure.
 */
export async function writeEntryRecord(
  spreadsheetId: string,
  form: CustomForm,
  values: Record<string, string | number>,
  vehicleInput: VehicleExpenseInput | null
): Promise<string> {
  let recordId: string = crypto.randomUUID()

  if (vehicleInput) {
    recordId = await createManualVehicleExpense(spreadsheetId, vehicleInput)
  } else {
    await appendRecord(spreadsheetId, form, recordId, new Date().toLocaleString('fa-IR'), values)
  }
  logRecordActivity(spreadsheetId, 'create', recordId, values)

  return recordId
}
