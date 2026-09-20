import type { CategoryTreeFilter } from './useCategoryTreeReport'
import StatCard from '../../StatCard'
import { dashboardStatGridClass } from '../../ui/chartStyles'

interface CategoryTreeSummaryProps {
  filter: CategoryTreeFilter
  incomeTotal: number
  expenseTotal: number
  incomeLabel: string
  expenseLabel: string
}

/** Totals of the period, so the tree below always has a figure to be read against. */
export default function CategoryTreeSummary({
  filter,
  incomeTotal,
  expenseTotal,
  incomeLabel,
  expenseLabel
}: CategoryTreeSummaryProps) {
  if (filter === 'income') {
    return (
      <StatCard label={incomeLabel} amount={incomeTotal} variant="income" wide animateIndex={0} />
    )
  }

  if (filter === 'expense') {
    return (
      <StatCard
        label={expenseLabel}
        amount={expenseTotal}
        variant="expense"
        wide
        animateIndex={0}
      />
    )
  }

  return (
    <div className={dashboardStatGridClass}>
      <StatCard label={incomeLabel} amount={incomeTotal} variant="income" animateIndex={0} lift />
      <StatCard
        label={expenseLabel}
        amount={expenseTotal}
        variant="expense"
        animateIndex={1}
        lift
      />
    </div>
  )
}
