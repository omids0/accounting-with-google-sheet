import { bumpDataRevision } from './dataRevision';
import { invalidateDashboardCache } from './dashboard';

export function notifySpreadsheetDataChanged(spreadsheetId: string): void {
  invalidateDashboardCache(spreadsheetId);
  bumpDataRevision();
}
