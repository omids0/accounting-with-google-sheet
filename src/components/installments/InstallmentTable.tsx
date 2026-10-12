import { type ReactNode, useMemo } from 'react'

import type { DisplayPlanItem } from './types'
import {
  getInstallmentDuePaymentAmount,
  remainingInstallmentAmount
} from '../../services/installments'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import { dateColumn, moneyColumn, textColumn } from '../table/tableColumns'
import TableRowActions from '../table/TableRowActions'

/** Desktop view of the plans; each plan's payments open in its detail line. */
export default function InstallmentTable({
  items,
  expandedId,
  onToggleExpand,
  onEdit,
  onDelete,
  renderDetail
}: {
  items: DisplayPlanItem[]
  expandedId: string | null
  onToggleExpand: (planId: string) => void
  onEdit: (item: DisplayPlanItem) => void
  onDelete: (item: DisplayPlanItem) => void
  renderDetail: (item: DisplayPlanItem) => ReactNode
}) {
  const columns = useMemo<DataTableColumn<DisplayPlanItem>[]>(
    () => [
      textColumn('title', 'عنوان', item => item.plan.title, true),
      dateColumn('due', 'موعد پرداخت', item => item.dueDate),
      moneyColumn('dueAmount', 'مبلغ قسط', item =>
        item.dueDate ? getInstallmentDuePaymentAmount(item.plan, item.dueDate) ?? 0 : 0
      ),
      {
        id: 'progress',
        header: 'پرداخت شده',
        numeric: true,
        sortValue: item => item.progress,
        cell: item =>
          item.complete
            ? 'تکمیل شده'
            : `${item.done.toLocaleString('fa-IR')}/${item.plan.count.toLocaleString('fa-IR')}`
      },
      moneyColumn('remaining', 'مانده', item => remainingInstallmentAmount(item.plan))
    ],
    []
  )

  return (
    <DataTable
      label="اقساط"
      rows={items}
      columns={columns}
      rowKey={item => item.plan.id}
      isMuted={item => item.complete || item.settledForRange}
      expandedKey={expandedId}
      renderDetail={renderDetail}
      actions={item => {
        const expanded = expandedId === item.plan.id

        return (
          <TableRowActions
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item)}
            expanded={expanded}
            onToggleExpand={() => onToggleExpand(item.plan.id)}
            expandLabel="نمایش جزئیات اقساط"
          />
        )
      }}
    />
  )
}
