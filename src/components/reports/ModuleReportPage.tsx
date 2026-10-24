import { useCallback, useEffect, useState } from 'react'

import {
  loadModuleReport,
  MODULE_CONFIG,
  type ModuleReportData,
  type ModuleReportKind
} from './moduleReportData'
import { ReportStaticMetaBar } from './ReportDateFilterBar'
import { getSettings, isConfigured } from '../../services/settings'
import { requireAuth, requireSpreadsheetId } from '../../utils/authGuard'
import { cn } from '../../utils/cn'
import { runExport } from '../../utils/exportFeedback'
import { handleSheetError } from '../../utils/sheetError'
import { distributionSparkline } from '../../utils/sparklineData'
import AppIcon from '../AppIcon'
import MoneyText from '../MoneyText'
import { InstallmentCardListSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import TransactionListItem from '../TransactionListItem'
import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'
import { dashboardPageClass } from '../ui/chartStyles'
import { emptyStateClass, emptyTextClass } from '../ui/displayStyles'
import {
  reportExportCardBodyClass,
  reportExportCardClass,
  reportExportHintClass,
  reportExportIconClass,
  reportExportTitleClass,
  reportPageClass
} from '../ui/toolsPageStyles'

export type { ModuleReportKind } from './moduleReportData'

export default function ModuleReportPage({ kind }: { kind: ModuleReportKind }) {
  const config = MODULE_CONFIG[kind]

  const [data, setData] = useState<ModuleReportData | null>(null)

  const [loading, setLoading] = useState(false)

  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    if (!isConfigured() || !requireAuth()) return

    const settings = getSettings()

    if (!settings?.spreadsheetId) return

    setLoading(true)
    try {
      const report = await loadModuleReport(settings.spreadsheetId, kind)

      setData(report)
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری' })) return
    } finally {
      setLoading(false)
    }
  }, [kind])

  useEffect(() => {
    load()
  }, [load])

  const handleExportPdf = async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setExporting(true)
    try {
      await runExport(() => config.exportPdf(spreadsheetId), 'خطا در خروجی PDF')
    } finally {
      setExporting(false)
    }
  }

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  if (loading && !data) {
    return <InstallmentCardListSkeleton count={3} />
  }

  return (
    <div className={cn(dashboardPageClass, reportPageClass)}>
      <ReportStaticMetaBar subtitle="گزارش ماه جاری" onRefresh={load} loading={loading} />

      <Card className={reportExportCardClass}>
        <div className={reportExportCardBodyClass}>
          <span className={reportExportIconClass}>
            <AppIcon name={config.icon} size={22} />
          </span>
          <div>
            <div className={reportExportTitleClass}>خروجی PDF</div>
            <div className={reportExportHintClass}>دانلود گزارش کامل این بخش</div>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void handleExportPdf()}
          disabled={exporting}
          loading={exporting}
        >
          <AppIcon name="pdf" size={16} />
          PDF
        </Button>
      </Card>

      <StatCard
        label={data?.totalLabel ?? 'مجموع'}
        amount={data?.total ?? 0}
        variant="balance"
        wide
        sparklineData={distributionSparkline(data?.rows.map(row => row.amount) ?? [])}
        animateIndex={0}
      />

      {data?.secondaryLabel && data.secondaryTotal != null && (
        <StatCard
          label={data.secondaryLabel}
          amount={data.secondaryTotal}
          variant="income"
          wide
          sparklineData={distributionSparkline(
            data.rows.filter(row => row.amount > 0).map(row => row.amount)
          )}
          animateIndex={1}
        />
      )}

      {data?.stats?.map((stat, index) => (
        <StatCard
          key={stat.id}
          label={stat.label}
          amount={stat.amount}
          variant="flow"
          flowDirection={stat.amount < 0 ? 'negative' : stat.amount > 0 ? 'positive' : 'neutral'}
          wide
          animateIndex={index + 2}
        />
      ))}

      {data?.groups && data.groups.length > 1 && (
        <Card>
          <CardTitle>جمع هر کلاس</CardTitle>
          {data.groups.map((group, index) => (
            <TransactionListItem key={group.id} title={group.label} index={index}>
              <span className="asset-value">
                <MoneyText amount={group.total} />
              </span>
            </TransactionListItem>
          ))}
        </Card>
      )}

      <Card>
        {!data?.rows.length ? (
          <p className={emptyTextClass}>موردی برای نمایش وجود ندارد</p>
        ) : (
          data.rows.map((row, index) => (
            <TransactionListItem key={row.id} title={row.title} meta={row.subtitle} index={index}>
              <span className="asset-value">
                <MoneyText amount={row.amount} />
              </span>
            </TransactionListItem>
          ))
        )}
      </Card>
    </div>
  )
}
