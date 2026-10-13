import { useMemo } from 'react'

import type { ItemStat } from '../../../services/lineItemsReport'
import DataTable, { type DataTableColumn } from '../../table/DataTable'
import { moneyColumn, textColumn } from '../../table/tableColumns'
import { dataTableLinkClass } from '../../ui/tableStyles'

/** Desktop view of the report: one row per item. */
export default function LineItemsTable({
  items,
  onOpen
}: {
  items: ItemStat[]
  onOpen: (item: ItemStat) => void
}) {
  const columns = useMemo<DataTableColumn<ItemStat>[]>(
    () => [
      {
        id: 'name',
        header: 'قلم',
        sortValue: item => item.name,
        cell: item => (
          <button type="button" className={dataTableLinkClass} onClick={() => onOpen(item)}>
            {item.name}
          </button>
        )
      },
      {
        id: 'count',
        header: 'دفعات',
        numeric: true,
        sortFirst: 'desc',
        sortValue: item => item.count,
        cell: item => item.count.toLocaleString('fa-IR')
      },
      moneyColumn('average', 'میانگین', item => Math.round(item.average)),
      moneyColumn('total', 'جمع', item => item.total),
      textColumn('category', 'دسته', item => item.topCategory)
    ],
    [onOpen]
  )

  return <DataTable label="اقلام" rows={items} columns={columns} rowKey={item => item.key} />
}
