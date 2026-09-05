import AppIcon from './AppIcon'
import { DashboardSkeleton } from './skeleton'
import SpeedDialIcon from './SpeedDialIcon'
import {
  speedDialActionExpenseClass,
  speedDialActionIncomeClass,
  speedDialTypeIconExpenseClass,
  speedDialTypeIconIncomeClass
} from './ui/speedDialStyles'
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial'
import { isConfigured } from '../services/settings'
import { useNavigationStore } from '../stores/navigationStore'
import DashboardContent from './dashboard/DashboardContent'
import { useDashboardPage } from './dashboard/useDashboardPage'
import { emptyStateClass, emptyStateIconClass } from './ui/displayStyles'

export default function DashboardPage({ active = true }: { active?: boolean }) {
  const dashboard = useDashboardPage()

  useRegisterPageSpeedDial(
    isConfigured()
      ? {
          ariaLabel: 'عملیات داشبورد',

          actions: [
            {
              id: 'income',

              label: dashboard.incomeFormName,

              icon: <span className={speedDialTypeIconIncomeClass}>+</span>,

              className: speedDialActionIncomeClass,

              onClick: () => useNavigationStore.getState().onOpenEntry('income')
            },

            {
              id: 'expense',

              label: dashboard.expenseFormName,

              icon: <span className={speedDialTypeIconExpenseClass}>−</span>,

              className: speedDialActionExpenseClass,

              onClick: () => useNavigationStore.getState().onOpenEntry('expense')
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
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
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
      onConfigureNetAvailable={() =>
        useNavigationStore.getState().onTabChange('net-available-settings')
      }
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
      onViewRecords={formType => useNavigationStore.getState().onOpenRecords(formType)}
      onNavigate={target => useNavigationStore.getState().onNavigateDashboard(target)}
      load={dashboard.load}
    />
  )
}
