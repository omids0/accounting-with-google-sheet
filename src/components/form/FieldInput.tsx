import type { FieldConfig } from '../../types';
import AmountInput from '../AmountInput';
import JalaliDatePicker from '../JalaliDatePicker';
import FormField from './FormField';
import Select from './Select';

interface FieldInputProps {
  field: FieldConfig;
  value: string | number;
  onChange: (value: string | number) => void;
}

export default function FieldInput({ field, value, onChange }: FieldInputProps) {
  return (
    <FormField label={field.label} required={field.required}>
      {field.type === 'text' && (
        <input
          type="text"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === 'number' && field.id === 'amount' && (
        <AmountInput value={value ?? ''} onChange={onChange} />
      )}

      {field.type === 'number' && field.id !== 'amount' && (
        <input
          type="number"
          inputMode="decimal"
          value={value === '' ? '' : value}
          onChange={(e) =>
            onChange(e.target.value === '' ? '' : Number(e.target.value))
          }
          dir="ltr"
        />
      )}

      {field.type === 'date' && (
        <JalaliDatePicker
          value={String(value ?? '')}
          onChange={(iso) => onChange(iso)}
        />
      )}

      {field.type === 'select' && (
        <Select
          value={String(value ?? '')}
          onChange={onChange}
          options={(field.options ?? []).map((opt) => ({
            value: opt,
            label: opt,
          }))}
        />
      )}
    </FormField>
  );
}
