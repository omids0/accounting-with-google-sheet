import { useMemo } from 'react'

import UnitBalance from './UnitBalance'
import UnitCard, { UnitMoreButton } from './UnitCard'
import { unitPlace, unitWho, type UnitRowData } from './unitRows'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { toPersianDigits } from '../../utils/normalizeDigits'
import MoneyText from '../MoneyText'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import TableRowActions from '../table/TableRowActions'
import { calmListClass } from '../ui/calmListStyles'
import { dataTableLinkClass } from '../ui/tableStyles'

interface UnitsListProps {
  rows: UnitRowData[]
  onOpen: (row: UnitRowData) => void
  /** Desktop row button: edit. Absent for a role without `people` and on archived units. */
  onEdit?: (row: UnitRowData) => void
  /** «⋯»: the sheet with edit, change-resident and archive (restore, for an archived unit). */
  onMore?: (row: UnitRowData) => void
}

/** Units as a flat list on phones and tablets, a sortable table on desktop. */
export default function UnitsList({ rows, onOpen, onEdit, onMore }: UnitsListProps) {
  const isDesktop = useIsDesktop()

  const columns = useMemo<DataTableColumn<UnitRowData>[]>(
    () => [
      {
        id: 'name',
        header: 'واحد',
        sortValue: row => Number(row.unit.number) || row.unit.number,
        cell: row => (
          <button type="button" className={dataTableLinkClass} onClick={() => onOpen(row)}>
            {toPersianDigits(row.unit.number)}
          </button>
        )
      },
      { id: 'who', header: 'ساکن', sortValue: unitWho, cell: unitWho },
      {
        id: 'place',
        header: 'مشخصات',
        sortValue: row => row.unit.floor,
        cell: row => unitPlace(row.unit)
      },
      {
        id: 'charge',
        header: 'شارژ ماهانه',
        numeric: true,
        sortValue: row => row.charge,
        cell: row => <MoneyText amount={row.charge} />
      },
      {
        id: 'balance',
        header: 'مانده',
        numeric: true,
        sortFirst: 'desc',
        sortValue: row => row.balance.open,
        cell: row => <UnitBalance owed={row.balance.open} credit={row.balance.credit} />
      }
    ],
    [onOpen]
  )

  if (isDesktop) {
    return (
      <DataTable
        label="واحدها"
        rows={rows}
        columns={columns}
        rowKey={row => row.unit.id}
        actions={
          onEdit || onMore
            ? row => (
                <>
                  {onEdit ? <TableRowActions onEdit={() => onEdit(row)} /> : null}
                  {onMore ? <UnitMoreButton row={row} onMore={onMore} /> : null}
                </>
              )
            : undefined
        }
      />
    )
  }

  return (
    <ul className={calmListClass}>
      {rows.map(row => (
        <UnitCard key={row.unit.id} row={row} onOpen={onOpen} onMore={onMore} />
      ))}
    </ul>
  )
}
