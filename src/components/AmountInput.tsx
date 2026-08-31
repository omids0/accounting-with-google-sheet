import { numberToPersianWords } from '../utils/numberToWords';
import { getCurrencySymbol } from '../utils/formatMoney';

interface AmountInputProps {
  value: string | number;
  onChange: (value: number | '') => void;
  compact?: boolean;
  onBlur?: () => void;
}

function parseDigitInput(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\d]/g, '');
}

export default function AmountInput({
  value,
  onChange,
  compact = false,
  onBlur,
}: AmountInputProps) {
  const raw = value === '' || value === undefined ? '' : String(Math.trunc(Number(value)));
  const display = raw ? Number(raw).toLocaleString('fa-IR') : '';
  const words = raw ? numberToPersianWords(Number(raw)) : '';
  const currency = getCurrencySymbol();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = parseDigitInput(e.target.value);
    onChange(digits === '' ? '' : Number(digits));
  };

  if (compact) {
    return (
      <div className="amount-field amount-field--compact">
        <div className="amount-field-input-wrap amount-field-input-wrap--compact">
          <input
            type="text"
            inputMode="numeric"
            value={display}
            onChange={handleChange}
            onBlur={onBlur}
            dir="ltr"
            placeholder="۰"
            className="amount-field-input amount-input-compact numeric"
            aria-label="مبلغ"
          />
          <span className="amount-field-currency">{currency}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="amount-field">
      <div className="amount-field-input-wrap">
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          onBlur={onBlur}
          dir="ltr"
          placeholder="۰"
          className="amount-field-input numeric"
          aria-label="مبلغ"
        />
        <span className="amount-field-currency">{currency}</span>
      </div>
      {words && (
        <p className="amount-words">
          {words} {currency}
        </p>
      )}
    </div>
  );
}
