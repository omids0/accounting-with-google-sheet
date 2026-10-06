import { useCallback, useEffect, useState } from 'react'

import ReportDateFilterBar from './ReportDateFilterBar'
import { useReportDateFilter } from './ReportToolbar'
import { loadDashboardData } from '../../services/dashboard'
import { getSettings, getNetAvailableConfig, isConfigured } from '../../services/settings'
import { useNavigationStore } from '../../stores/navigationStore'
import type { DashboardData, NetAvailableConfig } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import { cn } from '../../utils/cn'
import { getInstallmentDueRange, type DateRangePreset } from '../../utils/dateRange'
import { handleSheetError } from '../../utils/sheetError'
import AnimatedMoneyDisplay from '../AnimatedMoneyDisplay'
import DashboardBreakdownSection from '../dashboard/DashboardBreakdownSection'
import { DashboardSkeleton } from '../skeleton'
import Card from '../ui/Card'
import {
  dashboardHeroCardClass,
  dashboardHeroHintClass,
  dashboardHeroLabelClass,
  dashboardPageClass
} from '../ui/chartStyles'
import { emptyStateClass } from '../ui/displayStyles'
import { reportPageClass, reportPageSplitClass } from '../ui/toolsPageStyles'

export default function AssetsLiabilitiesReportPage() {
  const [data, setData] = useState<DashboardData | null>(null)

  const [config, setConfig] = useState<NetAvailableConfig>(() => getNetAvailableConfig())

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

      const netAvailableConfig = getNetAvailableConfig()

      const dash = await loadDashboardData(
        settings,
        dateRange,
        installmentRange,
        undefined,
        netAvailableConfig
      )

      setConfig(netAvailableConfig)
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

  return (
    <div className={cn(dashboardPageClass, reportPageClass)}>
      <ReportDateFilterBar
        preset={datePreset}
        customRange={customRange}
        onFilterChange={handleDateFilterChange}
        onRefresh={load}
        loading={loading}
      />

      <Card className={dashboardHeroCardClass}>
        <div className={dashboardHeroLabelClass}>تراز خالص</div>
        <AnimatedMoneyDisplay amount={financial?.netAvailable ?? 0} size="hero" tone="hero" />
        <p className={dashboardHeroHintClass}>
          دارایی‌ها منهای بدهی‌ها (بر اساس تنظیمات دارایی قابل اتکا)
        </p>
      </Card>

      <div className={reportPageSplitClass}>
        <DashboardBreakdownSection
          financial={financial}
          config={config}
          onConfigure={() => useNavigationStore.getState().onTabChange('net-available-settings')}
        />
      </div>
    </div>
  )
}
