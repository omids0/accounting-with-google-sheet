import AppIcon from './AppIcon'
import { cardActionBtnClass, cardEditBtnClass } from './ui/featureCardStyles'
import { useReadOnly } from './ui/readOnly'
import { cn } from '../utils/cn'

type CardEditButtonProps = {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  /** What is edited, e.g. «چک ۱۲۳»; screen readers hear «ویرایش چک ۱۲۳». */
  itemLabel: string
  /** Replaces the verb «ویرایش» when the button does something else (e.g. «تنظیم»). */
  label?: string
}

export default function CardEditButton({
  onClick,
  disabled = false,
  itemLabel,
  label = 'ویرایش'
}: CardEditButtonProps) {
  if (useReadOnly()) return null

  const ariaLabel = `${label} ${itemLabel}`

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
