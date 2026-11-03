import { getSettings } from './settings'
import { fetchRecords } from './sheets'
import { fetchVehicleHistory } from './vehicleHistory'
import {
  fetchVehiclePeriodicServices,
  updateVehiclePeriodicService
} from './vehiclePeriodicServices'

/** Ids of the expense records that exist now (null while the expense form is not loaded). */
async function existingExpenseIds(spreadsheetId: string): Promise<Set<string> | null> {
  const form = getSettings()?.forms.find(item => item.type === 'expense')

  if (!form) return null

  return new Set((await fetchRecords(spreadsheetId, form)).map(record => record.id))
}

/**
 * Expense ids of a service's cycles, newest first, that still exist: the one its row points at
 * (if any), then those of its history lines. A deleted record is skipped, so «the last cycle's
 * expense» is always one that can be read.
 */
export async function serviceCycleExpenseIds(
  spreadsheetId: string,
  vehicleId: string,
  serviceId: string,
  linkedExpenseId = '',
  excludeId = ''
): Promise<string[]> {
  const [history, existing] = await Promise.all([
    fetchVehicleHistory(spreadsheetId, vehicleId),
    existingExpenseIds(spreadsheetId)
  ])
  const ids = [
    linkedExpenseId,
    ...history
      .filter(line => line.referenceId === serviceId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.rowNumber - a.rowNumber)
      .map(line => line.expenseRecordId)
  ]

  return ids.filter(id => id && id !== excludeId && (!existing || existing.has(id)))
}

/**
 * The service row holds ONE expense id: the latest cycle's. When that expense is deleted (from the
 * car's history tab or from the records page) the row is pointed at the newest cycle that still
 * has an expense, or cleared when none is left. Rows that point elsewhere are not touched.
 * Call it before or after the record is gone: `deletedExpenseId` is skipped either way.
 */
export async function repointServicesAfterExpenseDelete(
  spreadsheetId: string,
  deletedExpenseId: string
): Promise<void> {
  if (!deletedExpenseId) return

  const services = await fetchVehiclePeriodicServices(spreadsheetId)

  for (const service of services.filter(item => item.expenseRecordId === deletedExpenseId)) {
    const [previous] = await serviceCycleExpenseIds(
      spreadsheetId,
      service.vehicleId,
      service.id,
      '',
      deletedExpenseId
    )

    if (!previous) {
      await updateVehiclePeriodicService(spreadsheetId, service.rowNumber, { expenseRecordId: '' })
      continue
    }

    const line = (await fetchVehicleHistory(spreadsheetId, service.vehicleId)).find(
      item => item.referenceId === service.id && item.expenseRecordId === previous
    )

    await updateVehiclePeriodicService(spreadsheetId, service.rowNumber, {
      expenseRecordId: previous,
      ...(line ? { amount: line.amount } : {})
    })
  }
}
