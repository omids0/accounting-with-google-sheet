import { cn } from '../../utils/cn'
import { dangCheckboxClass } from '../ui/featureCardStyles'
import { formHintClass } from '../ui/formStyles'

interface CheckboxFieldProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  /** Muted line under the label, e.g. why the box starts unchecked. */
  hint?: string
  disabled?: boolean
}

/** Checkbox row with the shared checkbox look; the whole 44 px row toggles it. */
export default function CheckboxField({
  checked,
  onChange,
  label,
  hint,
  disabled
}: CheckboxFieldProps) {
  return (
    <div>
      <label
        className={cn(
          'checkbox-row flex min-h-touch-min items-center gap-3',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        )}
      >
        <input
          type="checkbox"
          className={cn(dangCheckboxClass, 'mt-0', disabled && 'cursor-not-allowed')}
          checked={checked}
          disabled={disabled}
          onChange={event => onChange(event.target.checked)}
        />
        <span>{label}</span>
      </label>
      {hint ? <p className={formHintClass}>{hint}</p> : null}
    </div>
  )
}
