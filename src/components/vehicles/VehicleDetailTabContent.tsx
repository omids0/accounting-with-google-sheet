import type { VehicleDetailFilterItem } from './useVehicleDetailFilters'
import VehicleActiveItemCard from './VehicleActiveItemCard'
import { vehicleHorizontalCardsContainerClass } from './vehicleCardStyles'
import type { HistoryWithRow } from './vehicleDetailMutations'
import VehicleFuelReportSection from './VehicleFuelReportSection'
import VehicleHistoryCard from './VehicleHistoryCard'
import VehicleTransactionCard from './VehicleTransactionCard'
import type {
  MonthlyFuelStats,
  VehicleActiveListItem,
  VehicleTransactionItem
} from '../../types/vehicles'
import AppIcon from '../AppIcon'
import SearchEmptyState from '../SearchEmptyState'
import { DangCardListSkeleton } from '../skeleton'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'

type VehicleDetailTabContentProps = {
  detailTab: 'active' | 'history' | 'transactions' | 'fuel'
  loading: boolean
  activeItems: VehicleActiveListItem[]
  history: HistoryWithRow[]
  transactions: VehicleTransactionItem[]
  fuelStats: MonthlyFuelStats[]
  filterChipsCount: number
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
  fuelStats,
  filterChipsCount,
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
  const isActiveTab = detailTab === 'active'
  const isHistoryTab = detailTab === 'history'

  if (detailTab === 'transactions') {
    if (transactions.length === 0) {
      return (
        <div className={emptyStateClass}>
          <div className={emptyStateIconClass}>
            <AppIcon name="settings" />
          </div>
          <p>تراکنش مرتبطی ثبت نشده</p>
        </div>
      )
    }

    return (
      <div className={vehicleHorizontalCardsContainerClass}>
        {transactions.map(item => (
          <VehicleTransactionCard key={item.id} item={item} onDelete={onDeleteTransaction} />
        ))}
      </div>
    )
  }

  if (detailTab === 'fuel') {
    return <VehicleFuelReportSection stats={fuelStats} />
  }

  if (loading && activeItems.length === 0 && history.length === 0) {
    return <DangCardListSkeleton filterChips={filterChipsCount} />
  }

  if (sourceItems.length === 0) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="settings" />
        </div>
        <p>{isActiveTab ? 'مورد فعالی ثبت نشده' : 'تاریخچه‌ای ثبت نشده'}</p>
      </div>
    )
  }

  if (listItems.length === 0) {
    return <SearchEmptyState />
  }

  if (isActiveTab) {
    return (
      <div className={vehicleHorizontalCardsContainerClass}>
        {(listItems as VehicleActiveListItem[]).map(item => (
          <VehicleActiveItemCard
            key={item.id}
            item={item}
            onComplete={onComplete}
            onRenew={onRenew}
            onEdit={item.kind === 'periodic' ? onPeriodicEdit : onDeadlineEdit}
            onDelete={onDeleteActive}
          />
        ))}
      </div>
    )
  }

  if (isHistoryTab) {
    return (
      <div className={vehicleHorizontalCardsContainerClass}>
        {(listItems as HistoryWithRow[]).map(item => (
          <VehicleHistoryCard key={item.id} item={item} onDelete={onDeleteHistory} />
        ))}
      </div>
    )
  }

  return null
}
