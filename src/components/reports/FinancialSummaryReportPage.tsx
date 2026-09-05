import { useCallback, useEffect, useState } from 'react'

import ReportToolbar, { useReportDateFilter } from './ReportToolbar'
import { loadDashboardData } from '../../services/dashboard'
import { getSettings, getNetAvailableConfig, isConfigured } from '../../services/settings'
import type { DashboardData } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import { cn } from '../../utils/cn'
import { getInstallmentDueRange, type DateRangePreset } from '../../utils/dateRange'
import { formatMoney } from '../../utils/formatMoney'
import { handleSheetError } from '../../utils/sheetError'
import { monthlySparkline } from '../../utils/sparklineData'
import AnimatedMoneyDisplay from '../AnimatedMoneyDisplay'
import { DashboardSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import Card from '../ui/Card'
import {
  assetBreakdownClass,
  assetLabelClass,
  assetRowClass,
  assetRowTotalClass,
  assetValueClass,
  chartTitleClass,
  dashboardAssetsCardClass,
  dashboardHeroCardAnimatedClass,
  dashboardHeroCardClass,
  dashboardHeroLabelClass,
  dashboardPageClass,
  dashboardStatGridClass
} from '../ui/chartStyles'
import { emptyStateClass } from '../ui/displayStyles'
import {
  reportHintClass,
  reportHintWarningClass,
  reportPageClass,
  reportTableRowClass
} from '../ui/toolsPageStyles'

function BreakdownRow({ label, value, total }: { label: string; value: number; total?: boolean }) {
  return (
    <div className={cn(assetRowClass, reportTableRowClass, total && assetRowTotalClass)}>
      <span className={assetLabelClass}>{label}</span>
      <span className={assetValueClass} dir="ltr">
        {formatMoney(value)}
      </span>
    </div>
  )
}

export default function FinancialSummaryReportPage() {
  const [data, setData] = useState<DashboardData | null>(null)

  const [loading, setLoading] = useState(false)

  const { datePreset, customRange, handleDateFilterChange, dateRange } = useReportDateFilter()

  const load = useCallback(async () => {
    if (!isConfigured() || !requireAuth()) return

    const settings = getSettings()

    if (!settings) return

    setLoading(true)
    try {
      const installmentRange =
        datePreset === 'custom' ? dateRange : getInstallmentDueRange(datePreset as DateRangePreset)

      const dash = await loadDashboardData(
        settings,
        dateRange,
        installmentRange,
        undefined,
        getNetAvailableConfig()
      )

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

  const financial = data?.financial

  const reconciliationDiff = data?.reconciliationDiff ?? 0

  const hasReconciliationGap = Math.abs(reconciliationDiff) > 0

  const incomeSparkline = monthlySparkline(data?.yearlyMonthlyFlow ?? [], 'income')

  const expenseSparkline = monthlySparkline(data?.yearlyMonthlyFlow ?? [], 'expense')

  const netSparkline = monthlySparkline(data?.yearlyMonthlyFlow ?? [], 'net')

  return (
    <div className={cn(dashboardPageClass, reportPageClass)}>
      <ReportToolbar
        title="خلاصه مالی"
        preset={datePreset}
        customRange={customRange}
        onFilterChange={handleDateFilterChange}
        onRefresh={load}
        loading={loading}
      />

      <Card className={cn(dashboardHeroCardClass, dashboardHeroCardAnimatedClass)}>
        <div className={dashboardHeroLabelClass}>دارایی قابل اتکا</div>
        <AnimatedMoneyDisplay amount={financial?.netAvailable ?? 0} size="hero" tone="hero" />
      </Card>

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
          (data?.balance ?? 0) < 0 ? 'negative' : (data?.balance ?? 0) > 0 ? 'positive' : 'neutral'
        }
        sparklineData={netSparkline}
        animateIndex={2}
      />

      <Card className={dashboardAssetsCardClass}>
        <h3 className={chartTitleClass}>مطابقت حساب</h3>
        <div className={assetBreakdownClass}>
          <BreakdownRow label="موجودی اول دوره" value={data?.openingBalance ?? 0} />
          <BreakdownRow label="درآمد دوره" value={data?.totalIncome ?? 0} />
          <BreakdownRow label="هزینه دوره" value={-(data?.totalExpense ?? 0)} />
          <BreakdownRow label="مانده محاسبه‌شده" value={data?.periodBalance ?? 0} />
          <BreakdownRow label="موجودی کیف پول" value={financial?.walletTotal ?? 0} />
          <BreakdownRow label="تفاوت مطابقت" value={reconciliationDiff} total />
        </div>
        {hasReconciliationGap ? (
          <p className={cn(reportHintClass, reportHintWarningClass)}>
            تفاوت بین مانده محاسبه‌شده و موجودی کیف پول: {formatMoney(reconciliationDiff)}
          </p>
        ) : (
          <p className={reportHintClass}>مانده محاسبه‌شده با موجودی کیف پول مطابقت دارد.</p>
        )}
      </Card>
    </div>
  )
}
