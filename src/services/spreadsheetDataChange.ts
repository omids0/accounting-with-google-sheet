import { invalidateDashboardCache } from './dashboardCache'
import { bumpDataRevision } from './dataRevision'

export function notifySpreadsheetDataChanged(spreadsheetId: string): void {
  invalidateDashboardCache(spreadsheetId)
  bumpDataRevision()
}
