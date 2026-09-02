import AppIcon from './AppIcon'
import { DashboardSkeleton } from './skeleton'
import SpeedDialIcon from './SpeedDialIcon'
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial'
import { isConfigured } from '../services/settings'
import type { DashboardNavTarget } from '../types'
import DashboardContent from './dashboard/DashboardContent'
import { useDashboardPage } from './dashboard/useDashboardPage'

export default function DashboardPage({
  onReauth,
  onViewRecords,
  onNewEntry,
  onNavigate,
  onConfigureNetAvailable,
  active = true
}: {
  onReauth?: () => void
  onViewRecords?: (formType?: 'income' | 'expense') => void
  onNewEntry?: (formType: 'income' | 'expense') => void
  onNavigate?: (target: DashboardNavTarget) => void
  onConfigureNetAvailable?: () => void
  active?: boolean
}) {
  const dashboard = useDashboardPage(onReauth)

  useRegisterPageSpeedDial(
    isConfigured()
      ? {
          ariaLabel: 'عملیات داشبورد',
          actions: [
            {
              id: 'income',
              label: dashboard.incomeFormName,
              icon: <span className="speed-dial-type-icon speed-dial-type-icon--income">+</span>,
              className: 'speed-dial-action--income',
              onClick: () => onNewEntry?.('income')
            },
            {
              id: 'expense',
              label: dashboard.expenseFormName,
              icon: <span className="speed-dial-type-icon speed-dial-type-icon--expense">−</span>,
              className: 'speed-dial-action--expense',
              onClick: () => onNewEntry?.('expense')
            },
            {
              id: 'filter',
              label: 'فیلتر',
              icon: <SpeedDialIcon name="filter" />,
              onClick: dashboard.openFilterModal
            },
            {
              id: 'refresh',
              label: 'بروزرسانی',
              icon: <SpeedDialIcon name="refresh" />,
              onClick: dashboard.load,
              disabled: dashboard.loading
            }
          ]
        }
      : null,
    active
  )

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="dashboard" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  if (dashboard.loading && !dashboard.data) {
    return <DashboardSkeleton />
  }

  if (!dashboard.data) return null

  return (
    <DashboardContent
      data={dashboard.data}
      loading={dashboard.loading}
      filterChips={dashboard.filterChips}
      openFilterModal={dashboard.openFilterModal}
      filterModalOpen={dashboard.filterModalOpen}
      setFilterModalOpen={dashboard.setFilterModalOpen}
      draftDatePreset={dashboard.draftDatePreset}
      setDraftDatePreset={dashboard.setDraftDatePreset}
      draftCustomRange={dashboard.draftCustomRange}
      setDraftCustomRange={dashboard.setDraftCustomRange}
      setDatePreset={dashboard.setDatePreset}
      setCustomRange={dashboard.setCustomRange}
      onConfigureNetAvailable={onConfigureNetAvailable}
      financial={dashboard.financial}
      incomeSparkline={dashboard.incomeSparkline}
      expenseSparkline={dashboard.expenseSparkline}
      netSparkline={dashboard.netSparkline}
      categoryYAxisWidth={dashboard.categoryYAxisWidth}
      monthlyFlowYear={dashboard.monthlyFlowYear}
      setMonthlyFlowYear={dashboard.setMonthlyFlowYear}
      typeFilter={dashboard.typeFilter}
      setTypeFilter={dashboard.setTypeFilter}
      transactionTypeOptions={dashboard.transactionTypeOptions}
      filteredRecords={dashboard.filteredRecords}
      onViewRecords={onViewRecords}
      onNavigate={onNavigate}
      load={dashboard.load}
    />
  )
}
