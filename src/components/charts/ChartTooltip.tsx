import { formatMoney } from '../../utils/formatMoney';

type ChartTooltipEntry = {
  name?: string | number;
  dataKey?: string | number;
  value?: number | string;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string | number;
};

export default function ChartTooltip({
  active,
  payload,
  label,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip" role="tooltip">
      {label ? <div className="chart-tooltip__label">{label}</div> : null}
      <div className="chart-tooltip__rows">
        {payload.map((entry) => {
          const name = String(entry.name ?? '');
          const displayName =
            name === 'income'
              ? 'درآمد'
              : name === 'expense'
                ? 'هزینه'
                : name === 'total' || name === 'مجموع'
                  ? 'مجموع'
                  : name;
          const tone =
            name === 'income'
              ? 'income'
              : name === 'expense'
                ? 'expense'
                : 'neutral';

          return (
            <div key={`${name}-${String(entry.dataKey)}`} className="chart-tooltip__row">
              <span className={`chart-tooltip__dot chart-tooltip__dot--${tone}`} />
              <span className="chart-tooltip__name">{displayName}</span>
              <span className="chart-tooltip__value" dir="ltr">
                {formatMoney(Number(entry.value) || 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
