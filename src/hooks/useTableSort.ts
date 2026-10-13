import { useCallback, useMemo, useState } from 'react'

import {
  nextTableSort,
  sortTableRows,
  type TableSort,
  type TableSortDirection,
  type TableSortValue
} from '../utils/tableSort'

export interface SortableColumn<T> {
  id: string
  /** Value the column sorts by; columns without one are not sortable. */
  sortValue?: (row: T) => TableSortValue
  /** Direction of the first click (amounts usually start with the largest). */
  sortFirst?: TableSortDirection
}

/** Click-to-sort state for a table; rows keep the page's order until a header is clicked. */
export function useTableSort<T>(rows: T[], columns: SortableColumn<T>[]) {
  const [sort, setSort] = useState<TableSort | null>(null)

  const sortedRows = useMemo(() => {
    const column = sort ? columns.find(item => item.id === sort.columnId) : undefined

    return sort && column?.sortValue ? sortTableRows(rows, column.sortValue, sort.direction) : rows
  }, [columns, rows, sort])

  const toggleSort = useCallback(
    (columnId: string) => {
      const firstDirection = columns.find(item => item.id === columnId)?.sortFirst

      setSort(current => nextTableSort(current, columnId, firstDirection))
    },
    [columns]
  )

  return { sortedRows, sort, toggleSort }
}
