export type TableSortDirection = 'asc' | 'desc'

export interface TableSort {
  columnId: string
  direction: TableSortDirection
}

export type TableSortValue = string | number | null | undefined

function isEmptyValue(value: TableSortValue): boolean {
  return value === null || value === undefined || value === '' || Number.isNaN(value)
}

/** Numbers numerically, text in Persian collation with digit runs compared as numbers. */
export function compareTableValues(a: TableSortValue, b: TableSortValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b

  return String(a).localeCompare(String(b), 'fa', { numeric: true })
}

/** Stable sort; empty values always go last, whatever the direction. */
export function sortTableRows<T>(
  rows: readonly T[],
  getValue: (row: T) => TableSortValue,
  direction: TableSortDirection
): T[] {
  return rows
    .map((row, index) => ({ row, index, value: getValue(row) }))
    .sort((x, y) => {
      const emptyX = isEmptyValue(x.value)
      const emptyY = isEmptyValue(y.value)

      if (emptyX || emptyY) return emptyX === emptyY ? x.index - y.index : emptyX ? 1 : -1

      const order = compareTableValues(x.value, y.value)

      return (direction === 'asc' ? order : -order) || x.index - y.index
    })
    .map(entry => entry.row)
}

/** Header click cycle: first direction → the other one → back to the page's own order. */
export function nextTableSort(
  current: TableSort | null,
  columnId: string,
  firstDirection: TableSortDirection = 'asc'
): TableSort | null {
  if (!current || current.columnId !== columnId) return { columnId, direction: firstDirection }
  if (current.direction === firstDirection) {
    return { columnId, direction: firstDirection === 'asc' ? 'desc' : 'asc' }
  }

  return null
}
