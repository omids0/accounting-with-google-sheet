import { useCallback, useEffect, useState } from 'react'

import ReportToolbar from './ReportToolbar'
import { isTokenValid } from '../../services/auth'
import { exportChecksPdf, fetchChecks, totalUnpaidChecksInRange } from '../../services/checks'
import { exportDangsPdf, fetchDangs, unpaidDangTotal } from '../../services/dang'
import {
  exportInstallmentsPdf,
  fetchInstallmentPlans,
  totalUnpaidInstallments
} from '../../services/installments'
import {
  exportReceivablesPdf,
  fetchReceivables,
  remainingAmount,
  paidAmount
} from '../../services/receivables'
import { getSettings, isConfigured } from '../../services/settings'
import { getCachedTgjuPrices } from '../../services/tgju'
import { exportTreasuryPdf, computeHoldings, fetchVaultTransactions } from '../../services/treasury'
import { exportWalletAccountsPdf, fetchWalletAccounts } from '../../services/wallet'
import { getDateRange } from '../../utils/dateRange'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { distributionSparkline } from '../../utils/sparklineData'
import { showError, showSuccess } from '../../utils/toast'
import AppIcon from '../AppIcon'
import type { AppIconName } from '../AppIcon'
import ConfirmActionModal from '../ConfirmActionModal'
import { InstallmentCardListSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import TransactionListItem from '../TransactionListItem'

export type ModuleReportKind =
  | 'wallet'
  | 'treasury'
  | 'receivables'
  | 'dang'
  | 'installments'
  | 'checks'

interface ModuleConfig {
  title: string
  icon: AppIconName
  exportPdf: (spreadsheetId: string) => Promise<void>
}

const MODULE_CONFIG: Record<ModuleReportKind, ModuleConfig> = {
  wallet: { title: 'گزارش کیف پول', icon: 'wallet', exportPdf: exportWalletAccountsPdf },
  treasury: { title: 'گزارش صندوقچه', icon: 'treasury', exportPdf: exportTreasuryPdf },
  receivables: { title: 'گزارش طلب‌ها', icon: 'receivables', exportPdf: exportReceivablesPdf },
  dang: { title: 'گزارش بدهی‌ها', icon: 'debt', exportPdf: exportDangsPdf },
  installments: { title: 'گزارش اقساط', icon: 'installments', exportPdf: exportInstallmentsPdf },
  checks: { title: 'گزارش چک‌ها', icon: 'checks', exportPdf: exportChecksPdf }
}

interface ReportRow {
  id: string
  title: string
  subtitle: string
  amount: number
}

interface ModuleReportData {
  total: number
  secondaryTotal?: number
  secondaryLabel?: string
  rows: ReportRow[]
}

async function loadModuleReport(
  spreadsheetId: string,
  kind: ModuleReportKind
): Promise<ModuleReportData> {
  switch (kind) {
    case 'wallet': {
      const accounts = await fetchWalletAccounts(spreadsheetId)

      const total = accounts.reduce((sum, account) => sum + account.balance, 0)

      return {
        total,
        rows: accounts.map(account => ({
          id: account.id,
          title: account.title,
          subtitle: account.note || '—',
          amount: account.balance
        }))
      }
    }

    case 'treasury': {
      const prices = getCachedTgjuPrices()

      const transactions = prices ? await fetchVaultTransactions(spreadsheetId) : []

      const holdings = prices ? computeHoldings(transactions, prices) : []

      const total = holdings.reduce((sum, holding) => sum + holding.totalValue, 0)

      return {
        total,
        rows: holdings.map(holding => ({
          id: holding.assetType,
          title: holding.assetType,
          subtitle: `موجودی: ${holding.netQuantity}`,
          amount: holding.totalValue
        }))
      }
    }

    case 'receivables': {
      const items = await fetchReceivables(spreadsheetId)

      const total = items.reduce((sum, item) => sum + remainingAmount(item), 0)

      const paid = items.reduce((sum, item) => sum + paidAmount(item), 0)

      return {
        total,
        secondaryTotal: paid,
        secondaryLabel: 'تسویه‌شده',
        rows: items.map(item => ({
          id: item.id,
          title: item.debtor,
          subtitle: `${item.category} · ${formatIsoDatePersian(item.borrowDate)}`,
          amount: remainingAmount(item)
        }))
      }
    }

    case 'dang': {
      const items = await fetchDangs(spreadsheetId)

      const total = unpaidDangTotal(items)

      return {
        total,
        rows: items
          .filter(item => !item.paid)
          .map(item => ({
            id: item.id,
            title: item.title,
            subtitle: `${item.counterparty} · ${formatIsoDatePersian(item.date)}`,
            amount: item.amount
          }))
      }
    }

    case 'installments': {
      const plans = await fetchInstallmentPlans(spreadsheetId)

      const range = getDateRange('year-to-date')

      const total = totalUnpaidInstallments(plans, range)

      return {
        total,
        rows: plans.flatMap(plan =>
          plan.payments
            .filter(payment => !payment.paid)
            .map(payment => ({
              id: `${plan.id}-${payment.n}`,
              title: plan.title,
              subtitle: `قسط ${payment.n} · ${formatIsoDatePersian(payment.dueDate)}`,
              amount: payment.amount ?? plan.amount
            }))
        )
      }
    }

    case 'checks': {
      const items = await fetchChecks(spreadsheetId)

      const range = getDateRange('year-to-date')

      const total = totalUnpaidChecksInRange(items, range)

      return {
        total,
        rows: items
          .filter(item => !item.paid)
          .map(item => ({
            id: item.id,
            title: item.counterparty || item.checkNumber,
            subtitle: `سررسید ${formatIsoDatePersian(item.dueDate)}`,
            amount: item.amount
          }))
      }
    }
  }
}

export default function ModuleReportPage({
  kind,
  onReauth
}: {
  kind: ModuleReportKind
  onReauth?: () => void
}) {
  const config = MODULE_CONFIG[kind]

  const [data, setData] = useState<ModuleReportData | null>(null)

  const [loading, setLoading] = useState(false)

  const [exporting, setExporting] = useState(false)

  const [showExportConfirm, setShowExportConfirm] = useState(false)

  const load = useCallback(async () => {
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.()

      return
    }

    const settings = getSettings()

    if (!settings?.spreadsheetId) return

    setLoading(true)
    try {
      const report = await loadModuleReport(settings.spreadsheetId, kind)

      setData(report)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری'

      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.()

        return
      }
      showError(msg)
    } finally {
      setLoading(false)
    }
  }, [kind, onReauth])

  useEffect(() => {
    load()
  }, [load])

  const handleExportPdf = async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.()

      return
    }

    setExporting(true)
    try {
      await config.exportPdf(settings.spreadsheetId)
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

      <div className="card report-export-card">
        <div className="report-export-card-body">
          <span className="report-export-icon">
            <AppIcon name={config.icon} size={22} />
          </span>
          <div>
            <div className="report-export-title">خروجی PDF</div>
            <div className="report-export-hint">دانلود گزارش کامل این بخش</div>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setShowExportConfirm(true)}
          disabled={exporting}
        >
          <AppIcon name="pdf" size={16} />
          PDF
        </button>
      </div>

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

      <div className="card">
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
      </div>

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
