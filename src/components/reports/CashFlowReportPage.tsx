import { useCallback, useEffect, useState } from 'react';
import { getSettings, isConfigured } from '../../services/settings';
import { loadDashboardData } from '../../services/dashboard';
import { isTokenValid } from '../../services/auth';
import type { MonthlyFlow } from '../../types';
import { getInstallmentDueRange, type DateRangePreset } from '../../utils/dateRange';
import { formatMoney } from '../../utils/formatMoney';
import { monthlySparkline } from '../../utils/sparklineData';
import { showError } from '../../utils/toast';
import { DashboardSkeleton } from '../skeleton';
import StatCard from '../StatCard';
import YearFilter, { getDefaultChartYear } from '../YearFilter';
import { IncomeExpenseMonthlyChart } from '../charts';
import ReportToolbar, { useReportDateFilter } from './ReportToolbar';

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

  const totals = monthlyFlow.reduce(
    (acc, item) => ({
      income: acc.income + item.income,
      expense: acc.expense + item.expense,
      net: acc.net + item.net,
    }),
    { income: 0, expense: 0, net: 0 }
  );

  const incomeSparkline = monthlySparkline(monthlyFlow, 'income');
  const expenseSparkline = monthlySparkline(monthlyFlow, 'expense');
  const netSparkline = monthlySparkline(monthlyFlow, 'net');

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
        <StatCard
          label="کل درآمد سال"
          amount={totals.income}
          variant="income"
          sparklineData={incomeSparkline}
          animateIndex={0}
          lift
        />
        <StatCard
          label="کل هزینه سال"
          amount={totals.expense}
          variant="expense"
          sparklineData={expenseSparkline}
          animateIndex={1}
          lift
        />
      </div>

      <StatCard
        label="خالص سال"
        amount={totals.net}
        variant="flow"
        wide
        flowDirection={totals.net < 0 ? 'negative' : totals.net > 0 ? 'positive' : 'neutral'}
        sparklineData={netSparkline}
        animateIndex={2}
      />

      <IncomeExpenseMonthlyChart
        data={monthlyFlow}
        header={
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
        }
      />

      {!!monthlyFlow.length && (
        <div className="card">
          <h3 className="chart-title">جدول ماهانه</h3>
          {monthlyFlow.map((item, index) => (
            <div key={item.monthKey} className="report-table-row" style={{ animationDelay: `${index * 0.03}s` }}>
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
