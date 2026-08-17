import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { getSettings, isConfigured } from '../services/settings';
import { loadDashboardData } from '../services/dashboard';
import type { DashboardData, DashboardNavTarget } from '../types';
import { isTokenValid } from '../services/auth';
import { DashboardSkeleton } from './skeleton';
import DateRangeFilter, {
  createDefaultDateRangeFilter,
  type AppliedDateRangeFilter,
} from './DateRangeFilter';
import TransactionTypeSegment, {
  type TransactionTypeSegmentOption,
} from './TransactionTypeSegment';
import {
  getInstallmentDueRange,
  formatDateRangeLabel,
  resolveDateRange,
  type DateRangePreset,
  type RecordsDatePreset,
} from '../utils/dateRange';
import { formatMoney } from '../utils/formatMoney';
import { formatIsoDatePersian } from '../utils/jalaliDate';
import { showError } from '../utils/toast';

const INCOME_COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'];
const EXPENSE_COLORS = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'];

function CategoryBarChart({
  title,
  data,
  colors,
}: {
  title: string;
  data: { name: string; total: number }[];
  colors: string[];
}) {
  const height = Math.max(220, data.length * 44);
  const maxLabelLen = Math.max(...data.map((d) => d.name.length), 1);
  const yAxisWidth = Math.min(96, Math.max(36, Math.ceil(maxLabelLen * 6.5)));

  return (
    <div className="card chart-card">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-bar-wrap" dir="ltr">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
          >
            <XAxis
              type="number"
              tickFormatter={(v) => formatMoney(v)}
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={yAxisWidth}
              orientation="left"
              tick={{
                fontSize: 12,
                fill: '#6b7280',
                textAnchor: 'end',
              }}
              tickMargin={4}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v) => formatMoney(Number(v) || 0)}
              labelFormatter={(label) => label}
            />
            <Bar name="مجموع" dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={32}>
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type TransactionTypeFilter = 'all' | 'income' | 'expense';

function BreakdownRow({
  label,
  value,
  total,
  onNavigate,
}: {
  label: string;
  value: number;
  total?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className={`asset-row${total ? ' asset-row-total' : ''}`}>
      {onNavigate ? (
        <button type="button" className="asset-label asset-label-link" onClick={onNavigate}>
          {label}
        </button>
      ) : (
        <span className="asset-label">{label}</span>
      )}
      <span className="asset-value" dir="ltr">
        {formatMoney(value)}
      </span>
    </div>
  );
}

export default function DashboardPage({
  onReauth,
  onViewRecords,
  onNavigate,
}: {
  onReauth?: () => void;
  onViewRecords?: (formType?: 'income' | 'expense') => void;
  onNavigate?: (target: DashboardNavTarget) => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [datePreset, setDatePreset] = useState<RecordsDatePreset>('month-to-date');
  const [customRange, setCustomRange] = useState(
    () => createDefaultDateRangeFilter().customRange
  );
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const dateRange = resolveDateRange(datePreset, customRange);

  const load = useCallback(async () => {
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.();
      return;
    }
    const settings = getSettings();
    if (!settings) return;

    setLoading(true);
    try {
      const range = resolveDateRange(datePreset, customRange);
      const installmentRange =
        datePreset === 'custom'
          ? range
          : getInstallmentDueRange(datePreset as DateRangePreset);
      const dash = await loadDashboardData(settings, range, installmentRange);
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
  }, [onReauth, datePreset, customRange]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDateFilterChange = (filter: AppliedDateRangeFilter) => {
    setDatePreset(filter.preset);
    setCustomRange(filter.customRange);
  };

  const filteredRecords = useMemo(() => {
    if (!data?.recentRecords.length) return [];
    return data.recentRecords
      .filter((r) => typeFilter === 'all' || r.type === typeFilter)
      .slice(0, 10);
  }, [data?.recentRecords, typeFilter]);

  const financial = data?.financial;
  const settings = getSettings();
  const incomeForm = settings?.forms.find((f) => f.type === 'income');
  const expenseForm = settings?.forms.find((f) => f.type === 'expense');
  const transactionTypeOptions: TransactionTypeSegmentOption[] = [
    { id: 'all', label: 'همه' },
    { id: 'income', label: incomeForm?.name ?? 'درآمد', tone: 'income' },
    { id: 'expense', label: expenseForm?.name ?? 'هزینه', tone: 'expense' },
  ];

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">📊</div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="dashboard-page">
      <div className="card records-toolbar dashboard-toolbar">
        <div className="records-toolbar-header">
          <div className="records-toolbar-heading">
            <h2 className="records-toolbar-title">داشبورد</h2>
            <p className="records-toolbar-range">{formatDateRangeLabel(dateRange)}</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm records-refresh-btn"
            onClick={load}
            disabled={loading}
            aria-label="بارگذاری مجدد"
          >
            {loading ? '...' : '↻'}
          </button>
        </div>

        <DateRangeFilter
          preset={datePreset}
          customRange={customRange}
          onChange={handleDateFilterChange}
          loading={loading}
        />
      </div>

      <div className="card dashboard-hero-card">
        <div className="dashboard-hero-label">دارایی قابل اتکا</div>
        <div className="dashboard-hero-value" dir="ltr">
          {formatMoney(financial?.netAvailable ?? 0)}
        </div>
        <p className="dashboard-hero-hint">
          مجموع دارایی‌ها منهای بدهی‌های پیش‌رو این دوره
        </p>
      </div>

      <div className="dashboard-flow-section">
        <div className="stat-grid dashboard-stat-grid">
          <div className="stat-card stat-income">
            <span className="stat-label">درآمد دوره</span>
            <span className="stat-value" dir="ltr">
              {formatMoney(data?.totalIncome ?? 0)}
            </span>
          </div>
          <div className="stat-card stat-expense">
            <span className="stat-label">هزینه دوره</span>
            <span className="stat-value" dir="ltr">
              {formatMoney(data?.totalExpense ?? 0)}
            </span>
          </div>
        </div>
        <div
          className={`stat-card stat-flow stat-card-wide${
            (data?.balance ?? 0) < 0
              ? ' stat-flow-negative'
              : (data?.balance ?? 0) > 0
                ? ' stat-flow-positive'
                : ''
          }`}
        >
          <span className="stat-label">خالص دوره</span>
          <span className="stat-value" dir="ltr">
            {formatMoney(data?.balance ?? 0)}
          </span>
        </div>
        <div className="stat-card stat-balance stat-card-wide">
          <span className="stat-label">مانده محاسبه‌شده</span>
          <span className="stat-value" dir="ltr">
            {formatMoney(data?.periodBalance ?? 0)}
          </span>
        </div>
      </div>

      <div className="card dashboard-assets-card">
        <h3 className="chart-title">دارایی‌ها</h3>
        <div className="asset-breakdown">
          <BreakdownRow
            label="کیف پول"
            value={financial?.walletTotal ?? 0}
            onNavigate={onNavigate ? () => onNavigate('wallet') : undefined}
          />
          <BreakdownRow
            label="صندوقچه"
            value={financial?.treasuryTotal ?? 0}
            onNavigate={onNavigate ? () => onNavigate('treasury') : undefined}
          />
          <BreakdownRow
            label="طلب‌ها"
            value={financial?.receivablesTotal ?? 0}
            onNavigate={onNavigate ? () => onNavigate('receivables') : undefined}
          />
          <BreakdownRow
            label="مجموع دارایی‌ها"
            value={financial?.totalAssets ?? 0}
            total
          />
        </div>
      </div>

      <div className="card dashboard-assets-card dashboard-liabilities-card">
        <h3 className="chart-title">بدهی‌ها</h3>
        <div className="asset-breakdown">
          <BreakdownRow
            label="اقساط این دوره"
            value={financial?.installmentsDue ?? 0}
            onNavigate={onNavigate ? () => onNavigate('installments') : undefined}
          />
          <BreakdownRow
            label="دنگ‌ها"
            value={financial?.dangsTotal ?? 0}
            onNavigate={onNavigate ? () => onNavigate('dang') : undefined}
          />
          <BreakdownRow
            label="چک‌های این دوره"
            value={financial?.checksDue ?? 0}
            onNavigate={onNavigate ? () => onNavigate('checks') : undefined}
          />
          <BreakdownRow
            label="مجموع بدهی‌ها"
            value={financial?.totalLiabilities ?? 0}
            total
          />
        </div>
      </div>

      {(data?.expenseByCategory.length ?? 0) > 0 && (
        <CategoryBarChart
          title="هزینه بر اساس دسته‌بندی"
          data={data!.expenseByCategory}
          colors={EXPENSE_COLORS}
        />
      )}

      {(data?.incomeByCategory.length ?? 0) > 0 && (
        <CategoryBarChart
          title="درآمد بر اساس دسته‌بندی"
          data={data!.incomeByCategory}
          colors={INCOME_COLORS}
        />
      )}

      <div className="card">
        <div className="card-header-row">
          <h3 className="chart-title">تراکنش‌های دوره</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!!data?.recentRecords.length && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  onViewRecords?.(
                    typeFilter === 'all' ? undefined : typeFilter
                  )
                }
              >
                جزئیات بیشتر
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
              ↻
            </button>
          </div>
        </div>

        <TransactionTypeSegment
          className="dashboard-transaction-segment"
          options={transactionTypeOptions}
          value={typeFilter}
          onChange={(id) => setTypeFilter(id as TransactionTypeFilter)}
        />

        {!data?.recentRecords.length ? (
          <p className="empty-text">هنوز تراکنشی در این دوره ثبت نشده</p>
        ) : !filteredRecords.length ? (
          <p className="empty-text">تراکنشی با این فیلتر یافت نشد</p>
        ) : (
          filteredRecords.map((r, i) => (
            <div key={i} className="record-item">
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {r.formName} · {r.category} · {formatIsoDatePersian(r.date)}
                </div>
              </div>
              <div
                className={r.type === 'income' ? 'amount-income' : 'amount-expense'}
                dir="ltr"
              >
                {r.type === 'income' ? '+' : '-'}
                {formatMoney(r.amount)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
