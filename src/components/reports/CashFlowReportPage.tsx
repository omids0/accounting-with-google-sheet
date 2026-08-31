import { useCallback, useEffect, useState } from 'react';
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
