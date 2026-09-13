import type { BankCardColorOption } from './bankCardColorVariants'
import { bluColorPickerBtnClass, bluColorPickerGridClass } from './walletCardStyles'
import { cn } from '../../utils/cn'

type BankCardColorPickerProps = {
  options: BankCardColorOption[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  ariaLabel?: string
}

export default function BankCardColorPicker({
  options,
  value,
  onChange,
  disabled,
  ariaLabel = 'رنگ کارت بانکی'
}: BankCardColorPickerProps) {
  if (options.length === 0) return null

  return (
    <div className={bluColorPickerGridClass} role="radiogroup" aria-label={ariaLabel}>
      {options.map(option => {
        const selected = value === option.id

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            disabled={disabled}
            title={option.label}
            className={cn(bluColorPickerBtnClass, selected && 'blu-color-picker-btn--selected')}
            style={
              option.swatchBackground
                ? { background: option.swatchBackground }
                : { backgroundColor: option.hex }
            }
            onClick={() => onChange(option.id)}
          />
        )
      })}
    </div>
  )
}
