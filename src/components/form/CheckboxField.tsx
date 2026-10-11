import { formHintClass } from '../ui/formStyles'

interface CheckboxFieldProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  /** Muted line under the label, e.g. why the box starts unchecked. */
  hint?: string
  disabled?: boolean
}

export default function CheckboxField({
  checked,
  onChange,
  label,
  hint,
  disabled
}: CheckboxFieldProps) {
  return (
    <div>
      <label className="checkbox-row flex items-center gap-2">
        <input
          type="checkbox"
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
