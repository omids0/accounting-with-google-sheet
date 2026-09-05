import DashboardBreakdownSection from './DashboardBreakdownSection'
import { RecordAmount } from './DashboardParts'
import type { DashboardData, DashboardNavTarget } from '../../types'
import { cn } from '../../utils/cn'
import type { RecordsDatePreset } from '../../utils/dateRange'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import ActiveFilterChips, { type FilterChip } from '../ActiveFilterChips'
import AnimatedMoneyDisplay from '../AnimatedMoneyDisplay'
import CardEditButton from '../CardEditButton'
import DashboardChartsSection from '../charts/DashboardChartsSection'
import DateRangeFilter, { createDefaultDateRangeFilter } from '../DateRangeFilter'
import FilterModal from '../FilterModal'
import StatCard from '../StatCard'
import TransactionListItem from '../TransactionListItem'
import TransactionTypeSegment from '../TransactionTypeSegment'
import type { TransactionTypeFilter } from './useDashboardPage'
import type { TransactionTypeSegmentOption } from '../TransactionTypeSegment'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  chartTitleClass,
  dashboardFlowSectionAnimatedClass,
  dashboardFlowSectionClass,
  dashboardHeroCardAnimatedClass,
  dashboardHeroCardClass,
  dashboardHeroHeaderClass,
  dashboardHeroHintClass,
  dashboardHeroLabelClass,
  dashboardPageClass,
  dashboardStatGridClass
} from '../ui/chartStyles'
import { emptyTextClass } from '../ui/displayStyles'
import { cardHeaderRowClass, dashboardTransactionSegmentClass } from '../ui/recordsStyles'

interface DashboardContentProps {
  data: DashboardData
  loading: boolean
  filterChips: FilterChip[]
  openFilterModal: () => void
  filterModalOpen: boolean
  setFilterModalOpen: (open: boolean) => void
  draftDatePreset: RecordsDatePreset
  setDraftDatePreset: (preset: RecordsDatePreset) => void
  draftCustomRange: { start: string; end: string }
  setDraftCustomRange: (range: { start: string; end: string }) => void
  setDatePreset: (preset: RecordsDatePreset) => void
  setCustomRange: (range: { start: string; end: string }) => void
  onConfigureNetAvailable?: () => void
  financial?: DashboardData['financial']
  incomeSparkline: number[]
  expenseSparkline: number[]
  netSparkline: number[]
  categoryYAxisWidth: number
  monthlyFlowYear: number
  setMonthlyFlowYear: (year: number) => void
  typeFilter: TransactionTypeFilter
  setTypeFilter: (filter: TransactionTypeFilter) => void
  transactionTypeOptions: TransactionTypeSegmentOption[]
  filteredRecords: DashboardData['recentRecords']
  onViewRecords?: (formType?: 'income' | 'expense') => void
  onNavigate?: (target: DashboardNavTarget) => void
  load: () => void
}

export default function DashboardContent({
  data,
  loading,
  filterChips,
  openFilterModal,
  filterModalOpen,
  setFilterModalOpen,
  draftDatePreset,
  setDraftDatePreset,
  draftCustomRange,
  setDraftCustomRange,
  setDatePreset,
  setCustomRange,
  onConfigureNetAvailable,
  financial,
  incomeSparkline,
  expenseSparkline,
  netSparkline,
  categoryYAxisWidth,
  monthlyFlowYear,
  setMonthlyFlowYear,
  typeFilter,
  setTypeFilter,
  transactionTypeOptions,
  filteredRecords,
  onViewRecords,
  onNavigate,
  load
}: DashboardContentProps) {
  return (
    <div className={dashboardPageClass}>
      <ActiveFilterChips chips={filterChips} onChipClick={openFilterModal} />

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApply={() => {
          setDatePreset(draftDatePreset)
          setCustomRange(draftCustomRange)
          setFilterModalOpen(false)
        }}
        onClear={() => {
          const defaults = createDefaultDateRangeFilter()

          setDraftDatePreset(defaults.preset as RecordsDatePreset)
          setDraftCustomRange(defaults.customRange)
        }}
      >
        <DateRangeFilter
          preset={draftDatePreset}
          customRange={draftCustomRange}
          onChange={filter => {
            if (filter.preset === 'all') return
            setDraftDatePreset(filter.preset)
            setDraftCustomRange(filter.customRange)
          }}
          loading={loading}
        />
      </FilterModal>

      <Card className={cn(dashboardHeroCardClass, dashboardHeroCardAnimatedClass)}>
        <div className={dashboardHeroHeaderClass}>
          <div className={dashboardHeroLabelClass}>دارایی قابل اتکا</div>
          {onConfigureNetAvailable && (
            <CardEditButton onClick={onConfigureNetAvailable} ariaLabel="تنظیم دارایی قابل اتکا" />
          )}
        </div>
        <AnimatedMoneyDisplay amount={financial?.netAvailable ?? 0} size="hero" tone="hero" />
        <p className={dashboardHeroHintClass}>
          مجموع دارایی‌های انتخاب‌شده منهای بدهی‌های انتخاب‌شده
        </p>
      </Card>

      <div className={cn(dashboardFlowSectionClass, dashboardFlowSectionAnimatedClass)}>
        <div className={dashboardStatGridClass}>
          <StatCard
            label="درآمد دوره"
            amount={data?.totalIncome ?? 0}
            variant="income"
            sparklineData={incomeSparkline}
            animateIndex={0}
            lift
          />
          <StatCard
            label="هزینه دوره"
            amount={data?.totalExpense ?? 0}
            variant="expense"
            sparklineData={expenseSparkline}
            animateIndex={1}
            lift
          />
        </div>
        <StatCard
          label="خالص دوره"
          amount={data?.balance ?? 0}
          variant="flow"
          wide
          flowDirection={
            (data?.balance ?? 0) < 0
              ? 'negative'
              : (data?.balance ?? 0) > 0
              ? 'positive'
              : 'neutral'
          }
          sparklineData={netSparkline}
          animateIndex={2}
        />
        <StatCard
          label="مانده محاسبه‌شده"
          amount={data?.periodBalance ?? 0}
          variant="balance"
          wide
          sparklineData={netSparkline}
          animateIndex={3}
        />
      </div>

      <DashboardBreakdownSection financial={financial} onNavigate={onNavigate} />

      {data && (
        <DashboardChartsSection
          expenseByCategory={data.expenseByCategory}
          incomeByCategory={data.incomeByCategory}
          categoryYAxisWidth={categoryYAxisWidth}
          yearlyMonthlyFlow={data.yearlyMonthlyFlow}
          monthlyFlowYear={monthlyFlowYear}
          setMonthlyFlowYear={setMonthlyFlowYear}
          loading={loading}
        />
      )}

      <Card>
        <div className={cardHeaderRowClass}>
          <h3 className={chartTitleClass}>تراکنش‌های دوره</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!!data?.recentRecords.length && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onViewRecords?.(typeFilter === 'all' ? undefined : typeFilter)}
              >
                جزئیات بیشتر
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              ↻
            </Button>
          </div>
        </div>

        <TransactionTypeSegment
          className={dashboardTransactionSegmentClass}
          options={transactionTypeOptions}
          value={typeFilter}
          onChange={id => setTypeFilter(id as TransactionTypeFilter)}
        />

        {!data?.recentRecords.length ? (
          <p className={emptyTextClass}>هنوز تراکنشی در این دوره ثبت نشده</p>
        ) : !filteredRecords.length ? (
          <p className={emptyTextClass}>تراکنشی با این فیلتر یافت نشد</p>
        ) : (
          filteredRecords.map((r, i) => (
            <TransactionListItem
              key={i}
              title={r.title}
              meta={`${r.formName} · ${r.category} · ${formatIsoDatePersian(r.date)}`}
              tone={r.type === 'income' ? 'income' : 'expense'}
              index={i}
            >
              <RecordAmount amount={r.amount} type={r.type} />
            </TransactionListItem>
          ))
        )}
      </Card>
    </div>
  )
}
