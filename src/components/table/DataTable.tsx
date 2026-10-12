import { Fragment, type ReactNode } from 'react'

import { type SortableColumn, useTableSort } from '../../hooks/useTableSort'
import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'
import {
  dataTableActionsCellClass,
  dataTableActionsClass,
  dataTableCellClass,
  dataTableClass,
  dataTableDetailCellClass,
  dataTableHeadCellClass,
  dataTableNumericClass,
  dataTableRowClass,
  dataTableSortBtnClass,
  dataTableSortIconClass,
  dataTableWrapClass
} from '../ui/tableStyles'

export interface DataTableColumn<T> extends SortableColumn<T> {
  header: string
  cell: (row: T) => ReactNode
  /** Amounts and counts: end-aligned tabular numbers. */
  numeric?: boolean
  /** Header read by screen readers only (checkbox columns). */
  hideHeader?: boolean
  className?: string
}

export interface DataTableProps<T> {
  /** Accessible name of the table. */
  label: string
  rows: T[]
  columns: DataTableColumn<T>[]
  rowKey: (row: T) => string
  /** The row's buttons (edit, delete, expand) — the same actions as its card. */
  actions?: (row: T) => ReactNode
  /** Dimmed rows (paid, done). */
  isMuted?: (row: T) => boolean
  /** Row whose detail line is open under it. */
  expandedKey?: string | null
  renderDetail?: (row: T) => ReactNode
  /** Without the card frame, inside another block. */
  bare?: boolean
}

/**
 * The desktop list view: one generic table driven by a column config, with
 * click-to-sort headers, per-row actions and an optional detail row.
 */
export default function DataTable<T>({
  label,
  rows,
  columns,
  rowKey,
  actions,
  isMuted,
  expandedKey,
  renderDetail,
  bare
}: DataTableProps<T>) {
  const { sortedRows, sort, toggleSort } = useTableSort(rows, columns)
  const span = columns.length + (actions ? 1 : 0)

  return (
    <div className={dataTableWrapClass(bare)}>
      <table className={dataTableClass} aria-label={label}>
        <thead>
          <tr>
            {columns.map(column => {
              const direction = sort?.columnId === column.id ? sort.direction : undefined

              return (
                <th
                  key={column.id}
                  scope="col"
                  className={cn(dataTableHeadCellClass, column.numeric && 'text-end')}
                  aria-sort={
                    direction ? (direction === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                >
                  {column.hideHeader ? (
                    <span className="sr-only">{column.header}</span>
                  ) : column.sortValue ? (
                    <button
                      type="button"
                      className={dataTableSortBtnClass}
                      onClick={() => toggleSort(column.id)}
                    >
                      {column.header}
                      <span className={dataTableSortIconClass(direction)} aria-hidden="true">
                        <AppIcon name="chevron-down" size={12} />
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
            {actions && (
              <th scope="col" className={dataTableHeadCellClass}>
                <span className="sr-only">عملیات</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map(row => {
            const key = rowKey(row)

            return (
              <Fragment key={key}>
                <tr className={dataTableRowClass(isMuted?.(row))}>
                  {columns.map(column => (
                    <td
                      key={column.id}
                      className={cn(
                        dataTableCellClass,
                        column.numeric && dataTableNumericClass,
                        column.className
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                  {actions && (
                    <td className={dataTableActionsCellClass}>
                      <div className={dataTableActionsClass}>{actions(row)}</div>
                    </td>
                  )}
                </tr>
                {renderDetail && expandedKey === key && (
                  <tr>
                    <td colSpan={span} className={dataTableDetailCellClass}>
                      {renderDetail(row)}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
