import { CHECK_ATTACHMENT_COLUMN } from './attachmentColumn'
import {
  CHECK_DIRECTION_COLUMN,
  CHECK_DIRECTION_LABELS,
  headerDirectionColumn,
  parseCheckDirection
} from './checkDirection'
import { checkToRow, parsePaid } from './checkRows'
import { importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import { checkDirectionColumnForWrite } from './migrateCheckDirectionColumn'
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
import { parseNumeric } from '../utils/parseNumeric'

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

export async function importChecksCsv(spreadsheetId: string, csvContent: string) {
  await ensureSheetWithHeaders(spreadsheetId, CHECKS_SHEET, CHECKS_HEADERS)

  // The tab gets its «نوع چک» column only when the file brings a received check.
  const column = /دریافت|received/i.test(csvContent)
    ? await checkDirectionColumnForWrite(spreadsheetId, 'received')
    : headerDirectionColumn(getSheetRow(spreadsheetId, CHECKS_SHEET, 1))

  return importSheetCsv(spreadsheetId, CHECKS_SHEET, CHECKS_HEADERS, csvContent, cells => {
    const checkNumber = (cells[2] ?? '').trim()

    const counterparty = (cells[3] ?? '').trim()

    if (!checkNumber && !counterparty) return null

    const row = checkToRow(
      {
        id: newImportId(cells[0] ?? ''),
        createdAt: newImportTimestamp(cells[1] ?? ''),
        checkNumber,
        direction: parseCheckDirection(cells[CHECK_DIRECTION_COLUMN]),
        counterparty,
        amount: parseNumeric(cells[4]),
        creationDate: cells[5] ?? '',
        dueDate: cells[6] ?? '',
        paid: parsePaid(cells[7] ?? ''),
        paidAt: cells[8] ?? '',
        transactionRecordId: cells[9] ?? '',
        subCategory: cells[10] ?? ''
      },
      column
    )

    return withAttachmentCell(
      row,
      CHECK_ATTACHMENT_COLUMN,
      serializeAttachmentIds(parseAttachmentIds(cells[CHECK_ATTACHMENT_COLUMN]))
    )
  })
}
