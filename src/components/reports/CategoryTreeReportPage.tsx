import { useMemo } from 'react'

import CategoryTreeNodeRow from './categoryTree/CategoryTreeNodeRow'
import {
  useCategoryTreeReport,
  type CategoryTreeFilter
} from './categoryTree/useCategoryTreeReport'
import ReportDateFilterBar from './ReportDateFilterBar'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { getSettings, isConfigured } from '../../services/settings'
import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'
import AppIcon from '../AppIcon'
import { InstallmentCardListSkeleton } from '../skeleton'
import SpeedDialIcon from '../SpeedDialIcon'
import TransactionTypeSegment, {
  type TransactionTypeSegmentOption
} from '../TransactionTypeSegment'
import Card from '../ui/Card'
import {
  categoryTreeControlsClass,
  categoryTreeListClass,
  categoryTreeSummaryClass,
  categoryTreeToggleAllClass
} from '../ui/categoryTreeStyles'
import { dashboardPageClass } from '../ui/chartStyles'
import { emptyStateClass, emptyTextClass } from '../ui/displayStyles'
import { dashboardTransactionSegmentClass } from '../ui/recordsStyles'
import { reportPageClass } from '../ui/toolsPageStyles'

export default function CategoryTreeReportPage() {
  const tree = useCategoryTreeReport()

  const settings = getSettings()

  const typeOptions: TransactionTypeSegmentOption[] = [
    { id: 'all', label: 'همه' },
    {
      id: 'income',
      label: settings?.forms.find(form => form.type === 'income')?.name ?? 'درآمد',
      tone: 'income'
    },
    {
      id: 'expense',
      label: settings?.forms.find(form => form.type === 'expense')?.name ?? 'هزینه',
      tone: 'expense'
    }
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

      <Card>
        <TransactionTypeSegment
          className={dashboardTransactionSegmentClass}
          options={typeOptions}
          value={tree.typeFilter}
          onChange={id => tree.setTypeFilter(id as CategoryTreeFilter)}
          ariaLabel="نوع درختواره"
        />

        <div className={categoryTreeControlsClass}>
          <button
            type="button"
            className={categoryTreeToggleAllClass}
            onClick={tree.toggleAll}
            disabled={!tree.nodes.length}
          >
            <AppIcon name={tree.allExpanded ? 'close' : 'add'} size={14} strokeWidth={2.5} />
            {tree.allExpanded ? 'بستن همه' : 'باز کردن همه'}
          </button>
          <span className={categoryTreeSummaryClass}>
            {tree.nodes.length.toLocaleString('fa-IR')} دسته · {formatMoney(tree.total)}
          </span>
        </div>

        {tree.loading && !tree.nodes.length ? (
          <InstallmentCardListSkeleton count={3} />
        ) : !tree.nodes.length ? (
          <p className={emptyTextClass}>در این دوره تراکنشی ثبت نشده</p>
        ) : (
          <div className={categoryTreeListClass}>
            {tree.nodes.map(node => (
              <CategoryTreeNodeRow
                key={node.id}
                node={node}
                open={tree.expanded.has(node.id)}
                showTypeBadge={tree.typeFilter === 'all'}
                onToggle={tree.toggleNode}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
