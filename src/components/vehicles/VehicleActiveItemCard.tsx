import type { VehicleActiveListItem } from '../../types/vehicles'
import { cn } from '../../utils/cn'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import {
  vehicleHorizontalCardActionsClass,
  vehicleHorizontalCardClass,
  vehicleHorizontalCardMainClass
} from './vehicleCardStyles'
import Button from '../ui/Button'

type VehicleActiveItemCardProps = {
  item: VehicleActiveListItem
  onComplete?: (item: VehicleActiveListItem) => void
  onRenew?: (item: VehicleActiveListItem) => void
  onEdit: (item: VehicleActiveListItem) => void
  onDelete: (item: VehicleActiveListItem) => void
}

function urgencyBorderClass(urgency: VehicleActiveListItem['urgency']): string {
  if (urgency === 'overdue') {
    return 'border-[color-mix(in_srgb,var(--color-expense)_45%,var(--color-border))]'
  }

  if (urgency === 'soon') {
    return 'border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))]'
  }

  return ''
}

function urgencyBadgeClass(urgency: VehicleActiveListItem['urgency']): string {
  if (urgency === 'overdue') {
    return 'bg-[color-mix(in_srgb,var(--color-expense)_14%,transparent)] text-expense'
  }

  if (urgency === 'soon') {
    return 'bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary-dark)]'
  }

  return 'bg-[color-mix(in_srgb,var(--color-income)_14%,transparent)] text-income'
}

function urgencyLabel(urgency: VehicleActiveListItem['urgency']): string {
  if (urgency === 'overdue') return 'معوق'
  if (urgency === 'soon') return 'نزدیک'
  return 'عادی'
}

export default function VehicleActiveItemCard({
  item,
  onComplete,
  onRenew,
  onEdit,
  onDelete
}: VehicleActiveItemCardProps) {
  const isPeriodic = item.kind === 'periodic'

  return (
    <div className={cn(vehicleHorizontalCardClass, urgencyBorderClass(item.urgency))}>
      <div className={vehicleHorizontalCardMainClass}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.95rem] font-bold text-primary">{item.title}</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[0.68rem] font-bold',
              urgencyBadgeClass(item.urgency)
            )}
          >
            {urgencyLabel(item.urgency)}
          </span>
        </div>
        <div className="mt-1 text-[0.82rem] text-muted">{item.subtitle}</div>
      </div>

      <div className={vehicleHorizontalCardActionsClass}>
        {isPeriodic ? (
          <Button type="button" variant="primary" size="sm" onClick={() => onComplete?.(item)}>
            انجام شد
          </Button>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={() => onRenew?.(item)}>
            تمدید
          </Button>
        )}
        <CardEditButton onClick={() => onEdit(item)} />
        <CardDeleteButton onClick={() => onDelete(item)} />
      </div>
    </div>
  )
}
