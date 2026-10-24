import AppIcon from './AppIcon'
import { cardActionBtnClass, cardExpandBtnClass } from './ui/featureCardStyles'
import { cn } from '../utils/cn'

type CardExpandButtonProps = {
  expanded: boolean
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  /** What opens, e.g. «حساب بانک ملی»; screen readers hear «نمایش جزئیات حساب بانک ملی». */
  itemLabel: string
  /** Replaces «نمایش جزئیات» / «بستن جزئیات» for both states. */
  label?: string
  className?: string
}

export default function CardExpandButton({
  expanded,
  onClick,
  disabled = false,
  itemLabel,
  label = expanded ? 'بستن جزئیات' : 'نمایش جزئیات',
  className
}: CardExpandButtonProps) {
  const ariaLabel = `${label} ${itemLabel}`.trim()

  return (
    <button
      type="button"
      className={cn(cardActionBtnClass, 'card-action-btn', cardExpandBtnClass(expanded), className)}
      onClick={onClick}
      disabled={disabled}
      aria-expanded={expanded}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <AppIcon name="chevron-down" size={18} />
    </button>
  )
}
