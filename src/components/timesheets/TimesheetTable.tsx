import { useMemo } from 'react'

import type { TimesheetWithRow } from './useTimesheetsPage'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import { textColumn } from '../table/tableColumns'
import TableRowActions from '../table/TableRowActions'
import { dataTableLinkClass } from '../ui/tableStyles'

/** Desktop view of the timesheet list: the title opens its entries, as the card does. */
export default function TimesheetTable({
  items,
  onOpen,
  onEdit,
  onDelete
}: {
  items: TimesheetWithRow[]
  onOpen: (item: TimesheetWithRow) => void
  onEdit: (item: TimesheetWithRow) => void
  onDelete: (item: TimesheetWithRow) => void
}) {
  const columns = useMemo<DataTableColumn<TimesheetWithRow>[]>(
    () => [
      {
        id: 'title',
        header: 'عنوان',
        sortValue: item => item.title,
        cell: item => (
          <button type="button" className={dataTableLinkClass} onClick={() => onOpen(item)}>
            {item.title}
          </button>
        )
      },
      textColumn('description', 'توضیحات', item => item.description),
      textColumn('created', 'ایجاد', item => item.createdAt)
    ],
    [onOpen]
  )

  return (
    <DataTable
      label="تایم‌شیت‌ها"
      rows={items}
      columns={columns}
      rowKey={item => item.id}
      actions={item => (
        <TableRowActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
      )}
    />
  )
}
