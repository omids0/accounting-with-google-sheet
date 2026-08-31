import AmountInput from './AmountInput';

interface CardInlineAmountEditProps {
  label: string;
  value: string | number;
  onChange: (value: number | '') => void;
  onBlur?: () => void;
  saving?: boolean;
  className?: string;
}

export default function CardInlineAmountEdit({
  label,
  value,
  onChange,
  onBlur,
  saving = false,
  className,
}: CardInlineAmountEditProps) {
  return (
    <div className={['card-inline-edit', className].filter(Boolean).join(' ')}>
      <div className="card-inline-edit-field">
        <label className="card-inline-edit-label">{label}</label>
        <AmountInput compact value={value} onChange={onChange} onBlur={onBlur} />
      </div>
      {saving && <span className="spinner card-inline-edit-spinner" aria-label="در حال ذخیره" />}
    </div>
  );
}
