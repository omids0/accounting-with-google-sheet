export { markQuotaExceeded, queueOutboxWrite, flushOutbox } from './sheetSyncOutbox'

export {
  getKnownSheetNames,
  fullSyncFromRemote,
  refreshInBackground,
  initializeSheetSync,
  stopSheetSync,
  resetSheetSync,
  onPageEnter,
  getActiveSpreadsheetId,
  retryPendingWrites
} from './sheetSyncLifecycle'

import { queueOutboxWrite } from './sheetSyncOutbox'
import type { OutboxOperation } from './syncOutbox'

// Backwards-compatible alias used by sheets.ts
export function enqueueSheetWrite(spreadsheetId: string, operation: OutboxOperation): void {
  queueOutboxWrite(spreadsheetId, operation)
}
