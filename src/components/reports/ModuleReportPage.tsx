import { useCallback, useEffect, useState } from 'react'

import {
  loadModuleReport,
  MODULE_CONFIG,
  type ModuleReportData,
  type ModuleReportKind
} from './moduleReportData'
import ReportToolbar from './ReportToolbar'
import { getSettings, isConfigured } from '../../services/settings'
import { requireAuth, requireSpreadsheetId } from '../../utils/authGuard'
import { formatMoney } from '../../utils/formatMoney'
import { handleSheetError } from '../../utils/sheetError'
import { distributionSparkline } from '../../utils/sparklineData'
import { showError, showSuccess } from '../../utils/toast'
import AppIcon from '../AppIcon'
import ConfirmActionModal from '../ConfirmActionModal'
import { InstallmentCardListSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import TransactionListItem from '../TransactionListItem'
import Button from '../ui/Button'
import Card from '../ui/Card'

export type { ModuleReportKind } from './moduleReportData'

export default function ModuleReportPage({ kind }: { kind: ModuleReportKind }) {
  const config = MODULE_CONFIG[kind]

  const [data, setData] = useState<ModuleReportData | null>(null)

  const [loading, setLoading] = useState(false)

  const [exporting, setExporting] = useState(false)

  const [showExportConfirm, setShowExportConfirm] = useState(false)

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
      await config.exportPdf(spreadsheetId)
      showSuccess('فایل PDF ایجاد شد')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در خروجی PDF')
    } finally {
      setExporting(false)
      setShowExportConfirm(false)
    }
  }

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  if (loading && !data) {
    return <InstallmentCardListSkeleton count={3} />
  }

  return (
    <div className="dashboard-page report-page">
      <ReportToolbar
        title={config.title}
        preset="month-to-date"
        customRange={{ start: '', end: '' }}
        onFilterChange={() => {}}
        onRefresh={load}
        loading={loading}
        showDateFilter={false}
      />

      <Card className="report-export-card">
        <div className="report-export-card-body">
          <span className="report-export-icon">
            <AppIcon name={config.icon} size={22} />
          </span>
          <div>
            <div className="report-export-title">خروجی PDF</div>
            <div className="report-export-hint">دانلود گزارش کامل این بخش</div>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShowExportConfirm(true)}
          disabled={exporting}
        >
          <AppIcon name="pdf" size={16} />
          PDF
        </Button>
      </Card>

      <StatCard
        label="مجموع"
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

      <Card>
        {!data?.rows.length ? (
          <p className="empty-text">موردی برای نمایش وجود ندارد</p>
        ) : (
          data.rows.map((row, index) => (
            <TransactionListItem key={row.id} title={row.title} meta={row.subtitle} index={index}>
              <span className="asset-value" dir="ltr">
                {formatMoney(row.amount)}
              </span>
            </TransactionListItem>
          ))
        )}
      </Card>

      <ConfirmActionModal
        open={showExportConfirm}
        title="تأیید خروجی PDF"
        message="آیا از گرفتن خروجی PDF اطمینان دارید؟"
        confirmLabel="خروجی PDF"
        confirming={exporting}
        onConfirm={handleExportPdf}
        onClose={() => setShowExportConfirm(false)}
      />
    </div>
  )
}
