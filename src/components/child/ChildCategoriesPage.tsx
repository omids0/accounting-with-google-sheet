import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import ChildMonthBar from './ChildMonthBar'
import ChildPageFrame from './ChildPageFrame'
import {
  categoryBreakdown,
  monthSummary,
  withUnspentBudgets,
  type ChildKind
} from './childViewModel'
import { useChildMonth } from './useChildMonth'
import { useChildRecords } from './useChildRecords'
import { useCategoryBudgets } from '../../hooks/useCategoryBudgets'
import { childRecordsPath } from '../../routes/childPaths'
import { isConfigured } from '../../services/settings'
import FilterChipBar from '../buildings/FilterChipBar'
import type { CategoryInsights } from '../charts/CategoryRowInsights'
import CategoryShareList from '../charts/CategoryShareList'
import EmptyState from '../EmptyState'
import LoadErrorState from '../LoadErrorState'
import MoneyText from '../MoneyText'
import { DashboardSkeleton } from '../skeleton'
import Card from '../ui/Card'
import { sharedCardHeadClass, sharedCardTitleClass, sharedMutedClass } from '../ui/sharedStyles'

/**
 * «دسته‌بندی‌ها» of a child's account (a parent's read-only view): the month's spending (or income)
 * by category with each category's share and, for spending, the child's own monthly budgets and how
 * far each is used. Categories come from the child's records and budgets, never from the child's
 * category tab. A row opens the records of that category.
 */
export default function ChildCategoriesPage() {
  const { entries, loading, loadFailed, reload } = useChildRecords()
  const { budgets } = useCategoryBudgets()
  const month = useChildMonth()
  const navigate = useNavigate()
  const [kind, setKind] = useState<ChildKind>('expense')

  const summary = useMemo(() => monthSummary(entries, month.month), [entries, month.month])

  const rows = useMemo(() => {
    const list = categoryBreakdown(entries, month.month, kind)

    return kind === 'expense' ? withUnspentBudgets(list, budgets) : list
  }, [entries, month.month, kind, budgets])

  // The child's budgets are only looked at: the rows carry the budget line, never «تعیین بودجه».
  const insights = useMemo<CategoryInsights | undefined>(
    () => (kind === 'expense' && budgets.size ? { budgets, readOnly: true } : undefined),
    [kind, budgets]
  )

  if (!isConfigured()) return <EmptyState icon="records" message="ابتدا با گوگل وارد شوید" />

  const total = kind === 'expense' ? summary.expense : summary.income

  return (
    <ChildPageFrame>
      {loading && !entries.length ? (
        <DashboardSkeleton />
      ) : loadFailed && !entries.length ? (
        <LoadErrorState onRetry={reload} />
      ) : (
        <>
          <ChildMonthBar month={month} />
          <FilterChipBar
            ariaLabel="نوع تراکنش"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'expense', label: 'هزینه' },
              { value: 'income', label: 'درآمد' }
            ]}
          />

          <Card>
            <div className={sharedCardHeadClass}>
              <h3 className={sharedCardTitleClass}>
                {kind === 'expense' ? 'جمع هزینهٔ ماه' : 'جمع درآمد ماه'}
              </h3>
              <b className="numeric text-text">
                <MoneyText amount={total} />
              </b>
            </div>
            {rows.length ? (
              <CategoryShareList
                items={rows}
                tone={kind}
                insights={insights}
                shareChip
                onOpen={name => navigate(childRecordsPath(name))}
              />
            ) : (
              <p className={sharedMutedClass}>در این ماه چیزی ثبت نشده.</p>
            )}
          </Card>
          {kind === 'expense' && budgets.size === 0 ? (
            <p className={sharedMutedClass}>فرزندتان هنوز برای دسته‌ها بودجه‌ای نگذاشته است.</p>
          ) : null}
        </>
      )}
    </ChildPageFrame>
  )
}
