import { type ReactNode, useMemo } from 'react'

import DangSettleAction from './DangSettleAction'
import type { DangWithRow } from './types'
import { useSharing } from '../../hooks/useSharing'
import { dangPaidAmount, dangRemaining, isDangSettled } from '../../utils/dangLedger'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import { dateColumn, moneyColumn, textColumn, writerColumn } from '../table/tableColumns'
import TableRowActions from '../table/TableRowActions'
import { useReadOnly } from '../ui/readOnly'

type DangTableProps = {
  items: DangWithRow[]
  /** A building's debts: the «پرداخت به …» button, no payment columns, no detail row. */
  building: boolean
  togglingId: string
  expandedId: string | null
  onToggleExpand: (id: string | null) => void
  onTogglePaid: (item: DangWithRow, paid: boolean) => void
  onEdit: (item: DangWithRow) => void
  onDelete: (item: DangWithRow) => void
  /** Personal debts: the payments of the open row. */
  renderDetail: (item: DangWithRow) => ReactNode
  /** The active filters, and the `?highlight=` target, for the 50-row window. */
  resetKey: string
  highlightId?: string | null
}

/** Desktop view of debts; a personal debt's payments open in the row's detail line. */
export default function DangTable({
  items,
  building,
  togglingId,
  expandedId,
  onToggleExpand,
  onTogglePaid,
  onEdit,
  onDelete,
  renderDetail,
  resetKey,
  highlightId
}: DangTableProps) {
  const { shared } = useSharing()
  const readOnly = useReadOnly()

  const columns = useMemo<DataTableColumn<DangWithRow>[]>(
    () => [
      textColumn('title', 'عنوان', item => item.title, true),
      textColumn('category', 'دسته', item => item.category),
      textColumn('counterparty', 'طرف حساب', item => item.counterparty),
      ...(shared ? [writerColumn<DangWithRow>(item => item.writer)] : []),
      dateColumn('date', 'تاریخ', item => item.date),
      moneyColumn('amount', 'مبلغ', item => item.amount),
      ...(building
        ? []
        : [
            moneyColumn('paid', 'پرداخت شده', dangPaidAmount),
            moneyColumn('remaining', 'مانده', dangRemaining)
          ])
    ],
    [shared, building]
  )

  return (
    <DataTable
      label="بدهی‌ها"
      rows={items}
      columns={columns}
      rowKey={item => item.id}
      windowed
      resetKey={resetKey}
      mustInclude={[highlightId]}
      isMuted={building ? item => item.paid : isDangSettled}
      expandedKey={building ? undefined : expandedId}
      renderDetail={building ? undefined : renderDetail}
      actions={item => {
        const expanded = expandedId === item.id

        return (
          <>
            {building && !readOnly ? (
              <DangSettleAction item={item} busy={togglingId === item.id} onToggle={onTogglePaid} />
            ) : null}
            <TableRowActions
              itemLabel={item.title}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item)}
              expanded={building ? undefined : expanded}
              onToggleExpand={
                building ? undefined : () => onToggleExpand(expanded ? null : item.id)
              }
              expandLabel="نمایش جزئیات بدهی"
            />
          </>
        )
      }}
    />
  )
}
