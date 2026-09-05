import AppIcon from '../AppIcon'
import InstallmentPlanCard from '../InstallmentPlanCard'
import SearchEmptyState from '../SearchEmptyState'
import { InstallmentCardListSkeleton } from '../skeleton'
import type { DisplayPlanItem, PlanWithRow } from './types'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'

export type InstallmentsListProps = {
  plans: PlanWithRow[]
  monthPlans: PlanWithRow[]
  filteredPlans: PlanWithRow[]
  displayPlans: DisplayPlanItem[]
  monthLabel: string
  loading: boolean
  expandedId: string | null
  togglingKey: string
  onToggleExpand: (planId: string) => void
  onEdit: (plan: PlanWithRow) => void
  onDelete: (plan: PlanWithRow) => void
  onTogglePayment: (plan: PlanWithRow, paymentIndex: number, paid: boolean) => void
  onPaymentAmountSave: (
    plan: PlanWithRow,
    paymentIndex: number,
    nextAmount: number
  ) => Promise<void>
}

export default function InstallmentsList({
  plans,
  monthPlans,
  filteredPlans,
  displayPlans,
  monthLabel,
  loading,
  expandedId,
  togglingKey,
  onToggleExpand,
  onEdit,
  onDelete,
  onTogglePayment,
  onPaymentAmountSave
}: InstallmentsListProps) {
  if (loading && plans.length === 0) {
    return <InstallmentCardListSkeleton filterChips={1} footerStats={2} />
  }

  if (plans.length === 0) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="installments" />
        </div>
        <p>هنوز قسطی ثبت نشده</p>
      </div>
    )
  }

  if (monthPlans.length === 0) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="installments" />
        </div>
        <p>هیچ قسطی برای {monthLabel} نیست</p>
      </div>
    )
  }

  if (filteredPlans.length === 0) {
    return <SearchEmptyState />
  }

  return displayPlans.map(({ plan, done, complete, progress, dueDate }) => {
    const togglingPaymentIndex = togglingKey.startsWith(`${plan.id}-`)
      ? Number(togglingKey.slice(plan.id.length + 1))
      : null

    return (
      <InstallmentPlanCard
        key={plan.id}
        plan={plan}
        expanded={expandedId === plan.id}
        done={done}
        complete={complete}
        progress={progress}
        dueDate={dueDate}
        togglingPaymentIndex={togglingPaymentIndex}
        onToggleExpand={onToggleExpand}
        onEdit={onEdit}
        onDelete={onDelete}
        onTogglePayment={onTogglePayment}
        onPaymentAmountSave={onPaymentAmountSave}
      />
    )
  })
}
