import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSettings, isConfigured } from '../../services/settings';
import { loadDashboardData } from '../../services/dashboard';
import { isTokenValid } from '../../services/auth';
import type { DashboardData } from '../../types';
import { getInstallmentDueRange, type DateRangePreset } from '../../utils/dateRange';
import { formatIsoDatePersian } from '../../utils/jalaliDate';
import { monthlySparkline } from '../../utils/sparklineData';
import { showError } from '../../utils/toast';
import { DashboardSkeleton } from '../skeleton';
import StatCard from '../StatCard';
import TransactionListItem from '../TransactionListItem';
import MoneyDisplay from '../MoneyDisplay';
import TransactionTypeSegment, {
  type TransactionTypeSegmentOption,
} from '../TransactionTypeSegment';
import { CategoryBarChart, CategoryDonutChart } from '../charts';
import { getCategoryBarYAxisWidth } from '../charts/chartUtils';
import ReportToolbar, { useReportDateFilter } from './ReportToolbar';

type TransactionTypeFilter = 'all' | 'income' | 'expense';

export default function IncomeExpenseReportPage({ onReauth }: { onReauth?: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
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
      const dash = await loadDashboardData(settings, dateRange, installmentRange);
      setData(dash);
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
  }, [onReauth, datePreset, customRange.start, customRange.end]);

  useEffect(() => {
    load();
  }, [load]);

  const settings = getSettings();
  const incomeForm = settings?.forms.find((f) => f.type === 'income');
  const expenseForm = settings?.forms.find((f) => f.type === 'expense');
  const transactionTypeOptions: TransactionTypeSegmentOption[] = [
    { id: 'all', label: 'همه' },
    { id: 'income', label: incomeForm?.name ?? 'درآمد', tone: 'income' },
    { id: 'expense', label: expenseForm?.name ?? 'هزینه', tone: 'expense' },
  ];

  const filteredRecords = useMemo(() => {
    if (!data?.recentRecords.length) return [];
    return data.recentRecords.filter((r) => typeFilter === 'all' || r.type === typeFilter);
  }, [data?.recentRecords, typeFilter]);

  const categoryYAxisWidth = useMemo(
    () =>
      getCategoryBarYAxisWidth([
        data?.expenseByCategory ?? [],
        data?.incomeByCategory ?? [],
      ]),
    [data?.expenseByCategory, data?.incomeByCategory]
  );

  const incomeSparkline = monthlySparkline(data?.yearlyMonthlyFlow ?? [], 'income');
  const expenseSparkline = monthlySparkline(data?.yearlyMonthlyFlow ?? [], 'expense');

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  if (loading && !data) {
    return <DashboardSkeleton variant="report" />;
  }

  return (
    <div className="dashboard-page report-page">
      <ReportToolbar
        title="درآمد و هزینه"
        preset={datePreset}
        customRange={customRange}
        onFilterChange={handleDateFilterChange}
        onRefresh={load}
        loading={loading}
      />

      <div className="stat-grid dashboard-stat-grid">
        <StatCard
          label="درآمد"
          amount={data?.totalIncome ?? 0}
          variant="income"
          sparklineData={incomeSparkline}
          animateIndex={0}
          lift
        />
        <StatCard
          label="هزینه"
          amount={data?.totalExpense ?? 0}
          variant="expense"
          sparklineData={expenseSparkline}
          animateIndex={1}
          lift
        />
      </div>

      {(data?.expenseByCategory.length ?? 0) > 0 && (
        <>
          <CategoryDonutChart
            title="سهم هزینه‌ها"
            data={data!.expenseByCategory}
            tone="expense"
          />
          <CategoryBarChart
            title="هزینه بر اساس دسته‌بندی"
            data={data?.expenseByCategory ?? []}
            tone="expense"
            yAxisWidth={categoryYAxisWidth}
          />
        </>
      )}

      {(data?.incomeByCategory.length ?? 0) > 0 && (
        <>
          <CategoryDonutChart
            title="سهم درآمدها"
            data={data!.incomeByCategory}
            tone="income"
          />
          <CategoryBarChart
            title="درآمد بر اساس دسته‌بندی"
            data={data?.incomeByCategory ?? []}
            tone="income"
            yAxisWidth={categoryYAxisWidth}
          />
        </>
      )}

      <div className="card">
        <h3 className="chart-title">تراکنش‌های دوره</h3>
        <TransactionTypeSegment
          className="dashboard-transaction-segment"
          options={transactionTypeOptions}
          value={typeFilter}
          onChange={(id) => setTypeFilter(id as TransactionTypeFilter)}
        />

        {!filteredRecords.length ? (
          <p className="empty-text">تراکنشی در این دوره ثبت نشده</p>
        ) : (
          filteredRecords.map((record, index) => (
            <TransactionListItem
              key={`${record.date}-${index}`}
              title={record.title}
              meta={`${record.formName} · ${record.category} · ${formatIsoDatePersian(record.date)}`}
              tone={record.type === 'income' ? 'income' : 'expense'}
              index={index}
            >
              <MoneyDisplay
                amount={record.amount}
                size="record"
                tone={record.type === 'income' ? 'income' : 'expense'}
                signed
              />
            </TransactionListItem>
          ))
        )}
      </div>
    </div>
  );
}
