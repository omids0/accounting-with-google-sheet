import type { ReactNode } from 'react';
import FormField from './FormField';
import Select, { type SelectOption } from './Select';

interface FormSelectProps {
  label?: string;
  required?: boolean;
  hint?: ReactNode;
  className?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  'aria-label'?: string;
  compact?: boolean;
}

export default function FormSelect({
  label,
  required,
  hint,
  className,
  value,
  onChange,
  options,
  disabled,
  'aria-label': ariaLabel,
  compact,
}: FormSelectProps) {
  return (
    <FormField label={label} required={required} hint={hint} className={className}>
      <Select
        value={value}
        onChange={onChange}
        options={options}
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        compact={compact}
      />
    </FormField>
  );
}
