import { useCallback, useEffect, useMemo, useState } from 'react'

import ReportToolbar, { useReportDateFilter } from './ReportToolbar'
import { loadDashboardData } from '../../services/dashboard'
import { getSettings, isConfigured } from '../../services/settings'
import type { DashboardData } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import { cn } from '../../utils/cn'
import { getInstallmentDueRange, type DateRangePreset } from '../../utils/dateRange'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { handleSheetError } from '../../utils/sheetError'
import { monthlySparkline } from '../../utils/sparklineData'
import { getCategoryBarYAxisWidth } from '../charts/chartUtils'
import ReportCategoryChartsSection from '../charts/ReportCategoryChartsSection'
import MoneyDisplay from '../MoneyDisplay'
import { DashboardSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import TransactionListItem from '../TransactionListItem'
import TransactionTypeSegment, {
  type TransactionTypeSegmentOption
} from '../TransactionTypeSegment'
import Card from '../ui/Card'
import { chartTitleClass, dashboardPageClass, dashboardStatGridClass } from '../ui/chartStyles'
import { emptyStateClass, emptyTextClass } from '../ui/displayStyles'
import { dashboardTransactionSegmentClass } from '../ui/recordsStyles'
import { reportPageClass } from '../ui/toolsPageStyles'

type TransactionTypeFilter = 'all' | 'income' | 'expense'

export default function IncomeExpenseReportPage() {
  const [data, setData] = useState<DashboardData | null>(null)

  const [loading, setLoading] = useState(false)

  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all')

  const { datePreset, customRange, handleDateFilterChange, dateRange } = useReportDateFilter()

  const load = useCallback(async () => {
    if (!isConfigured() || !requireAuth()) return

    const settings = getSettings()

    if (!settings) return

    setLoading(true)
    try {
      const installmentRange =
        datePreset === 'custom' ? dateRange : getInstallmentDueRange(datePreset as DateRangePreset)

      const dash = await loadDashboardData(settings, dateRange, installmentRange)

      setData(dash)
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری' })) return
    } finally {
      setLoading(false)
    }
  }, [datePreset, customRange.start, customRange.end])

  useEffect(() => {
    load()
  }, [load])

  const settings = getSettings()

  const incomeForm = settings?.forms.find(f => f.type === 'income')

  const expenseForm = settings?.forms.find(f => f.type === 'expense')

  const transactionTypeOptions: TransactionTypeSegmentOption[] = [
    { id: 'all', label: 'همه' },
    { id: 'income', label: incomeForm?.name ?? 'درآمد', tone: 'income' },
    { id: 'expense', label: expenseForm?.name ?? 'هزینه', tone: 'expense' }
  ]

  const filteredRecords = useMemo(() => {
    if (!data?.recentRecords.length) return []

    return data.recentRecords.filter(r => typeFilter === 'all' || r.type === typeFilter)
  }, [data?.recentRecords, typeFilter])

  const categoryYAxisWidth = useMemo(
    () => getCategoryBarYAxisWidth([data?.expenseByCategory ?? [], data?.incomeByCategory ?? []]),
    [data?.expenseByCategory, data?.incomeByCategory]
  )

  const incomeSparkline = monthlySparkline(data?.yearlyMonthlyFlow ?? [], 'income')

  const expenseSparkline = monthlySparkline(data?.yearlyMonthlyFlow ?? [], 'expense')

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  if (loading && !data) {
    return <DashboardSkeleton variant="report" />
  }

  return (
    <div className={cn(dashboardPageClass, reportPageClass)}>
      <ReportToolbar
        title="درآمد و هزینه"
        preset={datePreset}
        customRange={customRange}
        onFilterChange={handleDateFilterChange}
        onRefresh={load}
        loading={loading}
      />

      <div className={dashboardStatGridClass}>
        <StatCard
          label="درآمد"
          amount={data?.totalIncome ?? 0}
          variant="income"
          sparklineData={incomeSparkline}
          animateIndex={0}
          lift
        />
        <StatCard
          label="هزینه"
          amount={data?.totalExpense ?? 0}
          variant="expense"
          sparklineData={expenseSparkline}
          animateIndex={1}
          lift
        />
      </div>

      <ReportCategoryChartsSection
        expenseByCategory={data?.expenseByCategory ?? []}
        incomeByCategory={data?.incomeByCategory ?? []}
        categoryYAxisWidth={categoryYAxisWidth}
      />

      <Card>
        <h3 className={chartTitleClass}>تراکنش‌های دوره</h3>
        <TransactionTypeSegment
          className={dashboardTransactionSegmentClass}
          options={transactionTypeOptions}
          value={typeFilter}
          onChange={id => setTypeFilter(id as TransactionTypeFilter)}
        />

        {!filteredRecords.length ? (
          <p className={emptyTextClass}>تراکنشی در این دوره ثبت نشده</p>
        ) : (
          filteredRecords.map((record, index) => (
            <TransactionListItem
              key={`${record.date}-${index}`}
              title={record.title}
              meta={`${record.formName} · ${record.category} · ${formatIsoDatePersian(
                record.date
              )}`}
              tone={record.type === 'income' ? 'income' : 'expense'}
              index={index}
            >
              <MoneyDisplay
                amount={record.amount}
                size="record"
                tone={record.type === 'income' ? 'income' : 'expense'}
                signed
              />
            </TransactionListItem>
          ))
        )}
      </Card>
    </div>
  )
}
