import { formatMoney, formatMoneyParts } from '../utils/formatMoney';

export type MoneyDisplaySize = 'hero' | 'stat' | 'stat-wide' | 'record';
export type MoneyDisplayTone =
  | 'default'
  | 'hero'
  | 'income'
  | 'expense'
  | 'positive'
  | 'negative'
  | 'primary';

export default function MoneyDisplay({
  amount,
  size = 'stat',
  tone = 'default',
  signed = false,
  className = '',
}: {
  amount: number;
  size?: MoneyDisplaySize;
  tone?: MoneyDisplayTone;
  signed?: boolean;
  className?: string;
}) {
  const { number, symbol } = formatMoneyParts(amount);
  const sign =
    signed && amount > 0 ? '+' : signed && amount < 0 ? '−' : signed ? '' : null;

  return (
    <span
      className={`money-display money-display--${size} money-display--${tone}${className ? ` ${className}` : ''}`}
      dir="ltr"
      aria-label={formatMoney(amount)}
    >
      {sign ? <span className="money-display__sign">{sign}</span> : null}
      <span className="money-display__value">{number}</span>
      <span className="money-display__unit">{symbol}</span>
    </span>
  );
}
