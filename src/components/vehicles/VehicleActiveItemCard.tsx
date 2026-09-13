import type { VehicleActiveListItem } from '../../types/vehicles'
import { cn } from '../../utils/cn'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import { vehicleHorizontalCardClass } from './vehicleCardStyles'
import Button from '../ui/Button'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  dangCardBodyClass,
  dangCardContentRowClass,
  dangCardMetaClass,
  listCardTitleClass
} from '../ui/featureCardStyles'

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
      <div className={cardHeaderWithEditClass}>
        <div className={dangCardContentRowClass}>
          <div className={dangCardBodyClass}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={listCardTitleClass}>{item.title}</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[0.68rem] font-bold',
                  urgencyBadgeClass(item.urgency)
                )}
              >
                {urgencyLabel(item.urgency)}
              </span>
            </div>
            <div className={dangCardMetaClass}>{item.subtitle}</div>
            <div className="mt-2">
              {isPeriodic ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => onComplete?.(item)}
                >
                  انجام شد
                </Button>
              ) : (
                <Button type="button" variant="secondary" size="sm" onClick={() => onRenew?.(item)}>
                  تمدید
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className={cardActionButtonsClass} role="group">
          <CardEditButton onClick={() => onEdit(item)} />
          <CardDeleteButton onClick={() => onDelete(item)} />
        </div>
      </div>
    </div>
  )
}
