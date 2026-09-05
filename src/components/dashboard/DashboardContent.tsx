import type { DashboardData, DashboardNavTarget } from '../../types'
import type { RecordsDatePreset } from '../../utils/dateRange'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import ActiveFilterChips, { type FilterChip } from '../ActiveFilterChips'
import AnimatedMoneyDisplay from '../AnimatedMoneyDisplay'
import CardEditButton from '../CardEditButton'
import { CategoryBarChart, CategoryDonutChart, IncomeExpenseMonthlyChart } from '../charts'
import DateRangeFilter, { createDefaultDateRangeFilter } from '../DateRangeFilter'
import FilterModal from '../FilterModal'
import StatCard from '../StatCard'
import TransactionListItem from '../TransactionListItem'
import TransactionTypeSegment from '../TransactionTypeSegment'
import Button from '../ui/Button'
import Card from '../ui/Card'
import YearFilter from '../YearFilter'
import { BreakdownRow, RecordAmount } from './DashboardParts'
import type { TransactionTypeFilter } from './useDashboardPage'
import type { TransactionTypeSegmentOption } from '../TransactionTypeSegment'

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
    <div className="dashboard-page">
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

      <Card className="dashboard-hero-card dashboard-hero-card--animated">
        <div className="dashboard-hero-header">
          <div className="dashboard-hero-label">دارایی قابل اتکا</div>
          {onConfigureNetAvailable && (
            <CardEditButton onClick={onConfigureNetAvailable} ariaLabel="تنظیم دارایی قابل اتکا" />
          )}
        </div>
        <AnimatedMoneyDisplay amount={financial?.netAvailable ?? 0} size="hero" tone="hero" />
        <p className="dashboard-hero-hint">مجموع دارایی‌های انتخاب‌شده منهای بدهی‌های انتخاب‌شده</p>
      </Card>

      <div className="dashboard-flow-section dashboard-flow-section--animated">
        <div className="stat-grid dashboard-stat-grid">
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

      <Card className="dashboard-assets-card">
        <h3 className="chart-title">دارایی‌ها</h3>
        <div className="asset-breakdown">
          <BreakdownRow
            label="کیف پول"
            value={financial?.walletTotal ?? 0}
            onNavigate={onNavigate ? () => onNavigate('wallet') : undefined}
          />
          <BreakdownRow
            label="صندوقچه"
            value={financial?.treasuryTotal ?? 0}
            onNavigate={onNavigate ? () => onNavigate('treasury') : undefined}
          />
          <BreakdownRow
            label="طلب‌ها"
            value={financial?.receivablesTotal ?? 0}
            onNavigate={onNavigate ? () => onNavigate('receivables') : undefined}
          />
          <BreakdownRow label="مجموع دارایی‌ها" value={financial?.totalAssets ?? 0} total />
        </div>
      </Card>

      <Card className="dashboard-assets-card dashboard-liabilities-card">
        <h3 className="chart-title">بدهی‌ها</h3>
        <div className="asset-breakdown">
          <BreakdownRow
            label="اقساط این دوره"
            value={financial?.installmentsDue ?? 0}
            onNavigate={onNavigate ? () => onNavigate('installments') : undefined}
          />
          <BreakdownRow
            label="بدهی‌ها"
            value={financial?.dangsTotal ?? 0}
            onNavigate={onNavigate ? () => onNavigate('dang') : undefined}
          />
          <BreakdownRow
            label="چک‌های این دوره"
            value={financial?.checksDue ?? 0}
            onNavigate={onNavigate ? () => onNavigate('checks') : undefined}
          />
          <BreakdownRow label="مجموع بدهی‌ها" value={financial?.totalLiabilities ?? 0} total />
        </div>
      </Card>

      {(data?.expenseByCategory.length ?? 0) > 0 && (
        <>
          <CategoryDonutChart title="سهم هزینه‌ها" data={data!.expenseByCategory} tone="expense" />
          <CategoryBarChart
            title="هزینه بر اساس دسته‌بندی"
            data={data!.expenseByCategory}
            tone="expense"
            yAxisWidth={categoryYAxisWidth}
          />
        </>
      )}

      {(data?.incomeByCategory.length ?? 0) > 0 && (
        <>
          <CategoryDonutChart title="سهم درآمدها" data={data!.incomeByCategory} tone="income" />
          <CategoryBarChart
            title="درآمد بر اساس دسته‌بندی"
            data={data!.incomeByCategory}
            tone="income"
            yAxisWidth={categoryYAxisWidth}
          />
        </>
      )}

      {data && (
        <IncomeExpenseMonthlyChart
          data={data.yearlyMonthlyFlow}
          header={
            <YearFilter year={monthlyFlowYear} onChange={setMonthlyFlowYear} loading={loading}>
              {({ trigger, panel }) => (
                <>
                  <div className="card-header-row">
                    <h3 className="chart-title">درآمد و هزینه ماهانه</h3>
                    {trigger}
                  </div>
                  {panel}
                </>
              )}
            </YearFilter>
          }
        />
      )}

      <Card>
        <div className="card-header-row">
          <h3 className="chart-title">تراکنش‌های دوره</h3>
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
          className="dashboard-transaction-segment"
          options={transactionTypeOptions}
          value={typeFilter}
          onChange={id => setTypeFilter(id as TransactionTypeFilter)}
        />

        {!data?.recentRecords.length ? (
          <p className="empty-text">هنوز تراکنشی در این دوره ثبت نشده</p>
        ) : !filteredRecords.length ? (
          <p className="empty-text">تراکنشی با این فیلتر یافت نشد</p>
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
