import { CHECK_ATTACHMENT_COLUMN } from './attachmentColumn'
import {
  CHECK_DIRECTION_COLUMN,
  CHECK_DIRECTION_LABELS,
  headerDirectionColumn,
  parseCheckDirection
} from './checkDirection'
import { checkToRow, parsePaid } from './checkRows'
import { validateChecksCsvCells } from './checksCsvValidate'
import { importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import { parseImportCsv } from './importPlan'
import {
  checkDirectionColumnForWrite,
  predictCheckDirectionColumn
} from './migrateCheckDirectionColumn'
import { CHECKS_HEADERS } from './sheetHeaders'
import { CHECKS_SHEET } from './sheetNames'
import { ensureSheetWithHeaders, fetchSheetRows } from './sheets'
import { getSheetRow } from './spreadsheetStore'
import {
  parseAttachmentIds,
  serializeAttachmentIds,
  withAttachmentCell
} from '../utils/attachmentIds'
import { downloadTextFile, rowsToCsv } from '../utils/csv'

/** The file always has the app's column layout, whichever column the tab keeps the type in. */
export async function exportChecksCsv(spreadsheetId: string): Promise<string | null> {
  const rows = await fetchSheetRows(spreadsheetId, CHECKS_SHEET)
  const column = headerDirectionColumn(getSheetRow(spreadsheetId, CHECKS_SHEET, 1))

  const lines = rows.map(row =>
    CHECKS_HEADERS.map((_, index) =>
      index === CHECK_DIRECTION_COLUMN
        ? CHECK_DIRECTION_LABELS[parseCheckDirection(column >= 0 ? row[column] : undefined)]
        : row[index] ?? ''
    )
  )

  return downloadTextFile('چک‌ها.csv', rowsToCsv(CHECKS_HEADERS, lines))
}

/** Whether the file has a received check, however its type cell is spelled. */
function hasReceivedRow(csvContent: string): boolean {
  try {
    return parseImportCsv(csvContent, CHECKS_HEADERS).dataRows.some(
      cells => parseCheckDirection(cells[CHECK_DIRECTION_COLUMN]) === 'received'
    )
  } catch {
    return false // an empty or broken file: importSheetCsv reports it
  }
}

export async function importChecksCsv(spreadsheetId: string, csvContent: string) {
  await ensureSheetWithHeaders(spreadsheetId, CHECKS_SHEET, CHECKS_HEADERS)
  await fetchSheetRows(spreadsheetId, CHECKS_SHEET)

  // Nothing is written before `apply`. A tab without the type column gets rows laid out for the
  // column it WILL get, but only when the file has a received check; a payable needs none.
  const needsType = hasReceivedRow(csvContent)
  const known = headerDirectionColumn(getSheetRow(spreadsheetId, CHECKS_SHEET, 1))
  const column = known >= 0 ? known : needsType ? predictCheckDirectionColumn(spreadsheetId) : -1

  const preview = await importSheetCsv(
    spreadsheetId,
    CHECKS_SHEET,
    CHECKS_HEADERS,
    csvContent,
    cells => {
      const checkNumber = (cells[2] ?? '').trim()

      const { counterparty, amount, creationDate, dueDate } = validateChecksCsvCells(cells)

      const row = checkToRow(
        {
          id: newImportId(cells[0] ?? ''),
          createdAt: newImportTimestamp(cells[1] ?? ''),
          checkNumber,
          direction: parseCheckDirection(cells[CHECK_DIRECTION_COLUMN]),
          counterparty,
          amount,
          creationDate,
          dueDate,
          paid: parsePaid(cells[7] ?? ''),
          paidAt: cells[8] ?? '',
          // The record the file's check was paid with belongs to the workbook it came from.
          transactionRecordId: '',
          subCategory: cells[10] ?? ''
        },
        column
      )

      return withAttachmentCell(
        row,
        CHECK_ATTACHMENT_COLUMN,
        serializeAttachmentIds(parseAttachmentIds(cells[CHECK_ATTACHMENT_COLUMN]))
      )
    }
  )

  if (!needsType) return preview

  // The column is made here, when the user confirms, and must be the one the rows were laid out for.
  return {
    ...preview,
    apply: async () => {
      const made = await checkDirectionColumnForWrite(spreadsheetId, 'received')

      if (made !== column) throw new Error('ستون «نوع چک» عوض شد؛ فایل را دوباره انتخاب کنید.')

      return preview.apply()
    }
  }
}
