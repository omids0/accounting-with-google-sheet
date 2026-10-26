import DangCard from './DangCard'
import DangPaymentCard from './DangPaymentCard'
import DangTable from './DangTable'
import DangTotalFooter from './DangTotalFooter'
import type { DangAmountEditApi, DangPaymentsApi, DangWithRow } from './types'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import EmptyState from '../EmptyState'
import IncrementalCardList from '../IncrementalCardList'
import SearchEmptyState from '../SearchEmptyState'
import { DangCardListSkeleton, InstallmentCardListSkeleton } from '../skeleton'
import { dangTotalFooterClass } from '../ui/featureCardStyles'

export type DangListProps = {
  items: DangWithRow[]
  filteredItems: DangWithRow[]
  loading: boolean
  expandedId: string | null
  togglingId: string
  payments: DangPaymentsApi
  amountEdit: DangAmountEditApi
  onExpand: (id: string | null) => void
  onTogglePaid: (item: DangWithRow, paid: boolean) => void
  onEdit: (item: DangWithRow) => void
  onDelete: (item: DangWithRow) => void
  /** A building's debts: the «پرداخت به …» button and the dial pad. */
  building?: boolean
  /** A filter narrows the list: the footer then says so. */
  filtered?: boolean
  /** The active filters, and the `?highlight=` target, for the 50-card window. */
  resetKey?: string
  highlightId?: string | null
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
    'بدهی‌هایت به دیگران را این‌جا ثبت کن. هر بار که بخشی از آن را دادی، پرداختش را بنویس تا مانده‌اش همیشه معلوم باشد.',
  actionLabel: 'افزودن بدهی'
}

export default function DangList({
  items,
  filteredItems,
  loading,
  expandedId,
  togglingId,
  payments,
  amountEdit,
  onExpand,
  onTogglePaid,
  onEdit,
  onDelete,
  onAdd,
  building = false,
  filtered = false,
  resetKey = '',
  highlightId,
  emptyCopy = PERSONAL_EMPTY_COPY
}: DangListProps) {
  const isDesktop = useIsDesktop()

  if (loading && items.length === 0) {
    return building ? (
      <DangCardListSkeleton
        actions={3}
        metaLines={1}
        footerStats={1}
        footerClassName={dangTotalFooterClass}
        table
      />
    ) : (
      <InstallmentCardListSkeleton footerStats={1} footerClassName={dangTotalFooterClass} table />
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

  const personalCard = (item: DangWithRow, index: number, bodyOnly = false) => (
    <DangPaymentCard
      key={item.id}
      item={item}
      index={index}
      expanded={expandedId === item.id}
      payments={payments}
      amountEdit={amountEdit}
      onExpand={onExpand}
      onEdit={onEdit}
      onDelete={onDelete}
      bodyOnly={bodyOnly}
    />
  )

  return (
    <>
      {filteredItems.length === 0 ? (
        <SearchEmptyState />
      ) : isDesktop ? (
        <DangTable
          items={filteredItems}
          building={building}
          togglingId={togglingId}
          expandedId={expandedId}
          onToggleExpand={onExpand}
          onTogglePaid={onTogglePaid}
          onEdit={onEdit}
          onDelete={onDelete}
          renderDetail={item => personalCard(item, 0, true)}
          resetKey={resetKey}
          highlightId={highlightId}
        />
      ) : (
        <IncrementalCardList
          items={filteredItems}
          getId={item => item.id}
          resetKey={resetKey}
          mustInclude={[highlightId, expandedId]}
          renderItem={(item, index) =>
            building ? (
              <DangCard
                key={item.id}
                item={item}
                expanded={expandedId === item.id}
                togglingId={togglingId}
                amountEdit={amountEdit}
                onTogglePaid={onTogglePaid}
                onExpand={onExpand}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ) : (
              personalCard(item, index)
            )
          }
        />
      )}

      <DangTotalFooter
        items={items}
        filteredItems={filteredItems}
        filtered={filtered}
        building={building}
      />
    </>
  )
}
