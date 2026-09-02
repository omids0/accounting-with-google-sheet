import { useCallback, useEffect, useState } from 'react'

import ReportToolbar from './ReportToolbar'
import { isTokenValid } from '../../services/auth'
import type { MonthlyOpeningBalance } from '../../services/monthlyBalance'
import { loadOpeningBalancesReport } from '../../services/reports'
import { getSettings, isConfigured } from '../../services/settings'
import { formatJalaliMonthLabel } from '../../utils/dateRange'
import { formatMoney } from '../../utils/formatMoney'
import { cumulativeSparkline } from '../../utils/sparklineData'
import { showError } from '../../utils/toast'
import { InstallmentCardListSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import TransactionListItem from '../TransactionListItem'

export default function OpeningBalanceReportPage({ onReauth }: { onReauth?: () => void }) {
  const [items, setItems] = useState<MonthlyOpeningBalance[]>([])

  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.()

      return
    }

    const settings = getSettings()

    if (!settings?.spreadsheetId) return

    setLoading(true)
    try {
      const balances = await loadOpeningBalancesReport(settings.spreadsheetId)

      setItems(balances)
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
  }, [onReauth])

  useEffect(() => {
    load()
  }, [load])

  const latestAmount = items.length ? items[items.length - 1].amount : 0

  const balanceSparkline = cumulativeSparkline(items.map(item => item.amount))

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  if (loading && !items.length) {
    return <InstallmentCardListSkeleton count={3} />
  }

  return (
    <div className="dashboard-page report-page">
      <ReportToolbar
        title="موجودی اول دوره"
        preset="month-to-date"
        customRange={{ start: '', end: '' }}
        onFilterChange={() => {}}
        onRefresh={load}
        loading={loading}
        showDateFilter={false}
        subtitle="تاریخچه موجودی ماهانه"
      />

      {!!items.length && (
        <StatCard
          label="آخرین موجودی اول دوره"
          amount={latestAmount}
          variant="balance"
          wide
          sparklineData={balanceSparkline}
          animateIndex={0}
        />
      )}

      <div className="card">
        {!items.length ? (
          <p className="empty-text">موجودی اول دوره‌ای ثبت نشده</p>
        ) : (
          items.map((item, index) => (
            <TransactionListItem
              key={item.monthKey}
              title={formatJalaliMonthLabel(item.monthKey)}
              meta={item.note || undefined}
              index={index}
            >
              <span className="asset-value" dir="ltr">
                {formatMoney(item.amount)}
              </span>
            </TransactionListItem>
          ))
        )}
      </div>
    </div>
  )
}
