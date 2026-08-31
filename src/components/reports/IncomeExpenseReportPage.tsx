import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSettings, isConfigured } from '../../services/settings';
import { loadDashboardData } from '../../services/dashboard';
import { isTokenValid } from '../../services/auth';
import type { DashboardData } from '../../types';
import { getInstallmentDueRange, type DateRangePreset } from '../../utils/dateRange';
import { formatIsoDatePersian } from '../../utils/jalaliDate';
import { showError } from '../../utils/toast';
import { DashboardSkeleton } from '../skeleton';
import MoneyDisplay from '../MoneyDisplay';
import TransactionTypeSegment, {
  type TransactionTypeSegmentOption,
} from '../TransactionTypeSegment';
import { CategoryBarChart } from '../charts';
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

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  if (loading && !data) {
    return <DashboardSkeleton />;
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
        <div className="stat-card stat-income">
          <span className="stat-label">درآمد</span>
          <MoneyDisplay amount={data?.totalIncome ?? 0} size="stat" tone="income" />
        </div>
        <div className="stat-card stat-expense">
          <span className="stat-label">هزینه</span>
          <MoneyDisplay amount={data?.totalExpense ?? 0} size="stat" tone="expense" />
        </div>
      </div>

      <CategoryBarChart
        title="هزینه بر اساس دسته‌بندی"
        data={data?.expenseByCategory ?? []}
        tone="expense"
      />

      <CategoryBarChart
        title="درآمد بر اساس دسته‌بندی"
        data={data?.incomeByCategory ?? []}
        tone="income"
      />

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
            <div key={`${record.date}-${index}`} className="record-item">
              <div className="record-item-main">
                <div className="record-item-title">{record.title}</div>
                <div className="record-item-meta">
                  {record.formName} · {record.category} · {formatIsoDatePersian(record.date)}
                </div>
              </div>
              <MoneyDisplay
                amount={record.amount}
                size="record"
                tone={record.type === 'income' ? 'income' : 'expense'}
                signed
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
