import { useMemo } from 'react'

import CategoryTreeSection from './categoryTree/CategoryTreeSection'
import CategoryTreeSummary from './categoryTree/CategoryTreeSummary'
import {
  useCategoryTreeReport,
  type CategoryTreeFilter
} from './categoryTree/useCategoryTreeReport'
import ReportDateFilterBar from './ReportDateFilterBar'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { getSettings, isConfigured } from '../../services/settings'
import { cn } from '../../utils/cn'
import { formatPersianNumber } from '../../utils/formatMoney'
import AppIcon from '../AppIcon'
import { InstallmentCardListSkeleton } from '../skeleton'
import SpeedDialIcon from '../SpeedDialIcon'
import TransactionTypeSegment, {
  type TransactionTypeSegmentOption
} from '../TransactionTypeSegment'
import Card from '../ui/Card'
import {
  categoryTreeCaptionClass,
  categoryTreeEmptyClass,
  categoryTreeEmptyIconClass,
  categoryTreeToggleAllClass,
  categoryTreeToggleIconClass,
  categoryTreeToolbarClass
} from '../ui/categoryTreeStyles'
import { dashboardPageClass } from '../ui/chartStyles'
import { emptyStateClass } from '../ui/displayStyles'
import { dashboardTransactionSegmentClass } from '../ui/recordsStyles'
import { reportPageClass } from '../ui/toolsPageStyles'

export default function CategoryTreeReportPage() {
  const tree = useCategoryTreeReport()

  const settings = getSettings()

  const incomeLabel = settings?.forms.find(form => form.type === 'income')?.name ?? 'درآمد'

  const expenseLabel = settings?.forms.find(form => form.type === 'expense')?.name ?? 'هزینه'

  const typeOptions: TransactionTypeSegmentOption[] = [
    { id: 'all', label: 'همه' },
    { id: 'income', label: incomeLabel, tone: 'income' },
    { id: 'expense', label: expenseLabel, tone: 'expense' }
  ]

  const speedDial = useMemo(
    () => ({
      ariaLabel: 'عملیات درختواره',
      actions: [
        {
          id: 'refresh',
          label: 'بروزرسانی',
          icon: <SpeedDialIcon name="refresh" />,
          onClick: tree.load,
          disabled: tree.loading
        },
        {
          id: 'export',
          label: 'خروجی اکسل',
          icon: <SpeedDialIcon name="export" />,
          onClick: tree.exportCsv,
          disabled: !tree.nodes.length
        },
        {
          id: 'export-pdf',
          label: 'خروجی PDF',
          icon: <SpeedDialIcon name="pdf" />,
          onClick: () => void tree.exportPdf(),
          disabled: !tree.nodes.length || tree.exporting
        }
      ]
    }),
    [tree.load, tree.loading, tree.exportCsv, tree.exportPdf, tree.nodes.length, tree.exporting]
  )

  useRegisterPageSpeedDial(isConfigured() ? speedDial : null)

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  return (
    <div className={cn(dashboardPageClass, reportPageClass)}>
      <ReportDateFilterBar
        preset={tree.datePreset}
        customRange={tree.customRange}
        onFilterChange={tree.handleDateFilterChange}
        onRefresh={tree.load}
        loading={tree.loading}
      />

      <CategoryTreeSummary
        filter={tree.typeFilter}
        incomeTotal={tree.incomeTotal}
        expenseTotal={tree.expenseTotal}
        incomeLabel={incomeLabel}
        expenseLabel={expenseLabel}
      />

      <Card>
        <TransactionTypeSegment
          className={dashboardTransactionSegmentClass}
          options={typeOptions}
          value={tree.typeFilter}
          onChange={id => tree.setTypeFilter(id as CategoryTreeFilter)}
          ariaLabel="نوع درختواره"
        />

        <div className={categoryTreeToolbarClass}>
          <button
            type="button"
            className={categoryTreeToggleAllClass}
            onClick={tree.toggleAll}
            disabled={!tree.canToggleAll}
            aria-label={tree.allExpanded ? 'بستن همه دسته‌ها' : 'باز کردن همه دسته‌ها'}
          >
            <span className={categoryTreeToggleIconClass(tree.allExpanded)} aria-hidden="true">
              <AppIcon name="chevron-down" size={14} strokeWidth={2.5} />
            </span>
            {tree.allExpanded ? 'بستن همه' : 'باز کردن همه'}
          </button>

          <p className={categoryTreeCaptionClass}>
            {formatPersianNumber(tree.nodes.length, { useGrouping: false })} دسته
          </p>
        </div>

        {tree.loading && !tree.nodes.length ? (
          <InstallmentCardListSkeleton count={3} />
        ) : !tree.nodes.length ? (
          <div className={categoryTreeEmptyClass}>
            <span className={categoryTreeEmptyIconClass} aria-hidden="true">
              <AppIcon name="chart" size={22} strokeWidth={2} />
            </span>
            <p>در این دوره تراکنشی ثبت نشده</p>
          </div>
        ) : (
          <>
            <CategoryTreeSection
              type="income"
              title={incomeLabel}
              nodes={tree.incomeNodes}
              total={tree.incomeTotal}
              showHeader={tree.typeFilter === 'all'}
              expandedIds={tree.expanded}
              isExpandable={tree.isExpandable}
              onToggle={tree.toggleNode}
            />
            <CategoryTreeSection
              type="expense"
              title={expenseLabel}
              nodes={tree.expenseNodes}
              total={tree.expenseTotal}
              showHeader={tree.typeFilter === 'all'}
              expandedIds={tree.expanded}
              isExpandable={tree.isExpandable}
              onToggle={tree.toggleNode}
            />
          </>
        )}
      </Card>
    </div>
  )
}
