import AppIcon from './AppIcon'
import { cardActionBtnClass, cardDeleteBtnClass } from './ui/featureCardStyles'
import { useReadOnly } from './ui/readOnly'
import { cn } from '../utils/cn'

type CardDeleteButtonProps = {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  /** What is deleted, e.g. «چک ۱۲۳»; screen readers hear «حذف چک ۱۲۳». */
  itemLabel: string
  label?: string
}

export default function CardDeleteButton({
  onClick,
  disabled = false,
  itemLabel,
  label = 'حذف'
}: CardDeleteButtonProps) {
  if (useReadOnly()) return null

  const ariaLabel = `${label} ${itemLabel}`.trim()

  return (
    <button
      type="button"
      className={cn(cardActionBtnClass, 'card-action-btn', cardDeleteBtnClass)}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <AppIcon name="trash" size={18} />
    </button>
  )
}
