import AmountInput from './AmountInput'
import { spinnerClass } from './ui/displayStyles'
import {
  cardInlineEditClass,
  cardInlineEditFieldClass,
  cardInlineEditLabelClass,
  cardInlineEditSpinnerClass
} from './ui/featureCardStyles'
import { cn } from '../utils/cn'

interface CardInlineAmountEditProps {
  label: string
  value: string | number
  onChange: (value: number | '') => void
  onBlur?: () => void
  onClose?: () => void
  saving?: boolean
  className?: string
}

export default function CardInlineAmountEdit({
  label,
  value,
  onChange,
  onBlur,
  onClose,
  saving = false,
  className
}: CardInlineAmountEditProps) {
  const handleSubmit = () => {
    onBlur?.()
    onClose?.()
  }

  return (
    <div className={cn(cardInlineEditClass, className)}>
      <div className={cardInlineEditFieldClass}>
        <label className={cardInlineEditLabelClass}>{label}</label>
        <AmountInput
          compact
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onSubmit={onClose ? handleSubmit : undefined}
          submitDisabled={saving}
        />
      </div>
      {saving ? (
        <span className={cn(spinnerClass, cardInlineEditSpinnerClass)} aria-label="در حال ذخیره" />
      ) : null}
    </div>
  )
}
