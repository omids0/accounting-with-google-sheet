import DashboardActivityBlock from './DashboardActivityBlock'
import DashboardAnalysisBlock from './DashboardAnalysisBlock'
import DashboardBalanceBlock from './DashboardBalanceBlock'
import DashboardGoalCongratsCard from './DashboardGoalCongratsCard'
import DashboardGuideCard from './DashboardGuideCard'
import DashboardHero from './DashboardHero'
import DashboardPeriodRow from './DashboardPeriodRow'
import DashboardRecentBlock from './DashboardRecentBlock'
import DashboardRecurringCard from './DashboardRecurringCard'
import DashboardUpcomingBlock from './DashboardUpcomingBlock'
import DashboardYearReviewCard from './DashboardYearReviewCard'
import type { DashboardReminderItem } from '../../services/dashboardReminders'
import type { DashboardData } from '../../types'
import type { RecordsDatePreset } from '../../utils/dateRange'
import type { PeriodDescription } from '../../utils/periodLabel'
import BankSmsPendingBanner from '../bankSms/BankSmsPendingBanner'
import DateRangeFilter, { createDefaultDateRangeFilter } from '../DateRangeFilter'
import FilterModal from '../FilterModal'
import {
  dashboardCalmPageClass,
  dashboardCellClass,
  dashboardGridClass
} from '../ui/dashboardCalmStyles'

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
 * four flat blocks — one column on phones, a grid from tablet up (the period row
 * moves into the header on desktop).
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
      <DashboardYearReviewCard />
      <BankSmsPendingBanner />
      <DashboardGoalCongratsCard />
      <DashboardRecurringCard />
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

      <div className={dashboardGridClass}>
        <DashboardHero
          className={dashboardCellClass.hero}
          netAvailable={data.financial.netAvailable}
          totalIncome={data.totalIncome}
          totalExpense={data.totalExpense}
          periodNoun={period.noun}
          onConfigure={nav.onConfigureNetAvailable}
          previousMonth={period.kind === 'month' ? data.previousMonth : undefined}
        />

        <DashboardUpcomingBlock
          className={dashboardCellClass.upcoming}
          items={upcomingReminders}
          onViewAll={nav.onViewDueDates}
        />

        <DashboardRecentBlock
          className={dashboardCellClass.recent}
          records={data.recentRecords}
          onViewAll={nav.onViewRecords}
          onShowPreviousMonth={nav.onShowPreviousMonth}
        />

        <DashboardActivityBlock className={dashboardCellClass.activity} />

        <DashboardAnalysisBlock
          className={dashboardCellClass.analysis}
          expenseByCategory={data.expenseByCategory}
          incomeByCategory={data.incomeByCategory}
          previousMonth={data.previousMonth}
          isMonth={period.kind === 'month'}
          onOpenCharts={nav.onOpenCharts}
          periodNoun={period.noun}
        />

        <DashboardBalanceBlock
          className={dashboardCellClass.balance}
          financial={data.financial}
          onDetails={nav.onViewBreakdown}
        />
      </div>
    </div>
  )
}
