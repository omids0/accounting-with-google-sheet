import { useCallback, useEffect, useState } from 'react'

import ReportToolbar, { useReportDateFilter } from './ReportToolbar'
import { loadDashboardData } from '../../services/dashboard'
import { getSettings, isConfigured } from '../../services/settings'
import type { MonthlyFlow } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import { cn } from '../../utils/cn'
import { getInstallmentDueRange, type DateRangePreset } from '../../utils/dateRange'
import { formatMoney } from '../../utils/formatMoney'
import { handleSheetError } from '../../utils/sheetError'
import { monthlySparkline } from '../../utils/sparklineData'
import MonthlyFlowChartSection from '../charts/MonthlyFlowChartSection'
import { DashboardSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import Card from '../ui/Card'
import { chartTitleClass, dashboardPageClass, dashboardStatGridClass } from '../ui/chartStyles'
import { emptyStateClass } from '../ui/displayStyles'
import { cardHeaderRowClass } from '../ui/recordsStyles'
import {
  reportPageClass,
  reportTableLabelClass,
  reportTableRowClass,
  reportTableValuesClass,
  reportValueExpenseClass,
  reportValueIncomeClass,
  reportValueNegativeClass,
  reportValuePositiveClass
} from '../ui/toolsPageStyles'
import YearFilter, { getDefaultChartYear } from '../YearFilter'

export default function CashFlowReportPage() {
  const [monthlyFlow, setMonthlyFlow] = useState<MonthlyFlow[]>([])

  const [loading, setLoading] = useState(false)

  const [monthlyFlowYear, setMonthlyFlowYear] = useState(getDefaultChartYear)

  const { datePreset, customRange, handleDateFilterChange, dateRange } = useReportDateFilter()

  const load = useCallback(async () => {
    if (!isConfigured() || !requireAuth()) return

    const settings = getSettings()

    if (!settings) return

    setLoading(true)
    try {
      const installmentRange =
        datePreset === 'custom' ? dateRange : getInstallmentDueRange(datePreset as DateRangePreset)

      const dash = await loadDashboardData(settings, dateRange, installmentRange, monthlyFlowYear)

      setMonthlyFlow(dash.yearlyMonthlyFlow)
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری' })) return
    } finally {
      setLoading(false)
    }
  }, [datePreset, customRange.start, customRange.end, monthlyFlowYear])

  useEffect(() => {
    load()
  }, [load])

  const totals = monthlyFlow.reduce(
    (acc, item) => ({
      income: acc.income + item.income,
      expense: acc.expense + item.expense,
      net: acc.net + item.net
    }),
    { income: 0, expense: 0, net: 0 }
  )

  const incomeSparkline = monthlySparkline(monthlyFlow, 'income')

  const expenseSparkline = monthlySparkline(monthlyFlow, 'expense')

  const netSparkline = monthlySparkline(monthlyFlow, 'net')

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  if (loading && !monthlyFlow.length) {
    return <DashboardSkeleton variant="report" />
  }

  return (
    <div className={cn(dashboardPageClass, reportPageClass)}>
      <ReportToolbar
        title="جریان نقدی"
        preset={datePreset}
        customRange={customRange}
        onFilterChange={handleDateFilterChange}
        onRefresh={load}
        loading={loading}
        showDateFilter={false}
        subtitle={`سال ${monthlyFlowYear.toLocaleString('fa-IR')}`}
      />

      <div className={dashboardStatGridClass}>
        <StatCard
          label="کل درآمد سال"
          amount={totals.income}
          variant="income"
          sparklineData={incomeSparkline}
          animateIndex={0}
          lift
        />
        <StatCard
          label="کل هزینه سال"
          amount={totals.expense}
          variant="expense"
          sparklineData={expenseSparkline}
          animateIndex={1}
          lift
        />
      </div>

      <StatCard
        label="خالص سال"
        amount={totals.net}
        variant="flow"
        wide
        flowDirection={totals.net < 0 ? 'negative' : totals.net > 0 ? 'positive' : 'neutral'}
        sparklineData={netSparkline}
        animateIndex={2}
      />

      <MonthlyFlowChartSection
        data={monthlyFlow}
        header={
          <YearFilter year={monthlyFlowYear} onChange={setMonthlyFlowYear} loading={loading}>
            {({ trigger, panel }) => (
              <>
                <div className={cardHeaderRowClass}>
                  <h3 className={chartTitleClass}>درآمد و هزینه ماهانه</h3>
                  {trigger}
                </div>
                {panel}
              </>
            )}
          </YearFilter>
        }
      />

      {!!monthlyFlow.length && (
        <Card>
          <h3 className={chartTitleClass}>جدول ماهانه</h3>
          {monthlyFlow.map((item, index) => (
            <div
              key={item.monthKey}
              className={reportTableRowClass}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <span className={reportTableLabelClass}>{item.label}</span>
              <span className={reportTableValuesClass} dir="ltr">
                <span className={reportValueIncomeClass}>{formatMoney(item.income)}</span>
                <span className={reportValueExpenseClass}>{formatMoney(item.expense)}</span>
                <span
                  className={
                    item.net < 0
                      ? reportValueNegativeClass
                      : item.net > 0
                      ? reportValuePositiveClass
                      : ''
                  }
                >
                  {formatMoney(item.net)}
                </span>
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
