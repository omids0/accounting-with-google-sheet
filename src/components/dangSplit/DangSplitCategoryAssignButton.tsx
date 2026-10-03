import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'
import { dangSplitAssignBadgeClass, dangSplitAssignButtonClass } from './dangSplitStyles'
import { cardActionBtnClass } from '../ui/featureCardStyles'

/** دکمه عضویت در دسته: «+» برای افزودن به دسته و «−» برای خروج از دسته */
export default function DangSplitCategoryAssignButton({
  mode,
  onClick,
  disabled = false,
  ariaLabel
}: {
  mode: 'assign' | 'leave'
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      className={cn(cardActionBtnClass, 'card-action-btn', dangSplitAssignButtonClass(mode))}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <AppIcon name="counterparties" size={18} strokeWidth={2} />
      <span className={dangSplitAssignBadgeClass(mode)} aria-hidden="true">
        {mode === 'assign' ? '+' : '−'}
      </span>
    </button>
  )
}
