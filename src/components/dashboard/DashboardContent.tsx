import DashboardAnalysisBlock from './DashboardAnalysisBlock'
import DashboardBalanceBlock from './DashboardBalanceBlock'
import DashboardGuideCard from './DashboardGuideCard'
import DashboardHero from './DashboardHero'
import DashboardPeriodRow from './DashboardPeriodRow'
import DashboardRecentBlock from './DashboardRecentBlock'
import DashboardUpcomingBlock from './DashboardUpcomingBlock'
import type { DashboardReminderItem } from '../../services/dashboardReminders'
import type { DashboardData } from '../../types'
import type { RecordsDatePreset } from '../../utils/dateRange'
import type { PeriodDescription } from '../../utils/periodLabel'
import BankSmsPendingBanner from '../bankSms/BankSmsPendingBanner'
import DateRangeFilter, { createDefaultDateRangeFilter } from '../DateRangeFilter'
import FilterModal from '../FilterModal'
import { dashboardCalmPageClass } from '../ui/dashboardCalmStyles'

export interface DashboardFilterControls {
  open: boolean
  setOpen: (open: boolean) => void
  draftPreset: RecordsDatePreset
  setDraftPreset: (preset: RecordsDatePreset) => void
  draftRange: { start: string; end: string }
  setDraftRange: (range: { start: string; end: string }) => void
  apply: () => void
}

export interface DashboardNavigation {
  onOpenFilter: () => void
  onConfigureNetAvailable: () => void
  onViewDueDates: () => void
  onViewRecords: () => void
  onOpenCharts: () => void
  onViewBreakdown: () => void
  onShowPreviousMonth: () => void
}

interface DashboardContentProps {
  data: DashboardData
  loading: boolean
  period: PeriodDescription
  upcomingReminders: DashboardReminderItem[]
  filter: DashboardFilterControls
  nav: DashboardNavigation
}

/**
 * Round 5 dashboard, top to bottom: guide/discovery row, period row, hero, then
 * four flat blocks. Each block is self-contained so a wider layout can grid them.
 */
export default function DashboardContent({
  data,
  loading,
  period,
  upcomingReminders,
  filter,
  nav
}: DashboardContentProps) {
  return (
    <div className={dashboardCalmPageClass}>
      <BankSmsPendingBanner />
      <DashboardGuideCard />
      <DashboardPeriodRow label={period.label} onOpen={nav.onOpenFilter} />

      <FilterModal
        open={filter.open}
        onClose={() => filter.setOpen(false)}
        onApply={filter.apply}
        onClear={() => {
          const defaults = createDefaultDateRangeFilter()

          filter.setDraftPreset(defaults.preset as RecordsDatePreset)
          filter.setDraftRange(defaults.customRange)
        }}
      >
        <DateRangeFilter
          preset={filter.draftPreset}
          customRange={filter.draftRange}
          onChange={next => {
            if (next.preset === 'all') return
            filter.setDraftPreset(next.preset)
            filter.setDraftRange(next.customRange)
          }}
          loading={loading}
        />
      </FilterModal>

      <DashboardHero
        netAvailable={data.financial.netAvailable}
        totalIncome={data.totalIncome}
        totalExpense={data.totalExpense}
        periodNoun={period.noun}
        onConfigure={nav.onConfigureNetAvailable}
      />

      <DashboardUpcomingBlock items={upcomingReminders} onViewAll={nav.onViewDueDates} />

      <DashboardRecentBlock
        records={data.recentRecords}
        onViewAll={nav.onViewRecords}
        onShowPreviousMonth={nav.onShowPreviousMonth}
      />

      <DashboardAnalysisBlock
        expenseByCategory={data.expenseByCategory}
        incomeByCategory={data.incomeByCategory}
        onOpenCharts={nav.onOpenCharts}
        periodNoun={period.noun}
      />

      <DashboardBalanceBlock financial={data.financial} onDetails={nav.onViewBreakdown} />
    </div>
  )
}
