import type { ReactNode } from 'react'

import FormField from './FormField'
import Select, { type SelectOption } from './Select'
import type { FormControlWidth } from '../ui/formStyles'

interface FormSelectProps {
  label?: string
  required?: boolean
  hint?: ReactNode
  /** Error text under the control; the select is marked invalid. */
  error?: string
  className?: string
  controlWidth?: FormControlWidth
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  disabled?: boolean
  /** Name of the select; defaults to `label`. `Select` reads the chosen value after it. */
  'aria-label'?: string
  placeholder?: string
  compact?: boolean
}

export default function FormSelect({
  label,
  required,
  hint,
  error,
  className,
  controlWidth = 'full',
  value,
  onChange,
  options,
  disabled,
  'aria-label': ariaLabel,
  placeholder,
  compact
}: FormSelectProps) {
  return (
    <FormField
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}
      controlWidth={controlWidth}
    >
      <Select
        value={value}
        onChange={onChange}
        options={options}
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        placeholder={placeholder}
        compact={compact}
      />
    </FormField>
  )
}
