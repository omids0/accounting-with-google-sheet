import { apiRequest, SHEETS_API, SheetsApiError } from './sheetsApi'
import { normalizeSheetTitle } from './sheetsMeta'

/**
 * Empty rows kept under the data when trimming. deleteDimension uses absolute
 * indices, so an append from another device racing the trim lands inside this
 * margin instead of being deleted.
 */
export const ROW_BUFFER = 50

export interface GridInfo {
  sheetId: number
  title: string
  rowCount: number
  columnCount: number
  frozenRowCount: number
  frozenColumnCount: number
}

export interface GridTrimInput {
  grid: GridInfo
  /** Columns the schema needs, kept even while empty. */
  minWidth: number
  /** 1-based last row holding any value; 0 when the tab is empty. */
  lastDataRow: number
  /** 1-based last column holding any value; 0 when the tab is empty. */
  lastDataColumn: number
}

type Dimension = 'ROWS' | 'COLUMNS'

export type DeleteDimensionRequest = {
  deleteDimension: {
    range: { sheetId: number; dimension: Dimension; startIndex: number; endIndex: number }
  }
}

function deleteRange(
  sheetId: number,
  dimension: Dimension,
  startIndex: number,
  endIndex: number
): DeleteDimensionRequest {
  return { deleteDimension: { range: { sheetId, dimension, startIndex, endIndex } } }
}

/** deleteDimension requests that shrink the grid to its data; never touches a cell with a value. */
export function planGridTrim({
  grid,
  minWidth,
  lastDataRow,
  lastDataColumn
}: GridTrimInput): DeleteDimensionRequest[] {
  const requests: DeleteDimensionRequest[] = []

  // Sheets also refuses a grid whose only columns are frozen.
  const targetColumns = Math.max(minWidth, lastDataColumn, grid.frozenColumnCount + 1)

  if (grid.columnCount > targetColumns) {
    requests.push(deleteRange(grid.sheetId, 'COLUMNS', targetColumns, grid.columnCount))
  }

  // Sheets refuses a grid whose only rows are frozen.
  const targetRows = Math.max(lastDataRow + ROW_BUFFER, grid.frozenRowCount + 1)

  if (grid.rowCount > lastDataRow + ROW_BUFFER * 2 && grid.rowCount > targetRows) {
    requests.push(deleteRange(grid.sheetId, 'ROWS', targetRows, grid.rowCount))
  }

  return requests
}

interface GridMetadataResponse {
  sheets?: {
    properties?: {
      sheetId?: number
      title?: string
      gridProperties?: {
        rowCount?: number
        columnCount?: number
        frozenRowCount?: number
        frozenColumnCount?: number
      }
    }
  }[]
}

/** Grid size of every tab in one metadata request, keyed by normalized title. */
export async function fetchGridInfo(spreadsheetId: string): Promise<Map<string, GridInfo>> {
  const fields = encodeURIComponent(
    'sheets.properties(sheetId,title,gridProperties(rowCount,columnCount,frozenRowCount,frozenColumnCount))'
  )

  const data = await apiRequest<GridMetadataResponse>(
    `${SHEETS_API}/${spreadsheetId}?fields=${fields}`
  )

  const grids = new Map<string, GridInfo>()

  for (const sheet of data.sheets ?? []) {
    const props = sheet.properties

    if (!props?.title || props.sheetId === undefined) continue

    grids.set(normalizeSheetTitle(props.title), {
      sheetId: props.sheetId,
      title: props.title,
      rowCount: props.gridProperties?.rowCount ?? 0,
      columnCount: props.gridProperties?.columnCount ?? 0,
      frozenRowCount: props.gridProperties?.frozenRowCount ?? 0,
      frozenColumnCount: props.gridProperties?.frozenColumnCount ?? 0
    })
  }

  return grids
}

export function isGridLimitError(err: unknown): boolean {
  return (
    err instanceof SheetsApiError && err.status === 400 && /exceeds grid limits/i.test(err.message)
  )
}

async function growGrid(
  spreadsheetId: string,
  sheetName: string,
  minRows: number,
  minColumns: number
): Promise<void> {
  const grid = (await fetchGridInfo(spreadsheetId)).get(normalizeSheetTitle(sheetName))

  if (!grid) return

  const grow = (dimension: Dimension, length: number) => ({
    appendDimension: { sheetId: grid.sheetId, dimension, length }
  })

  const requests = [
    ...(grid.rowCount < minRows ? [grow('ROWS', minRows - grid.rowCount)] : []),
    ...(grid.columnCount < minColumns ? [grow('COLUMNS', minColumns - grid.columnCount)] : [])
  ]

  if (!requests.length) return

  await apiRequest(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests })
  })
}

/**
 * values.update fails past the grid edge (only append grows it). Trimmed grids
 * make that reachable, so a write that hits the edge grows the grid and retries
 * once. A write that fits costs nothing extra.
 */
export async function withGridGrowth<T>(
  spreadsheetId: string,
  sheetName: string,
  minRows: number,
  minColumns: number,
  write: () => Promise<T>
): Promise<T> {
  try {
    return await write()
  } catch (err) {
    if (!isGridLimitError(err)) throw err
    await growGrid(spreadsheetId, sheetName, minRows, minColumns)

    return write()
  }
}
