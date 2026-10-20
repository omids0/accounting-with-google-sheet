import { useMemo } from 'react'

import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useSharing } from '../../hooks/useSharing'
import { unpaidDangTotal } from '../../services/dang'
import { distributionSparkline } from '../../utils/sparklineData'
import EmptyState from '../EmptyState'
import SearchEmptyState from '../SearchEmptyState'
import { DangCardListSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import DangCard from './DangCard'
import type { DangWithRow } from './types'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import {
  checkboxColumn,
  dateColumn,
  moneyColumn,
  textColumn,
  writerColumn
} from '../table/tableColumns'
import TableRowActions from '../table/TableRowActions'
import { dangTotalFooterClass, listCardsContainerClass } from '../ui/featureCardStyles'
import { useReadOnly } from '../ui/readOnly'

export type DangListProps = {
  items: DangWithRow[]
  filteredItems: DangWithRow[]
  loading: boolean
  expandedId: string | null
  togglingId: string
  savingAmountId: string
  amountEdits: Record<string, number | ''>
  onExpand: (id: string | null) => void
  onTogglePaid: (item: DangWithRow, paid: boolean) => void
  onAmountChange: (item: DangWithRow, value: number | '') => void
  onAmountBlur: (item: DangWithRow) => void
  onEdit: (item: DangWithRow) => void
  onDelete: (item: DangWithRow) => void
  /** Opens the same create form as the page speed dial. */
  onAdd?: () => void
}

export default function DangList({
  items,
  filteredItems,
  loading,
  expandedId,
  togglingId,
  savingAmountId,
  amountEdits,
  onExpand,
  onTogglePaid,
  onAmountChange,
  onAmountBlur,
  onEdit,
  onDelete,
  onAdd
}: DangListProps) {
  const isDesktop = useIsDesktop()
  const { shared } = useSharing()
  const readOnly = useReadOnly()
  const columns = useMemo<DataTableColumn<DangWithRow>[]>(
    () => [
      checkboxColumn({
        header: 'پرداخت شد',
        checked: item => item.paid,
        disabled: item => togglingId === item.id || readOnly,
        label: item => `پرداخت شد: ${item.title}`,
        onChange: onTogglePaid
      }),
      textColumn('title', 'عنوان', item => item.title, true),
      textColumn('category', 'دسته', item => item.category),
      textColumn('counterparty', 'طرف حساب', item => item.counterparty),
      ...(shared ? [writerColumn<DangWithRow>(item => item.writer)] : []),
      dateColumn('date', 'تاریخ', item => item.date),
      moneyColumn('amount', 'مبلغ', item => item.amount)
    ],
    [togglingId, onTogglePaid, shared, readOnly]
  )

  if (loading && items.length === 0) {
    return (
      <DangCardListSkeleton
        actions={3}
        metaLines={1}
        footerStats={1}
        footerClassName={dangTotalFooterClass}
        table
      />
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="debt"
        description="بدهی‌هایت به دیگران را این‌جا ثبت کن و هر پرداخت را علامت بزن تا مانده‌اش معلوم باشد."
        message="هنوز بدهی ثبت نشده"
        action={onAdd ? { label: 'افزودن بدهی', onClick: onAdd } : undefined}
      />
    )
  }

  if (filteredItems.length === 0) {
    return <SearchEmptyState />
  }

  const totalUnpaid = unpaidDangTotal(filteredItems)

  return (
    <>
      {isDesktop ? (
        <DataTable
          label="بدهی‌ها"
          rows={filteredItems}
          columns={columns}
          rowKey={item => item.id}
          isMuted={item => item.paid}
          actions={item => (
            <TableRowActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
          )}
        />
      ) : (
        <div className={listCardsContainerClass}>
          {filteredItems.map(item => (
            <DangCard
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              togglingId={togglingId}
              savingAmountId={savingAmountId}
              amountEdits={amountEdits}
              onTogglePaid={onTogglePaid}
              onExpand={onExpand}
              onAmountChange={onAmountChange}
              onAmountBlur={onAmountBlur}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {totalUnpaid > 0 && (
        <StatCard
          label="مانده پرداخت نشده"
          amount={totalUnpaid}
          variant="expense"
          wide
          sparklineData={distributionSparkline(
            filteredItems.filter(item => !item.paid).map(item => item.amount)
          )}
          className={dangTotalFooterClass}
        />
      )}
    </>
  )
}
