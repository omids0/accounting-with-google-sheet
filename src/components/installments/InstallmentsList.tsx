import InstallmentTable from './InstallmentTable'
import { useIsDesktop } from '../../hooks/useMediaQuery'
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
  const isDesktop = useIsDesktop()

  if (loading && plans.length === 0) {
    return <InstallmentCardListSkeleton footerStats={2} table />
  }

  if (plans.length === 0) {
    return (
      <EmptyState
        icon="installments"
        description="وام و خریدهای قسطی‌ات را ثبت کن تا سررسید هر قسط و مانده بدهی را یک‌جا ببینی."
        message="هنوز قسطی ثبت نشده"
        action={onAdd ? { label: 'افزودن قسط', onClick: onAdd } : undefined}
      />
    )
  }

  if (monthPlans.length === 0) {
    return (
      <EmptyState
        icon="installments"
        message={`هیچ قسطی برای ${monthLabel} نیست`}
        action={onAdd ? { label: 'افزودن قسط', onClick: onAdd } : undefined}
      />
    )
  }

  if (filteredPlans.length === 0) {
    return <SearchEmptyState />
  }

  const renderCard = (
    { plan, done, complete, settledForRange, progress, dueDate }: DisplayPlanItem,
    bodyOnly = false
  ) => (
    <InstallmentPlanCard
      key={plan.id}
      plan={plan}
      expanded={bodyOnly || expandedId === plan.id}
      bodyOnly={bodyOnly}
      done={done}
      complete={complete}
      settledForRange={settledForRange}
      progress={progress}
      dueDate={dueDate}
      togglingPaymentIndex={togglingByPlan[plan.id] ?? null}
      onToggleExpand={onToggleExpand}
      onEdit={onEdit}
      onDelete={onDelete}
      onTogglePayment={onTogglePayment}
      onPaymentAmountSave={onPaymentAmountSave}
    />
  )

  if (isDesktop) {
    return (
      <InstallmentTable
        items={displayPlans}
        expandedId={expandedId}
        onToggleExpand={onToggleExpand}
        onEdit={item => onEdit(item.plan)}
        onDelete={item => onDelete(item.plan)}
        renderDetail={item => renderCard(item, true)}
      />
    )
  }

  return <div className={listCardsContainerClass}>{displayPlans.map(item => renderCard(item))}</div>
}
