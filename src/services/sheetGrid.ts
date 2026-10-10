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

  const targetColumns = Math.max(minWidth, lastDataColumn, 1)

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
