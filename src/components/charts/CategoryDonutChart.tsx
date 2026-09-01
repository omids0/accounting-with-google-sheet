import { memo, useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatMoney, formatPersianNumber } from '../../utils/formatMoney';
import { useChartTheme, prefersReducedMotion } from '../../hooks/useChartTheme';
import ChartTooltip from './ChartTooltip';

type ChartTooltipEntry = {
  name?: string | number;
  dataKey?: string | number;
  value?: number | string;
};

interface CategoryDonutChartProps {
  title: string;
  data: { name: string; total: number }[];
  tone: 'income' | 'expense';
  className?: string;
  maxSlices?: number;
}

function buildSlices(
  data: { name: string; total: number }[],
  maxSlices: number
): { name: string; total: number }[] {
  if (data.length <= maxSlices) return data;

  const sorted = [...data].sort((a, b) => b.total - a.total);
  const top = sorted.slice(0, maxSlices - 1);
  const restTotal = sorted.slice(maxSlices - 1).reduce((sum, item) => sum + item.total, 0);

  return restTotal > 0 ? [...top, { name: 'سایر', total: restTotal }] : top;
}

function CategoryDonutChart({
  title,
  data,
  tone,
  className = '',
  maxSlices = 6,
}: CategoryDonutChartProps) {
  const theme = useChartTheme();
  const animate = !prefersReducedMotion();

  const slices = useMemo(() => buildSlices(data, maxSlices), [data, maxSlices]);
  const total = useMemo(
    () => slices.reduce((sum, item) => sum + item.total, 0),
    [slices]
  );
  const palette = tone === 'income' ? theme.incomePalette : theme.expensePalette;

  if (!slices.length) return null;

  return (
    <div className={`card chart-card chart-card--animated category-donut-card ${className}`.trim()}>
      <h3 className="chart-title">{title}</h3>
      <div className="category-donut-layout" dir="ltr">
        <div className="category-donut-chart-wrap">
          <ResponsiveContainer width="100%" height={168}>
            <PieChart>
              <Pie
                data={slices}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={72}
                paddingAngle={2}
                stroke="none"
                isAnimationActive={animate}
                animationDuration={700}
                animationEasing="ease-out"
              >
                {slices.map((slice, index) => (
                  <Cell
                    key={slice.name}
                    fill={palette[index % palette.length]}
                    className="category-donut-slice"
                  />
                ))}
              </Pie>
              <Tooltip
                content={(props) => (
                  <ChartTooltip
                    active={props.active}
                    payload={props.payload as unknown as ChartTooltipEntry[] | undefined}
                    label={String(props.label ?? '')}
                  />
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="category-donut-center" dir="rtl">
            <span className="category-donut-center-label">مجموع</span>
            <span className="category-donut-center-value">{formatMoney(total)}</span>
          </div>
        </div>

        <ul className="category-donut-legend" dir="rtl">
          {slices.map((slice, index) => {
            const pct = total > 0 ? Math.round((slice.total / total) * 100) : 0;
            return (
              <li key={slice.name} className="category-donut-legend-item">
                <span
                  className="category-donut-legend-dot"
                  style={{ background: palette[index % palette.length] }}
                />
                <span className="category-donut-legend-name">{slice.name}</span>
                <span className="category-donut-legend-pct">
                  {formatPersianNumber(pct, { useGrouping: false })}٪
                </span>
                <span className="category-donut-legend-value" dir="ltr">
                  {formatMoney(slice.total)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default memo(CategoryDonutChart);
