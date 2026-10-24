import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'

import { ReportStaticMetaBar } from './ReportDateFilterBar'
import {
  getDueDateItemLabel,
  loadDueDatesReport,
  type DueDateItem,
  type DueDateStatus
} from '../../services/reports'
import { getSettings, isConfigured } from '../../services/settings'
import { requireAuth } from '../../utils/authGuard'
import { cn } from '../../utils/cn'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { handleSheetError } from '../../utils/sheetError'
import { distributionSparkline } from '../../utils/sparklineData'
import MoneyDisplay from '../MoneyDisplay'
import { InstallmentCardListSkeleton } from '../skeleton'
import StatCard from '../StatCard'
import TransactionListItem from '../TransactionListItem'
import TransactionTypeSegment from '../TransactionTypeSegment'
import { calmSegmentClass } from '../ui/calmListStyles'
import Card from '../ui/Card'
import { chartTitleClass, dashboardPageClass, dashboardStatGridClass } from '../ui/chartStyles'
import { emptyStateClass, emptyTextClass } from '../ui/displayStyles'
import {
  reportDueBadgeClass,
  reportDueItemEndClass,
  reportPageClass,
  reportStatusGroupsClass
} from '../ui/toolsPageStyles'

const STATUS_LABELS: Record<DueDateStatus, string> = {
  overdue: 'سررسید گذشته',
  today: 'امروز',
  upcoming: 'پیش‌رو'
}

const STATUS_ORDER: DueDateStatus[] = ['overdue', 'today', 'upcoming']

const LazyDueCalendarView = lazy(() => import('./dueCalendar/DueCalendarView'))

type DueDatesView = 'list' | 'calendar'

const VIEW_OPTIONS: { id: DueDatesView; label: string }[] = [
  { id: 'list', label: 'فهرست' },
  { id: 'calendar', label: 'تقویم' }
]

function DueDateBadge({ status }: { status: DueDateStatus }) {
  return <span className={reportDueBadgeClass(status)}>{STATUS_LABELS[status]}</span>
}

export default function DueDatesReportPage() {
  const [view, setView] = useState<DueDatesView>('list')

  const [items, setItems] = useState<DueDateItem[]>([])

  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isConfigured() || !requireAuth()) return

    const settings = getSettings()

    if (!settings?.spreadsheetId) return

    setLoading(true)
    try {
      const dueItems = await loadDueDatesReport(settings.spreadsheetId)

      setItems(dueItems)
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری' })) return
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const grouped = useMemo(() => {
    const map = new Map<DueDateStatus, DueDateItem[]>()

    for (const status of STATUS_ORDER) {
      map.set(status, [])
    }
    for (const item of items) {
      map.get(item.status)?.push(item)
    }

    return STATUS_ORDER.map(status => ({
      status,
      items: map.get(status) ?? []
    })).filter(group => group.items.length > 0)
  }, [items])

  // What I have to pay, apart from the received checks that will bring money in.
  const payable = useMemo(() => items.filter(item => !item.incoming), [items])
  const incoming = useMemo(() => items.filter(item => item.incoming), [items])

  const totals = useMemo(
    () => ({
      overdue: payable
        .filter(item => item.status === 'overdue')
        .reduce((sum, item) => sum + item.amount, 0),
      upcoming: payable
        .filter(item => item.status !== 'overdue')
        .reduce((sum, item) => sum + item.amount, 0),
      incoming: incoming.reduce((sum, item) => sum + item.amount, 0)
    }),
    [payable, incoming]
  )

  const overdueSparkline = distributionSparkline(
    payable.filter(item => item.status === 'overdue').map(item => item.amount)
  )

  const upcomingSparkline = distributionSparkline(
    payable.filter(item => item.status !== 'overdue').map(item => item.amount)
  )

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  const viewSegment = (
    <TransactionTypeSegment
      className={calmSegmentClass}
      options={VIEW_OPTIONS}
      value={view}
      onChange={id => setView(id as DueDatesView)}
      ariaLabel="نمای سررسیدها"
    />
  )

  if (view === 'calendar') {
    return (
      <div className={cn(dashboardPageClass, reportPageClass)}>
        {viewSegment}
        <Suspense fallback={<InstallmentCardListSkeleton count={4} />}>
          <LazyDueCalendarView />
        </Suspense>
      </div>
    )
  }

  if (loading && !items.length) {
    return <InstallmentCardListSkeleton count={4} />
  }

  return (
    <div className={cn(dashboardPageClass, reportPageClass)}>
      {viewSegment}
      <ReportStaticMetaBar
        subtitle="۳۰ روز آینده و موارد معوق"
        onRefresh={load}
        loading={loading}
      />

      <div className={dashboardStatGridClass}>
        <StatCard
          label="معوق (پرداختنی)"
          amount={totals.overdue}
          variant="expense"
          sparklineData={overdueSparkline}
          animateIndex={0}
          lift
        />
        <StatCard
          label="امروز و پیش‌رو (پرداختنی)"
          amount={totals.upcoming}
          variant="default"
          tone="primary"
          sparklineData={upcomingSparkline}
          animateIndex={1}
          lift
        />
        {incoming.length > 0 ? (
          <StatCard
            label="چک‌های دریافتی در راه"
            amount={totals.incoming}
            variant="income"
            sparklineData={distributionSparkline(incoming.map(item => item.amount))}
            animateIndex={2}
            lift
          />
        ) : null}
      </div>

      {!grouped.length ? (
        <Card>
          <p className={emptyTextClass}>سررسیدی در این بازه ثبت نشده</p>
        </Card>
      ) : (
        <div className={reportStatusGroupsClass(grouped.length)}>
          {grouped.map(group => (
            <Card key={group.status}>
              <h3 className={chartTitleClass}>{STATUS_LABELS[group.status]}</h3>
              {group.items.map((item, index) => (
                <TransactionListItem
                  key={item.id}
                  title={item.title}
                  meta={[
                    getDueDateItemLabel(item),
                    item.subtitle,
                    formatIsoDatePersian(item.dueDate)
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  tone={item.incoming ? 'income' : 'expense'}
                  index={index}
                >
                  <div className={reportDueItemEndClass}>
                    <DueDateBadge status={item.status} />
                    <MoneyDisplay
                      amount={item.amount}
                      size="record"
                      tone={item.incoming ? 'income' : 'expense'}
                    />
                  </div>
                </TransactionListItem>
              ))}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
