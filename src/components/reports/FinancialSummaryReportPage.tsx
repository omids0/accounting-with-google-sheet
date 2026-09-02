import { useCallback, useEffect, useState } from 'react'

import ReportToolbar, { useReportDateFilter } from './ReportToolbar'
import { isTokenValid } from '../../services/auth'
import { loadDashboardData } from '../../services/dashboard'
import { getSettings, getNetAvailableConfig, isConfigured } from '../../services/settings'
import type { DashboardData } from '../../types'
import { getInstallmentDueRange, type DateRangePreset } from '../../utils/dateRange'
import { formatMoney } from '../../utils/formatMoney'
import { handleSheetError } from '../../utils/sheetError'
import { monthlySparkline } from '../../utils/sparklineData'
import AnimatedMoneyDisplay from '../AnimatedMoneyDisplay'
import { DashboardSkeleton } from '../skeleton'
import StatCard from '../StatCard'

function BreakdownRow({ label, value, total }: { label: string; value: number; total?: boolean }) {
  return (
    <div className={`asset-row report-table-row${total ? ' asset-row-total' : ''}`}>
      <span className="asset-label">{label}</span>
      <span className="asset-value" dir="ltr">
        {formatMoney(value)}
      </span>
    </div>
  )
}

export default function FinancialSummaryReportPage({ onReauth }: { onReauth?: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null)

  const [loading, setLoading] = useState(false)

  const { datePreset, customRange, handleDateFilterChange, dateRange } = useReportDateFilter()

  const load = useCallback(async () => {
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.()

      return
    }

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
      if (handleSheetError(err, { onReauth, fallbackMessage: 'خطا در بارگذاری' })) return
    } finally {
      setLoading(false)
    }
  }, [onReauth, datePreset, customRange.start, customRange.end])

  useEffect(() => {
    load()
  }, [load])

  if (!isConfigured()) {
    return (
      <div className="empty-state">
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
    <div className="dashboard-page report-page">
      <ReportToolbar
        title="خلاصه مالی"
        preset={datePreset}
        customRange={customRange}
        onFilterChange={handleDateFilterChange}
        onRefresh={load}
        loading={loading}
      />

      <div className="card dashboard-hero-card dashboard-hero-card--animated">
        <div className="dashboard-hero-label">دارایی قابل اتکا</div>
        <AnimatedMoneyDisplay amount={financial?.netAvailable ?? 0} size="hero" tone="hero" />
      </div>

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
          (data?.balance ?? 0) < 0 ? 'negative' : (data?.balance ?? 0) > 0 ? 'positive' : 'neutral'
        }
        sparklineData={netSparkline}
        animateIndex={2}
      />

      <div className="card dashboard-assets-card">
        <h3 className="chart-title">مطابقت حساب</h3>
        <div className="asset-breakdown">
          <BreakdownRow label="موجودی اول دوره" value={data?.openingBalance ?? 0} />
          <BreakdownRow label="درآمد دوره" value={data?.totalIncome ?? 0} />
          <BreakdownRow label="هزینه دوره" value={-(data?.totalExpense ?? 0)} />
          <BreakdownRow label="مانده محاسبه‌شده" value={data?.periodBalance ?? 0} />
          <BreakdownRow label="موجودی کیف پول" value={financial?.walletTotal ?? 0} />
          <BreakdownRow label="تفاوت مطابقت" value={reconciliationDiff} total />
        </div>
        {hasReconciliationGap ? (
          <p className="report-hint report-hint-warning">
            تفاوت بین مانده محاسبه‌شده و موجودی کیف پول: {formatMoney(reconciliationDiff)}
          </p>
        ) : (
          <p className="report-hint">مانده محاسبه‌شده با موجودی کیف پول مطابقت دارد.</p>
        )}
      </div>
    </div>
  )
}
