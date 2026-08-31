import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getSettings, isConfigured } from '../../services/settings';
import { loadDashboardData } from '../../services/dashboard';
import { isTokenValid } from '../../services/auth';
import type { MonthlyFlow } from '../../types';
import { getInstallmentDueRange, type DateRangePreset } from '../../utils/dateRange';
import { formatMoney } from '../../utils/formatMoney';
import { showError } from '../../utils/toast';
import { DashboardSkeleton } from '../skeleton';
import MoneyDisplay from '../MoneyDisplay';
import YearFilter, { getDefaultChartYear } from '../YearFilter';
import ReportToolbar, { useReportDateFilter } from './ReportToolbar';

const INCOME_BAR_COLOR = '#16a34a';
const EXPENSE_BAR_COLOR = '#dc2626';

export default function CashFlowReportPage({ onReauth }: { onReauth?: () => void }) {
  const [monthlyFlow, setMonthlyFlow] = useState<MonthlyFlow[]>([]);
  const [loading, setLoading] = useState(false);
  const [monthlyFlowYear, setMonthlyFlowYear] = useState(getDefaultChartYear);
  const { datePreset, customRange, handleDateFilterChange, dateRange } = useReportDateFilter();

  const load = useCallback(async () => {
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.();
      return;
    }
    const settings = getSettings();
    if (!settings) return;

    setLoading(true);
    try {
      const installmentRange =
        datePreset === 'custom'
          ? dateRange
          : getInstallmentDueRange(datePreset as DateRangePreset);
      const dash = await loadDashboardData(
        settings,
        dateRange,
        installmentRange,
        monthlyFlowYear
      );
      setMonthlyFlow(dash.yearlyMonthlyFlow);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, [onReauth, datePreset, customRange.start, customRange.end, monthlyFlowYear]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = monthlyFlow.map((item) => ({
    ...item,
    shortLabel: item.label.split(' ')[0] ?? item.label,
  }));
  const totals = monthlyFlow.reduce(
    (acc, item) => ({
      income: acc.income + item.income,
      expense: acc.expense + item.expense,
      net: acc.net + item.net,
    }),
    { income: 0, expense: 0, net: 0 }
  );
  const height = Math.max(280, chartData.length * 52);
  const maxLabelLen = chartData.length
    ? Math.max(...chartData.map((d) => d.shortLabel.length))
    : 1;
  const yAxisWidth = Math.min(72, Math.max(44, Math.ceil(maxLabelLen * 7)));

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  if (loading && !monthlyFlow.length) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="dashboard-page report-page">
      <ReportToolbar
        title="جریان نقدی"
        preset={datePreset}
        customRange={customRange}
        onFilterChange={handleDateFilterChange}
        onRefresh={load}
        loading={loading}
        showDateFilter={false}
        subtitle={`سال ${monthlyFlowYear.toLocaleString('fa-IR')}`}
      />

      <div className="stat-grid dashboard-stat-grid">
        <div className="stat-card stat-income">
          <span className="stat-label">کل درآمد سال</span>
          <MoneyDisplay amount={totals.income} size="stat" tone="income" />
        </div>
        <div className="stat-card stat-expense">
          <span className="stat-label">کل هزینه سال</span>
          <MoneyDisplay amount={totals.expense} size="stat" tone="expense" />
        </div>
      </div>

      <div
        className={`stat-card stat-flow stat-card-wide${
          totals.net < 0 ? ' stat-flow-negative' : totals.net > 0 ? ' stat-flow-positive' : ''
        }`}
      >
        <span className="stat-label">خالص سال</span>
        <MoneyDisplay
          amount={totals.net}
          size="stat-wide"
          tone={totals.net < 0 ? 'negative' : totals.net > 0 ? 'positive' : 'primary'}
        />
      </div>

      <div className="card chart-card">
        <YearFilter year={monthlyFlowYear} onChange={setMonthlyFlowYear} loading={loading}>
          {({ trigger, panel }) => (
            <>
              <div className="card-header-row">
                <h3 className="chart-title">درآمد و هزینه ماهانه</h3>
                {trigger}
              </div>
              {panel}
            </>
          )}
        </YearFilter>

        {!chartData.length ? (
          <p className="empty-text">داده‌ای برای این سال ثبت نشده</p>
        ) : (
          <div className="chart-bar-wrap chart-monthly-wrap" dir="ltr">
            <ResponsiveContainer width="100%" height={height}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
              >
                <XAxis
                  type="number"
                  tickFormatter={(value) => formatMoney(value)}
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="shortLabel"
                  width={yAxisWidth}
                  orientation="left"
                  tick={{ fontSize: 12, fill: '#6b7280', textAnchor: 'end' }}
                  tickMargin={4}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatMoney(Number(value) || 0),
                    name === 'income' ? 'درآمد' : 'هزینه',
                  ]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
                />
                <Legend formatter={(value) => (value === 'income' ? 'درآمد' : 'هزینه')} />
                <Bar
                  name="income"
                  dataKey="income"
                  fill={INCOME_BAR_COLOR}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={14}
                />
                <Bar
                  name="expense"
                  dataKey="expense"
                  fill={EXPENSE_BAR_COLOR}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={14}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {!!monthlyFlow.length && (
        <div className="card">
          <h3 className="chart-title">جدول ماهانه</h3>
          {monthlyFlow.map((item) => (
            <div key={item.monthKey} className="report-table-row">
              <span className="report-table-label">{item.label}</span>
              <span className="report-table-values" dir="ltr">
                <span className="report-value-income">{formatMoney(item.income)}</span>
                <span className="report-value-expense">{formatMoney(item.expense)}</span>
                <span
                  className={
                    item.net < 0
                      ? 'report-value-negative'
                      : item.net > 0
                        ? 'report-value-positive'
                        : ''
                  }
                >
                  {formatMoney(item.net)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
