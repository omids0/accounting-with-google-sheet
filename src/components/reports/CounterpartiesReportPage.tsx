import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router'

import { useCounterpartiesReport } from './counterparties/useCounterpartiesReport'
import { ReportDateFilterBar } from './ReportDateFilterBar'
import ReportTotalCard from './ReportTotalCard'
import ShareBarRows from './ShareBarRows'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { recordsCounterpartyPath } from '../../routes/paths'
import type { LineItemsReportType } from '../../services/lineItemsReport'
import { isConfigured } from '../../services/settings'
import { useNavigationStore } from '../../stores/navigationStore'
import { cn } from '../../utils/cn'
import { formatDateRangeLabel } from '../../utils/dateRange'
import { formatMoney, formatPersianNumber } from '../../utils/formatMoney'
import EmptyState from '../EmptyState'
import { InstallmentCardListSkeleton } from '../skeleton'
import SpeedDialIcon from '../SpeedDialIcon'
import TransactionTypeSegment, {
  type TransactionTypeSegmentOption
} from '../TransactionTypeSegment'
import Card from '../ui/Card'
import { dashboardPageClass } from '../ui/chartStyles'
import { emptyStateClass } from '../ui/displayStyles'
import { reportPageClass } from '../ui/toolsPageStyles'

const TYPE_OPTIONS: TransactionTypeSegmentOption[] = [
  { id: 'expense', label: 'هزینه', tone: 'expense' },
  { id: 'income', label: 'درآمد', tone: 'income' },
  { id: 'all', label: 'همه' }
]

const TYPE_LABEL: Record<LineItemsReportType, string> = {
  expense: 'هزینه',
  income: 'درآمد',
  all: 'تراکنش'
}

/** «طرف حساب‌ها»: what each counterparty named on income/expense records adds up to. */
export default function CounterpartiesReportPage() {
  const navigate = useNavigate()

  const report = useCounterpartiesReport()

  const { aggregate, type, dateRange, exportCsv, exportPdf, exporting } = report

  const { rows } = aggregate

  const shareRows = useMemo(
    () =>
      rows.map(row => ({
        key: row.name,
        name: row.name,
        sub: `${formatPersianNumber(row.count)} تراکنش${
          row.topCategory ? ` · بیشتر در ${row.topCategory}` : ''
        }`,
        total: row.total,
        ariaLabel: `تراکنش‌های ${row.name}`
      })),
    [rows]
  )

  const openRecords = useCallback(
    (name: string) => navigate(recordsCounterpartyPath(name, type, dateRange)),
    [dateRange, navigate, type]
  )

  const speedDial = useMemo(
    () => ({
      ariaLabel: 'عملیات گزارش طرف حساب‌ها',
      actions: [
        {
          id: 'export',
          label: 'خروجی CSV',
          icon: <SpeedDialIcon name="export" />,
          onClick: exportCsv
        },
        {
          id: 'export-pdf',
          label: 'خروجی PDF',
          icon: <SpeedDialIcon name="pdf" />,
          onClick: () => void exportPdf(),
          disabled: exporting
        }
      ]
    }),
    [exportCsv, exportPdf, exporting]
  )

  useRegisterPageSpeedDial(isConfigured() ? speedDial : null)

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  const label = TYPE_LABEL[type]

  const all = aggregate.withTotal + aggregate.withoutTotal

  const share = all > 0 ? Math.round((aggregate.withTotal / all) * 100) : 0

  return (
    <div className={cn(dashboardPageClass, reportPageClass)}>
      <ReportDateFilterBar
        preset={report.datePreset}
        customRange={report.customRange}
        onFilterChange={report.handleDateFilterChange}
        onRefresh={() => undefined}
        showRefresh={false}
      />

      <TransactionTypeSegment
        options={TYPE_OPTIONS}
        value={type}
        onChange={id => report.setType(id as LineItemsReportType)}
        ariaLabel="نوع تراکنش"
      />

      {!report.loaded ? (
        <InstallmentCardListSkeleton count={3} />
      ) : !rows.length ? (
        <EmptyState
          icon="counterparties"
          message="برای تراکنش‌ها طرف حساب بزن تا این گزارش پر شود"
          description="در این بازه تراکنشی با طرف حساب نیست."
          action={{
            label: 'ثبت تراکنش',
            onClick: () => useNavigationStore.getState().onOpenEntry()
          }}
        />
      ) : (
        <>
          <ReportTotalCard
            label={`${label} با طرف حساب · ${formatDateRangeLabel(dateRange)}`}
            amount={aggregate.withTotal}
            tone={type === 'all' ? 'neutral' : type}
            caption={`${formatPersianNumber(share)}٪ ${label}‌ها · ${formatMoney(
              aggregate.withoutTotal
            )} بدون طرف حساب`}
          />

          <Card>
            <ShareBarRows
              rows={shareRows}
              grandTotal={aggregate.withTotal}
              tone={type === 'income' ? 'income' : 'expense'}
              onOpen={openRecords}
            />
          </Card>
        </>
      )}
    </div>
  )
}
