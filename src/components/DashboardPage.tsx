import EmptyState from './EmptyState'
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

              headerLabel: `+ ${dashboard.incomeFormName}`,

              icon: <span className={speedDialTypeIconIncomeClass}>+</span>,

              className: speedDialActionIncomeClass,

              onClick: () => useNavigationStore.getState().onOpenEntry('income')
            },

            {
              id: 'expense',

              label: dashboard.expenseFormName,

              headerLabel: `− ${dashboard.expenseFormName}`,

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
    return <EmptyState icon="dashboard" message="ابتدا با گوگل وارد شوید" />
  }

  if (dashboard.loading && !dashboard.data) {
    return <DashboardSkeleton />
  }

  if (!dashboard.data) return null

  const nav = () => useNavigationStore.getState()

  return (
    <DashboardContent
      data={dashboard.data}
      loading={dashboard.loading}
      period={dashboard.period}
      upcomingReminders={dashboard.upcomingReminders}
      filter={dashboard.filter}
      nav={{
        onOpenFilter: dashboard.openFilterModal,
        onConfigureNetAvailable: () => nav().onTabChange('net-available-settings'),
        onViewDueDates: () => nav().onTabChange('report-due-dates'),
        onViewRecords: () => nav().onOpenRecords(),
        onOpenCharts: () => nav().onTabChange('charts'),
        onViewBreakdown: () => nav().onTabChange('report-assets-liabilities'),
        onShowPreviousMonth: dashboard.showPreviousMonth
      }}
    />
  )
}
