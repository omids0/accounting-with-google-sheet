import type { VehicleDetailFilterItem } from './useVehicleDetailFilters'
import VehicleActiveItemCard from './VehicleActiveItemCard'
import { vehicleHorizontalCardsContainerClass } from './vehicleCardStyles'
import type { HistoryWithRow } from './vehicleDetailMutations'
import VehicleFuelReportSection from './VehicleFuelReportSection'
import VehicleHistoryCard from './VehicleHistoryCard'
import VehicleTransactionsSection from './VehicleTransactionsSection'
import type {
  MonthlyFuelStats,
  VehicleActiveListItem,
  VehicleTransactionItem
} from '../../types/vehicles'
import EmptyState from '../EmptyState'
import IncrementalCardList from '../IncrementalCardList'
import SearchEmptyState from '../SearchEmptyState'
import { DangCardListSkeleton } from '../skeleton'

type VehicleDetailTabContentProps = {
  detailTab: 'active' | 'deadlines' | 'history' | 'mileage' | 'transactions' | 'fuel'
  loading: boolean
  activeItems: VehicleActiveListItem[]
  history: HistoryWithRow[]
  transactions: VehicleTransactionItem[]
  allTransactionsCount: number
  fuelStats: MonthlyFuelStats[]
  sourceItems: VehicleActiveListItem[] | HistoryWithRow[]
  listItems: VehicleDetailFilterItem[]
  onComplete: (item: VehicleActiveListItem) => void
  onRenew: (item: VehicleActiveListItem) => void
  onPeriodicEdit: (item: VehicleActiveListItem) => void
  onDeadlineEdit: (item: VehicleActiveListItem) => void
  onDeleteActive: (item: VehicleActiveListItem) => void
  onDeleteHistory: (item: HistoryWithRow) => void
  onDeleteTransaction: (item: VehicleTransactionItem) => void
}

export default function VehicleDetailTabContent({
  detailTab,
  loading,
  activeItems,
  history,
  transactions,
  allTransactionsCount,
  fuelStats,
  sourceItems,
  listItems,
  onComplete,
  onRenew,
  onPeriodicEdit,
  onDeadlineEdit,
  onDeleteActive,
  onDeleteHistory,
  onDeleteTransaction
}: VehicleDetailTabContentProps) {
  const isActiveTab = detailTab === 'active' || detailTab === 'deadlines'
  const isHistoryTab = detailTab === 'history' || detailTab === 'mileage'

  if (detailTab === 'transactions') {
    if (allTransactionsCount === 0) {
      return (
        <EmptyState
          icon="car"
          description="هزینه‌هایی که با این خودرو ثبت می‌کنی این‌جا جمع می‌شوند."
          message="تراکنش مرتبطی ثبت نشده"
        />
      )
    }

    if (transactions.length === 0) {
      return <SearchEmptyState />
    }

    return <VehicleTransactionsSection transactions={transactions} onDelete={onDeleteTransaction} />
  }

  if (detailTab === 'fuel') {
    return <VehicleFuelReportSection stats={fuelStats} />
  }

  if (loading && activeItems.length === 0 && history.length === 0) {
    return <DangCardListSkeleton />
  }

  if (sourceItems.length === 0) {
    return (
      <EmptyState
        icon="car"
        message={
          detailTab === 'deadlines'
            ? 'موعدی ثبت نشده'
            : isActiveTab
            ? 'مورد فعالی ثبت نشده'
            : detailTab === 'mileage'
            ? 'کارکردی ثبت نشده'
            : 'تاریخچه‌ای ثبت نشده'
        }
      />
    )
  }

  if (listItems.length === 0) {
    return <SearchEmptyState />
  }

  if (isActiveTab) {
    return (
      <IncrementalCardList
        items={listItems as VehicleActiveListItem[]}
        getId={item => item.id}
        resetKey={detailTab}
        className={vehicleHorizontalCardsContainerClass}
        renderItem={item => (
          <VehicleActiveItemCard
            key={item.id}
            item={item}
            onComplete={onComplete}
            onRenew={onRenew}
            onEdit={item.kind === 'periodic' ? onPeriodicEdit : onDeadlineEdit}
            onDelete={onDeleteActive}
          />
        )}
      />
    )
  }

  if (isHistoryTab) {
    return (
      <IncrementalCardList
        items={listItems as HistoryWithRow[]}
        getId={item => item.id}
        resetKey={detailTab}
        className={vehicleHorizontalCardsContainerClass}
        renderItem={item => (
          <VehicleHistoryCard key={item.id} item={item} onDelete={onDeleteHistory} />
        )}
      />
    )
  }

  return null
}
