import { useCallback, useMemo } from 'react'

import LineItemsSummary from './lineItems/LineItemsSummary'
import LineItemsTable from './lineItems/LineItemsTable'
import PricierSection from './lineItems/PricierSection'
import { useLineItemsReport, type LineItemSort } from './lineItems/useLineItemsReport'
import { ReportDateFilterBar } from './ReportDateFilterBar'
import ShareBarRows from './ShareBarRows'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import type { ItemStat, LineItemsReportType } from '../../services/lineItemsReport'
import { isConfigured } from '../../services/settings'
import { useNavigationStore } from '../../stores/navigationStore'
import { cn } from '../../utils/cn'
import { formatDateRangeLabel } from '../../utils/dateRange'
import { formatPersianNumber } from '../../utils/formatMoney'
import EmptyState from '../EmptyState'
import PageSearchInput from '../PageSearchInput'
import { InstallmentCardListSkeleton } from '../skeleton'
import SpeedDialIcon from '../SpeedDialIcon'
import TransactionTypeSegment, {
  type TransactionTypeSegmentOption
} from '../TransactionTypeSegment'
import { calmSegmentClass } from '../ui/calmListStyles'
import Card from '../ui/Card'
import { dashboardPageClass } from '../ui/chartStyles'
import { emptyStateClass } from '../ui/displayStyles'
import { reportPageClass } from '../ui/toolsPageStyles'

const TYPE_OPTIONS: TransactionTypeSegmentOption[] = [
  { id: 'expense', label: 'هزینه', tone: 'expense' },
  { id: 'income', label: 'درآمد', tone: 'income' },
  { id: 'all', label: 'همه' }
]

const SORT_OPTIONS: TransactionTypeSegmentOption[] = [
  { id: 'total', label: 'جمع' },
  { id: 'count', label: 'دفعات' },
  { id: 'average', label: 'میانگین' }
]

/** «گزارش اقلام»: what the invoice items of income and expense records add up to, per item. */
export default function LineItemsReportPage() {
  const report = useLineItemsReport()

  const isDesktop = useIsDesktop()

  const { aggregate, type, items, exportCsv, exportPdf, exporting } = report

  const openItem = useCallback(
    (item: ItemStat) =>
      useNavigationStore.getState().onTabChange('report-line-item', {
        lineItemKey: item.key,
        lineItemTitle: item.name,
        lineItemType: type
      }),
    [type]
  )

  const rows = useMemo(
    () =>
      items.map(item => ({
        key: item.key,
        name: item.name,
        sub: `${formatPersianNumber(item.count)} بار · میانگین ${formatPersianNumber(
          Math.round(item.average)
        )}`,
        total: item.total,
        ariaLabel: `گزارش قلم ${item.name}`
      })),
    [items]
  )

  const openByKey = useCallback(
    (key: string) => {
      const item = items.find(entry => entry.key === key)

      if (item) openItem(item)
    },
    [items, openItem]
  )

  const speedDial = useMemo(
    () => ({
      ariaLabel: 'عملیات گزارش اقلام',
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

  const tone = type === 'income' ? 'income' : 'expense'

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
      ) : !aggregate.recordCount ? (
        <EmptyState
          icon="records"
          message="برای رکوردها ریز اقلام بزن تا این گزارش پر شود"
          description="در این بازه رکوردی با ریز اقلام نیست."
          action={{
            label: 'ثبت تراکنش',
            onClick: () => useNavigationStore.getState().onOpenEntry()
          }}
        />
      ) : (
        <>
          <LineItemsSummary
            aggregate={aggregate}
            type={type}
            periodLabel={formatDateRangeLabel(report.dateRange)}
          />

          <Card>
            <PageSearchInput
              value={report.search}
              onChange={report.setSearch}
              placeholder="جستجوی نام قلم..."
            />
            <TransactionTypeSegment
              className={calmSegmentClass}
              options={SORT_OPTIONS}
              value={report.sort}
              onChange={id => report.setSort(id as LineItemSort)}
              ariaLabel="مرتب‌سازی اقلام"
            />
            {!items.length ? (
              <p className="m-0 py-3 text-center text-[0.8rem] text-muted">قلمی پیدا نشد</p>
            ) : isDesktop ? (
              <LineItemsTable items={items} onOpen={openItem} />
            ) : (
              <ShareBarRows
                rows={rows}
                grandTotal={aggregate.withItemsTotal}
                tone={tone}
                onOpen={openByKey}
              />
            )}
          </Card>

          <PricierSection changes={report.pricier} />
        </>
      )}
    </div>
  )
}
