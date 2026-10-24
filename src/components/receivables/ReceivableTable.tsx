import { type ReactNode, useMemo } from 'react'

import type { ReceivableWithRow } from './types'
import { useSharing } from '../../hooks/useSharing'
import { isReceivableComplete, paidAmount, remainingAmount } from '../../services/receivables'
import { getReceivableDisplayTitle } from '../../services/receivablesRow'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import { dateColumn, moneyColumn, textColumn, writerColumn } from '../table/tableColumns'
import TableRowActions from '../table/TableRowActions'

/** Desktop view of receivables; payments and settlement open in the row's detail line. */
export default function ReceivableTable({
  items,
  expandedId,
  onToggleExpand,
  onEdit,
  onDelete,
  renderDetail
}: {
  items: ReceivableWithRow[]
  expandedId: string | null
  onToggleExpand: (item: ReceivableWithRow, expanded: boolean) => void
  onEdit: (item: ReceivableWithRow) => void
  onDelete: (item: ReceivableWithRow) => void
  renderDetail: (item: ReceivableWithRow) => ReactNode
}) {
  const { shared } = useSharing()
  const columns = useMemo<DataTableColumn<ReceivableWithRow>[]>(
    () => [
      textColumn('title', 'عنوان', getReceivableDisplayTitle, true),
      textColumn('debtor', 'بدهکار', item => item.debtor),
      textColumn('category', 'دسته', item => item.category),
      ...(shared ? [writerColumn<ReceivableWithRow>(item => item.writer)] : []),
      dateColumn('borrowDate', 'تاریخ قرض', item => item.borrowDate),
      moneyColumn('amount', 'مبلغ', item => item.amount),
      moneyColumn('paid', 'پرداخت شده', paidAmount),
      moneyColumn('remaining', 'مانده', remainingAmount)
    ],
    [shared]
  )

  return (
    <DataTable
      label="طلب‌ها"
      rows={items}
      columns={columns}
      rowKey={item => item.id}
      isMuted={isReceivableComplete}
      expandedKey={expandedId}
      renderDetail={renderDetail}
      actions={item => {
        const expanded = expandedId === item.id

        return (
          <TableRowActions
            itemLabel={item.title}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item)}
            expanded={expanded}
            onToggleExpand={() => onToggleExpand(item, expanded)}
            expandLabel="نمایش جزئیات طلب"
          />
        )
      }}
    />
  )
}
