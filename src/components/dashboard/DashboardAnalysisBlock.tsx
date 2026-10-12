import { useMemo, useState } from 'react'

import type { CategorySummary } from '../../types'
import { topCategoryShares } from '../../utils/categoryShares'
import { cn } from '../../utils/cn'
import CalmBlock from '../CalmBlock'
import CategoryShareList from '../charts/CategoryShareList'
import { CATEGORY_TONE_OPTIONS, type CategoryTone } from '../charts/categoryTone'
import TransactionTypeSegment from '../TransactionTypeSegment'
import { calmEmptyClass, calmSegmentClass } from '../ui/calmListStyles'

/** «تحلیل این ماه»: the top three expense (default) or income categories with a share bar. */
export default function DashboardAnalysisBlock({
  expenseByCategory,
  incomeByCategory,
  onOpenCharts,
  periodNoun = 'ماه',
  className
}: {
  className?: string
  expenseByCategory: CategorySummary[]
  incomeByCategory: CategorySummary[]
  onOpenCharts: () => void
  periodNoun?: string
}) {
  const [tone, setTone] = useState<CategoryTone>('expense')

  const rows = useMemo(
    () => topCategoryShares(tone === 'expense' ? expenseByCategory : incomeByCategory, 3),
    [tone, expenseByCategory, incomeByCategory]
  )

  return (
    <CalmBlock
      className={className}
      title={`تحلیل این ${periodNoun}`}
      action={{ label: 'نمودارها ←', onClick: onOpenCharts }}
      toolbar={
        <TransactionTypeSegment
          className={cn(calmSegmentClass, 'mb-1 self-start')}
          options={CATEGORY_TONE_OPTIONS}
          value={tone}
          onChange={id => setTone(id as CategoryTone)}
          ariaLabel="نوع تحلیل"
        />
      }
    >
      {!rows.length ? (
        <p className={calmEmptyClass}>
          {tone === 'expense'
            ? `هزینه‌ای در این ${periodNoun} نیست`
            : `درآمدی در این ${periodNoun} نیست`}
        </p>
      ) : (
        <CategoryShareList items={rows} tone={tone} />
      )}
    </CalmBlock>
  )
}
