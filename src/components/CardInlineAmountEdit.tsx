import { useId } from 'react'

import AmountInput from './AmountInput'
import { spinnerClass } from './ui/displayStyles'
import {
  cardInlineEditClass,
  cardInlineEditFieldClass,
  cardInlineEditLabelClass,
  cardInlineEditSpinnerClass
} from './ui/featureCardStyles'
import { formHintClass } from './ui/formStyles'
import { cn } from '../utils/cn'

interface CardInlineAmountEditProps {
  label: string
  value: string | number
  onChange: (value: number | '') => void
  onBlur?: () => void
  onClose?: () => void
  saving?: boolean
  /** Small note under the field, for example the lowest amount that is allowed. */
  hint?: string
  className?: string
}

export default function CardInlineAmountEdit({
  label,
  value,
  onChange,
  onBlur,
  onClose,
  saving = false,
  hint,
  className
}: CardInlineAmountEditProps) {
  const inputId = useId()

  const handleSubmit = () => {
    onBlur?.()
    onClose?.()
  }

  return (
    <div className={cn(cardInlineEditClass, className)}>
      <div className={cardInlineEditFieldClass}>
        <label htmlFor={inputId} className={cardInlineEditLabelClass}>
          {label}
        </label>
        <AmountInput
          id={inputId}
          compact
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onSubmit={onClose ? handleSubmit : undefined}
          submitDisabled={saving}
          disabled={saving}
        />
        {hint ? <p className={formHintClass}>{hint}</p> : null}
      </div>
      {saving ? (
        <span
          role="status"
          className={cn(spinnerClass, cardInlineEditSpinnerClass)}
          aria-label="در حال ذخیره"
        />
      ) : null}
    </div>
  )
}
