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
import DangSettleAction from './DangSettleAction'
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
  onAmountBlur: (item: DangWithRow, value?: number | '') => void
  onEdit: (item: DangWithRow) => void
  onDelete: (item: DangWithRow) => void
  /** A building's debts: the «پرداخت به …» button and the dial pad. */
  building?: boolean
  /** Opens the same create form as the page speed dial. */
  onAdd?: () => void
  /** Wording of the empty list, for a scope that talks about someone else's debts. */
  emptyCopy?: DangEmptyCopy
}

export interface DangEmptyCopy {
  message: string
  description: string
  actionLabel: string
}

const PERSONAL_EMPTY_COPY: DangEmptyCopy = {
  message: 'هنوز بدهی ثبت نشده',
  description:
    'بدهی‌هایت به دیگران را این‌جا ثبت کن و هر پرداخت را علامت بزن تا مانده‌اش معلوم باشد.',
  actionLabel: 'افزودن بدهی'
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
  onAdd,
  building = false,
  emptyCopy = PERSONAL_EMPTY_COPY
}: DangListProps) {
  const isDesktop = useIsDesktop()
  const { shared } = useSharing()
  const readOnly = useReadOnly()
  const columns = useMemo<DataTableColumn<DangWithRow>[]>(
    () => [
      ...(building
        ? []
        : [
            checkboxColumn({
              header: 'پرداخت شد',
              checked: (item: DangWithRow) => item.paid,
              disabled: (item: DangWithRow) => togglingId === item.id || readOnly,
              label: (item: DangWithRow) => `پرداخت شد: ${item.title}`,
              onChange: onTogglePaid
            })
          ]),
      textColumn('title', 'عنوان', item => item.title, true),
      textColumn('category', 'دسته', item => item.category),
      textColumn('counterparty', 'طرف حساب', item => item.counterparty),
      ...(shared ? [writerColumn<DangWithRow>(item => item.writer)] : []),
      dateColumn('date', 'تاریخ', item => item.date),
      moneyColumn('amount', 'مبلغ', item => item.amount)
    ],
    [togglingId, onTogglePaid, shared, readOnly, building]
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
        description={emptyCopy.description}
        message={emptyCopy.message}
        action={onAdd ? { label: emptyCopy.actionLabel, onClick: onAdd } : undefined}
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
            <>
              {building && !readOnly ? (
                <DangSettleAction
                  item={item}
                  busy={togglingId === item.id}
                  onToggle={onTogglePaid}
                />
              ) : null}
              <TableRowActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
            </>
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
              building={building}
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
