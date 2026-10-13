import { useMemo } from 'react'

import IranPlateBadge, { isEmptyPlate } from './IranPlateBadge'
import type { VehicleProfileWithRow } from './types'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import TableRowActions from '../table/TableRowActions'
import { dataTableLinkClass } from '../ui/tableStyles'

/** Desktop view of the vehicle list: the title opens the vehicle, as the card does. */
export default function VehicleTable({
  items,
  actionCountById,
  onOpen,
  onEdit,
  onDelete
}: {
  items: VehicleProfileWithRow[]
  actionCountById: Record<string, number>
  onOpen: (item: VehicleProfileWithRow) => void
  onEdit: (item: VehicleProfileWithRow) => void
  onDelete: (item: VehicleProfileWithRow) => void
}) {
  const columns = useMemo<DataTableColumn<VehicleProfileWithRow>[]>(
    () => [
      {
        id: 'title',
        header: 'خودرو',
        sortValue: item => item.title,
        cell: item => (
          <button type="button" className={dataTableLinkClass} onClick={() => onOpen(item)}>
            {item.title || '—'}
          </button>
        )
      },
      {
        id: 'plate',
        header: 'پلاک',
        cell: item => (isEmptyPlate(item.plate) ? '—' : <IranPlateBadge value={item.plate} />)
      },
      {
        id: 'mileage',
        header: 'کارکرد (km)',
        numeric: true,
        sortFirst: 'desc',
        sortValue: item => item.mileage,
        cell: item => item.mileage.toLocaleString('fa-IR')
      },
      {
        id: 'actions-needed',
        header: 'نیاز به اقدام',
        numeric: true,
        sortFirst: 'desc',
        sortValue: item => actionCountById[item.id] ?? 0,
        cell: item => {
          const count = actionCountById[item.id] ?? 0

          return count > 0 ? (
            <span className="text-danger">{count.toLocaleString('fa-IR')} اقدام</span>
          ) : (
            '—'
          )
        }
      }
    ],
    [actionCountById, onOpen]
  )

  return (
    <DataTable
      label="خودروها"
      rows={items}
      columns={columns}
      rowKey={item => item.id}
      actions={item => (
        <TableRowActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
      )}
    />
  )
}
