import type { CustomForm } from '../types';

export type TransactionTypeSegmentOption = {
  id: string;
  label: string;
  tone?: 'income' | 'expense';
};

export function transactionTypeOptionsFromForms(
  forms: CustomForm[],
  { includeAll = false }: { includeAll?: boolean } = {}
): TransactionTypeSegmentOption[] {
  const options: TransactionTypeSegmentOption[] = [];

  if (includeAll) {
    options.push({ id: 'all', label: 'همه' });
  }

  for (const form of forms) {
    options.push({
      id: form.id,
      label: form.name,
      tone:
        form.type === 'income'
          ? 'income'
          : form.type === 'expense'
            ? 'expense'
            : undefined,
    });
  }

  return options;
}

export default function TransactionTypeSegment({
  options,
  value,
  onChange,
  className,
  ariaLabel = 'نوع تراکنش',
}: {
  options: TransactionTypeSegmentOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  if (options.length <= 1) return null;

  return (
    <div
      className={['records-type-segment', className].filter(Boolean).join(' ')}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = value === option.id;

        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={[
              isActive ? 'active' : '',
              isActive && option.tone === 'income' ? 'income' : '',
              isActive && option.tone === 'expense' ? 'expense' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
