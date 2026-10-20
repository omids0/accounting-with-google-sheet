import { toPersianDigits } from '../../utils/normalizeDigits'
import { toggleChipBtnClass, toggleChipGridClass } from '../ui/recordsStyles'

export interface FilterChipOption<V extends string> {
  value: V
  label: string
  /** Shown after the label («بدهکار ۳»). */
  count?: number
}

/** A row of single-choice filter chips (همه | بدهکار | خالی); a view filter, not a stored choice. */
export default function FilterChipBar<V extends string>({
  options,
  value,
  onChange,
  ariaLabel
}: {
  options: FilterChipOption<V>[]
  value: V
  onChange: (value: V) => void
  ariaLabel: string
}) {
  return (
    <div className={toggleChipGridClass} role="group" aria-label={ariaLabel}>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          className={toggleChipBtnClass(option.value === value)}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count === undefined ? '' : ` ${toPersianDigits(String(option.count))}`}
        </button>
      ))}
    </div>
  )
}
