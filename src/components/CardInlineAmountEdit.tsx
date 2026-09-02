import AmountInput from './AmountInput';

interface CardInlineAmountEditProps {
  label: string;
  value: string | number;
  onChange: (value: number | '') => void;
  onBlur?: () => void;
  onClose?: () => void;
  saving?: boolean;
  className?: string;
}

export default function CardInlineAmountEdit({
  label,
  value,
  onChange,
  onBlur,
  onClose,
  saving = false,
  className,
}: CardInlineAmountEditProps) {
  const handleSubmit = () => {
    onBlur?.();
    onClose?.();
  };

  return (
    <div className={['card-inline-edit', className].filter(Boolean).join(' ')}>
      <div className="card-inline-edit-field">
        <label className="card-inline-edit-label">{label}</label>
        <AmountInput
          compact
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onSubmit={onClose ? handleSubmit : undefined}
          submitDisabled={saving}
        />
      </div>
      {saving && <span className="spinner card-inline-edit-spinner" aria-label="در حال ذخیره" />}
    </div>
  );
}
