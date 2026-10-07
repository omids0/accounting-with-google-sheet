import EmptyState from '../EmptyState'
import InstallmentPlanCard from '../InstallmentPlanCard'
import SearchEmptyState from '../SearchEmptyState'
import { InstallmentCardListSkeleton } from '../skeleton'
import type { DisplayPlanItem, PlanWithRow } from './types'
import { listCardsContainerClass } from '../ui/featureCardStyles'

export type InstallmentsListProps = {
  plans: PlanWithRow[]
  monthPlans: PlanWithRow[]
  filteredPlans: PlanWithRow[]
  displayPlans: DisplayPlanItem[]
  monthLabel: string
  loading: boolean
  expandedId: string | null
  togglingByPlan: Record<string, number>
  onToggleExpand: (planId: string) => void
  onEdit: (plan: PlanWithRow) => void
  onDelete: (plan: PlanWithRow) => void
  onTogglePayment: (plan: PlanWithRow, paymentIndex: number, paid: boolean) => void
  onPaymentAmountSave: (
    plan: PlanWithRow,
    paymentIndex: number,
    nextAmount: number
  ) => Promise<void>
  /** Opens the add form — the same action as the page speed dial. */
  onAdd?: () => void
}

export default function InstallmentsList({
  plans,
  monthPlans,
  filteredPlans,
  displayPlans,
  monthLabel,
  loading,
  expandedId,
  togglingByPlan,
  onToggleExpand,
  onEdit,
  onDelete,
  onTogglePayment,
  onPaymentAmountSave,
  onAdd
}: InstallmentsListProps) {
  if (loading && plans.length === 0) {
    return <InstallmentCardListSkeleton filterChips={1} footerStats={2} />
  }

  if (plans.length === 0) {
    return (
      <EmptyState
        icon="installments"
        message="هنوز قسطی ثبت نشده"
        action={onAdd ? { label: 'افزودن قسط', onClick: onAdd } : undefined}
      />
    )
  }

  if (monthPlans.length === 0) {
    return <EmptyState icon="installments" message={`هیچ قسطی برای ${monthLabel} نیست`} />
  }

  if (filteredPlans.length === 0) {
    return <SearchEmptyState />
  }

  return (
    <div className={listCardsContainerClass}>
      {displayPlans.map(({ plan, done, complete, settledForRange, progress, dueDate }) => {
        const togglingPaymentIndex = togglingByPlan[plan.id] ?? null

        return (
          <InstallmentPlanCard
            key={plan.id}
            plan={plan}
            expanded={expandedId === plan.id}
            done={done}
            complete={complete}
            settledForRange={settledForRange}
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
      })}
    </div>
  )
}
