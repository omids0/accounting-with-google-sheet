export { isSpreadsheetNotFoundError, isQuotaExceededError } from './sheetsApi'

export { invalidateSpreadsheetCache, markSheetsPrepared } from './sheetsMeta'

export {
  type SheetSpec,
  verifySpreadsheetExists,
  ensureSpreadsheet,
  ensureManySheetsWithHeaders,
  ensureSheetWithHeaders
} from './sheetsEnsure'

export { createSpreadsheet, addSheetTab, ensureFormSheet, getSpreadsheetUrl } from './sheetsCreate'

export {
  type SheetWriteOptions,
  type SheetRecord,
  appendRecord,
  fetchRecords,
  updateRecord,
  deleteRecord
} from './sheetsRecords'

export {
  fetchSheetRangeFromApi,
  batchFetchSheetRangesFromApi,
  fetchSheetRows,
  appendSheetRow,
  updateSheetRow,
  deleteSheetRow,
  replaceSheetDataRows
} from './sheetsRows'

export { executeOutboxOperation } from './sheetsOutboxApi'
