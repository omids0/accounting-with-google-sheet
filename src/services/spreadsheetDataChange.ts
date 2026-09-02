import { invalidateDashboardCache } from './dashboard'
import { bumpDataRevision } from './dataRevision'

export function notifySpreadsheetDataChanged(spreadsheetId: string): void {
  invalidateDashboardCache(spreadsheetId)
  bumpDataRevision()
}
