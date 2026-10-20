import AppIcon from './AppIcon'
import { cardActionBtnClass, cardEditBtnClass } from './ui/featureCardStyles'
import { useReadOnly } from './ui/readOnly'
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
  if (useReadOnly()) return null

  return (
    <button
      type="button"
      className={cn(cardActionBtnClass, 'card-action-btn', cardEditBtnClass)}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <AppIcon name="edit" size={18} />
    </button>
  )
}
