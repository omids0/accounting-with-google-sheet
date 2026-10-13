import { invalidateDashboardCache } from './dashboardCache'
import { bumpDataRevision } from './dataRevision'
import { pushWidgetSnapshot } from './widgetNative'

export function notifySpreadsheetDataChanged(spreadsheetId: string): void {
  invalidateDashboardCache(spreadsheetId)
  bumpDataRevision()
  // Same moment the dashboard goes stale: the home-screen widget follows it.
  pushWidgetSnapshot(spreadsheetId)
}
