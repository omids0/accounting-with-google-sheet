import { useMemo } from 'react'

import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useSharing } from '../../hooks/useSharing'
import { CHECK_DIRECTION_LABELS } from '../../services/checkDirection'
import { CHECKS_SHEET } from '../../services/checks'
import AttachmentBadge from '../attachments/AttachmentBadge'
import EmptyState from '../EmptyState'
import IncrementalCardList from '../IncrementalCardList'
import SearchEmptyState from '../SearchEmptyState'
import { DangCardListSkeleton } from '../skeleton'
import CheckCard from './CheckCard'
import CheckTotals from './CheckTotals'
import type { CheckWithRow } from './types'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import {
  checkboxColumn,
  dateColumn,
  moneyColumn,
  textColumn,
  writerColumn
} from '../table/tableColumns'
import TableRowActions from '../table/TableRowActions'
import { useReadOnly } from '../ui/readOnly'

export type CheckListProps = {
  items: CheckWithRow[]
  filteredItems: CheckWithRow[]
  loading: boolean
  togglingId: string
  onTogglePaid: (item: CheckWithRow, paid: boolean) => void
  onEdit: (item: CheckWithRow) => void
  onDelete: (item: CheckWithRow) => void
  /** Opens the same create form as the page speed dial. */
  onAdd?: () => void
  /** The active «نوع چک» filter's label ('' = none), named when it hides every row. */
  directionNote?: string
  onClearDirection?: () => void
  /** The active filters; a change shows the first 50 rows again. */
  resetKey: string
  /** The `?highlight=` target: rendered even when it lies beyond the first 50. */
  highlightId?: string | null
}

export default function CheckList({
  items,
  filteredItems,
  loading,
  togglingId,
  onTogglePaid,
  onEdit,
  onDelete,
  onAdd,
  directionNote,
  onClearDirection,
  resetKey,
  highlightId
}: CheckListProps) {
  const isDesktop = useIsDesktop()
  const { shared } = useSharing()
  const readOnly = useReadOnly()
  const columns = useMemo<DataTableColumn<CheckWithRow>[]>(
    () => [
      checkboxColumn({
        header: 'پاس شد',
        checked: item => item.paid,
        disabled: item => togglingId === item.id || readOnly,
        label: item => `پاس شد: چک ${CHECK_DIRECTION_LABELS[item.direction]} ${item.checkNumber}`,
        onChange: onTogglePaid
      }),
      textColumn('number', 'شماره', item => item.checkNumber, true),
      textColumn('direction', 'نوع', item => CHECK_DIRECTION_LABELS[item.direction]),
      textColumn('counterparty', 'طرف حساب', item => item.counterparty),
      ...(shared ? [writerColumn<CheckWithRow>(item => item.writer)] : []),
      dateColumn('created', 'صدور', item => item.creationDate),
      dateColumn('due', 'سررسید', item => item.dueDate),
      moneyColumn('amount', 'مبلغ', item => item.amount)
    ],
    [togglingId, onTogglePaid, shared, readOnly]
  )

  if (loading && items.length === 0) {
    return <DangCardListSkeleton footerStats={2} table />
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="checks"
        description="چک‌های پرداختی و دریافتی‌ات را با تاریخ سررسید این‌جا مدیریت کن تا هیچ چکی از قلم نیفتد."
        message="هنوز چکی ثبت نشده"
        action={onAdd ? { label: 'افزودن چک', onClick: onAdd } : undefined}
      />
    )
  }

  if (filteredItems.length === 0) {
    return (
      <SearchEmptyState
        filterNote={directionNote ? `فیلتر «نوع چک: ${directionNote}» فعال است.` : undefined}
        onClearFilter={onClearDirection}
      />
    )
  }

  return (
    <>
      {isDesktop ? (
        <DataTable
          label="چک‌ها"
          rows={filteredItems}
          columns={columns}
          rowKey={item => item.id}
          windowed
          resetKey={resetKey}
          mustInclude={[highlightId]}
          isMuted={item => item.paid}
          actions={item => (
            <>
              <AttachmentBadge
                sheetName={CHECKS_SHEET}
                entityId={item.id}
                fileIds={item.attachments}
                title={`چک ${item.checkNumber}`}
              />
              <TableRowActions
                itemLabel={`چک ${item.checkNumber}`}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item)}
              />
            </>
          )}
        />
      ) : (
        <IncrementalCardList
          items={filteredItems}
          getId={item => item.id}
          resetKey={resetKey}
          mustInclude={[highlightId]}
          renderItem={item => (
            <CheckCard
              key={item.id}
              item={item}
              togglingId={togglingId}
              onTogglePaid={onTogglePaid}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
        />
      )}

      <CheckTotals items={filteredItems} />
    </>
  )
}
