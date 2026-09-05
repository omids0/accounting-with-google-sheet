import AppIcon from './AppIcon'
import { cardActionBtnClass, cardEditBtnClass } from './ui/featureCardStyles'
import { cn } from '../utils/cn'

type CardEditButtonProps = {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  ariaLabel?: string
}

export default function CardEditButton({
  onClick,
  disabled = false,
  ariaLabel = 'ویرایش'
}: CardEditButtonProps) {
  return (
    <button
      type="button"
      className={cn(cardActionBtnClass, 'card-action-btn', cardEditBtnClass)}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <AppIcon name="edit" size={18} strokeWidth={2} />
    </button>
  )
}
