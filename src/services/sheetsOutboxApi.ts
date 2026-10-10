import { recordOperation, ACTIVITY_SHEET } from './activityTracking'
import { apiRequest, SHEETS_API } from './sheetsApi'
import { columnLetter, toSheetRowValues } from './sheetsCellValues'
import { getSheetId } from './sheetsEnsure'
import { quoteSheetName } from './sheetsMeta'
import {
  appendAlreadyApplied,
  createRowGuardSession,
  resolveTargetRow,
  RowConflictError,
  trackAppend,
  trackDelete,
  trackReplace,
  trackUpdate
} from './sheetsRowGuard'
import type { RowGuardSession } from './sheetsRowGuard'
import type { OutboxOperation, OutboxWriteOptions } from './syncOutbox'

export type SheetWriteOptions = OutboxWriteOptions

/**
 * RAW keeps text exactly as typed: "=…" never turns into a formula, "0912…"
 * keeps its zero and 16-digit check numbers are not rounded. Plain numbers are
 * still sent as numbers (see toSheetCellValue).
 */
const VALUE_INPUT = 'valueInputOption=RAW'

function shouldRecordActivity(sheetName: string, options?: SheetWriteOptions): boolean {
  return !options?.skipActivity && sheetName !== ACTIVITY_SHEET
}

export async function appendSheetRowApi(
  spreadsheetId: string,
  sheetName: string,
  row: string[],
  options?: SheetWriteOptions
): Promise<void> {
  const range = encodeURIComponent(quoteSheetName(sheetName))

  await apiRequest(
    `${SHEETS_API}/${spreadsheetId}/values/${range}:append?${VALUE_INPUT}&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      body: JSON.stringify({ values: [toSheetRowValues(row)] })
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
  const endCol = columnLetter(Math.max(row.length, 1))

  const range = encodeURIComponent(
    `${quoteSheetName(sheetName)}!A${rowNumber}:${endCol}${rowNumber}`
  )

  await apiRequest(`${SHEETS_API}/${spreadsheetId}/values/${range}?${VALUE_INPUT}`, {
    method: 'PUT',
    body: JSON.stringify({ values: [toSheetRowValues(row)] })
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

/**
 * Writes the new rows first and only then clears what is left below them, so a
 * failure half-way leaves stale extra rows instead of an empty sheet.
 */
async function replaceSheetDataRowsApi(
  spreadsheetId: string,
  sheetName: string,
  rows: string[][],
  columnCount: number
): Promise<void> {
  const width = Math.max(columnCount, ...rows.map(row => row.length), 1)
  const endCol = columnLetter(width)

  if (rows.length) {
    const writeRange = encodeURIComponent(
      `${quoteSheetName(sheetName)}!A2:${endCol}${rows.length + 1}`
    )

    await apiRequest(`${SHEETS_API}/${spreadsheetId}/values/${writeRange}?${VALUE_INPUT}`, {
      method: 'PUT',
      body: JSON.stringify({ values: rows.map(toSheetRowValues) })
    })
  }

  const clearRange = encodeURIComponent(
    `${quoteSheetName(sheetName)}!A${rows.length + 2}:${endCol}`
  )

  await apiRequest(`${SHEETS_API}/${spreadsheetId}/values/${clearRange}:clear`, { method: 'POST' })
}

export interface OutboxExecutionContext {
  session?: RowGuardSession
  /** True when this entry already failed once, so an append may have landed. */
  isRetry?: boolean
}

export async function executeOutboxOperation(
  spreadsheetId: string,
  operation: OutboxOperation,
  context: OutboxExecutionContext = {}
): Promise<void> {
  const session = context.session ?? createRowGuardSession()

  switch (operation.type) {
    case 'append': {
      const { sheetName, row } = operation

      if (context.isRetry && (await appendAlreadyApplied(session, spreadsheetId, sheetName, row))) {
        return
      }
      await appendSheetRowApi(spreadsheetId, sheetName, row, operation.writeOptions)
      trackAppend(session, sheetName, row)

      return
    }

    case 'update': {
      const { sheetName, row } = operation
      const target = await resolveTargetRow(
        session,
        spreadsheetId,
        sheetName,
        operation.rowNumber,
        operation.expectedRow
      )

      await updateSheetRowApi(spreadsheetId, sheetName, target, row, operation.writeOptions)
      trackUpdate(session, sheetName, target, row)

      return
    }

    case 'delete': {
      const { sheetName } = operation
      const target = await resolveTargetRow(
        session,
        spreadsheetId,
        sheetName,
        operation.rowNumber,
        operation.expectedRow
      ).catch(err => {
        // The row is already gone (deleted on another device): nothing left to do.
        if (err instanceof RowConflictError) return null
        throw err
      })

      if (target === null) return

      await deleteSheetRowApi(spreadsheetId, sheetName, target)
      trackDelete(session, sheetName, target)

      return
    }

    case 'replace':
      await replaceSheetDataRowsApi(
        spreadsheetId,
        operation.sheetName,
        operation.rows,
        operation.columnCount
      )
      trackReplace(session, operation.sheetName, operation.rows)

      return

    default:
      throw new Error('عملیات ناشناخته در صف همگام‌سازی')
  }
}
