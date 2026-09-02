import { recordOperation, ACTIVITY_SHEET } from './activityTracking'
import { apiRequest, SHEETS_API } from './sheetsApi'
import { getSheetId } from './sheetsEnsure'
import type { OutboxOperation, OutboxWriteOptions } from './syncOutbox'

export type SheetWriteOptions = OutboxWriteOptions

function shouldRecordActivity(sheetName: string, options?: SheetWriteOptions): boolean {
  return !options?.skipActivity && sheetName !== ACTIVITY_SHEET
}

export async function appendSheetRowApi(
  spreadsheetId: string,
  sheetName: string,
  row: string[],
  options?: SheetWriteOptions
): Promise<void> {
  const range = encodeURIComponent(`${sheetName}!A:Z`)

  await apiRequest(
    `${SHEETS_API}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      body: JSON.stringify({ values: [row] })
    }
  )
  if (shouldRecordActivity(sheetName, options)) {
    recordOperation()
  }
}

export async function updateSheetRowApi(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  row: string[],
  options?: SheetWriteOptions
): Promise<void> {
  const endCol = String.fromCharCode(64 + Math.max(row.length, 1))

  const range = encodeURIComponent(`${sheetName}!A${rowNumber}:${endCol}${rowNumber}`)

  await apiRequest(`${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    body: JSON.stringify({ values: [row] })
  })
  if (shouldRecordActivity(sheetName, options)) {
    recordOperation()
  }
}

export async function deleteSheetRowApi(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number
): Promise<void> {
  const sheetId = await getSheetId(spreadsheetId, sheetName)

  const startIndex = rowNumber - 1

  await apiRequest(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex,
              endIndex: startIndex + 1
            }
          }
        }
      ]
    })
  })
}

async function replaceSheetDataRowsApi(
  spreadsheetId: string,
  sheetName: string,
  rows: string[][],
  columnCount: number
): Promise<void> {
  const endCol = String.fromCharCode(64 + Math.max(columnCount, 1))

  const clearRange = encodeURIComponent(`${sheetName}!A2:${endCol}1000`)

  await apiRequest(`${SHEETS_API}/${spreadsheetId}/values/${clearRange}:clear`, { method: 'POST' })

  if (!rows.length) return

  const writeRange = encodeURIComponent(`${sheetName}!A2:${endCol}${rows.length + 1}`)

  await apiRequest(`${SHEETS_API}/${spreadsheetId}/values/${writeRange}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: rows })
  })
}

export async function executeOutboxOperation(
  spreadsheetId: string,
  operation: OutboxOperation
): Promise<void> {
  switch (operation.type) {
    case 'append':
      await appendSheetRowApi(
        spreadsheetId,
        operation.sheetName,
        operation.row,
        operation.writeOptions
      )

      return

    case 'update':
      await updateSheetRowApi(
        spreadsheetId,
        operation.sheetName,
        operation.rowNumber,
        operation.row,
        operation.writeOptions
      )

      return

    case 'delete':
      await deleteSheetRowApi(spreadsheetId, operation.sheetName, operation.rowNumber)

      return

    case 'replace':
      await replaceSheetDataRowsApi(
        spreadsheetId,
        operation.sheetName,
        operation.rows,
        operation.columnCount
      )

      return

    default:
      throw new Error('عملیات ناشناخته در صف همگام‌سازی')
  }
}
