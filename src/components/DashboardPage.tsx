import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { getSettings, isConfigured } from '../services/settings';
import { loadDashboardData } from '../services/dashboard';
import type { CustomForm, DashboardData } from '../types';
import { isTokenValid } from '../services/auth';
import {
  DATE_RANGE_PRESETS,
  getDateRange,
  formatDateRangeLabel,
  type DateRangePreset,
} from '../utils/dateRange';
import { formatMoney } from '../utils/formatMoney';

const INCOME_COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'];
const EXPENSE_COLORS = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'];

type TransactionTypeFilter = 'all' | 'income' | 'expense';

function getCategoryOptions(
  forms: CustomForm[],
  typeFilter: TransactionTypeFilter,
  records: { type: 'income' | 'expense'; category: string }[]
): string[] {
  const fromForm = (type: 'income' | 'expense') => {
    const form = forms.find((f) => f.type === type);
    const field = form?.fields.find((f) => f.id === 'category');
    return field?.options ?? [];
  };

  let configured: string[];
  if (typeFilter === 'income') configured = fromForm('income');
  else if (typeFilter === 'expense') configured = fromForm('expense');
  else configured = [...fromForm('income'), ...fromForm('expense')];

  const fromRecords = records
    .filter((r) => typeFilter === 'all' || r.type === typeFilter)
    .map((r) => r.category);

  return [...new Set([...configured, ...fromRecords])];
}

export default function DashboardPage({ onReauth }: { onReauth?: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('month-to-date');
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const dateRange = getDateRange(datePreset);

  const load = useCallback(async () => {
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.();
      return;
    }
    const settings = getSettings();
    if (!settings) return;

    setLoading(true);
    setError('');
    try {
      const range = getDateRange(datePreset);
      const dash = await loadDashboardData(settings, range);
      setData(dash);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [onReauth, datePreset]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePresetChange = (preset: DateRangePreset) => {
    setDatePreset(preset);
  };

  const settings = getSettings();
  const categoryOptions = useMemo(
    () =>
      getCategoryOptions(
        settings?.forms ?? [],
        typeFilter,
        data?.recentRecords ?? []
      ),
    [settings?.forms, typeFilter, data?.recentRecords]
  );

  const filteredRecords = useMemo(() => {
    if (!data?.recentRecords.length) return [];
    return data.recentRecords.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      return true;
    });
  }, [data?.recentRecords, typeFilter, categoryFilter]);

  const handleTypeFilterChange = (filter: TransactionTypeFilter) => {
    setTypeFilter(filter);
    setCategoryFilter('all');
  };

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">📊</div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="empty-state">
        <p>در حال بارگذاری داشبورد...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="dashboard-filter-section">
        <div className="form-tabs dashboard-filter">
          {DATE_RANGE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={datePreset === preset.id ? 'active' : ''}
              onClick={() => handlePresetChange(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className="dashboard-filter-range">{formatDateRangeLabel(dateRange)}</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-income">
          <span className="stat-label">درآمد</span>
          <span className="stat-value" dir="ltr">
            {formatMoney(data?.totalIncome ?? 0)}
          </span>
        </div>
        <div className="stat-card stat-expense">
          <span className="stat-label">هزینه</span>
          <span className="stat-value" dir="ltr">
            {formatMoney(data?.totalExpense ?? 0)}
          </span>
        </div>
        <div className="stat-card stat-balance">
          <span className="stat-label">مانده</span>
          <span className="stat-value" dir="ltr">
            {formatMoney(data?.balance ?? 0)}
          </span>
        </div>
      </div>

      {(data?.expenseByCategory.length ?? 0) > 0 && (
        <div className="card chart-card">
          <h3 className="chart-title">هزینه بر اساس دسته‌بندی</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data!.expenseByCategory}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={75}
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {data!.expenseByCategory.map((_, i) => (
                  <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatMoney(Number(v) || 0)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {(data?.incomeByCategory.length ?? 0) > 0 && (
        <div className="card chart-card">
          <h3 className="chart-title">درآمد بر اساس دسته‌بندی</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data!.incomeByCategory}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={75}
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {data!.incomeByCategory.map((_, i) => (
                  <Cell key={i} fill={INCOME_COLORS[i % INCOME_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatMoney(Number(v) || 0)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <div className="card-header-row">
          <h3 className="chart-title">آخرین تراکنش‌ها</h3>
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            ↻
          </button>
        </div>

        <div className="transaction-filters">
          <div className="form-tabs transaction-type-filter">
            <button
              type="button"
              className={typeFilter === 'all' ? 'active' : ''}
              onClick={() => handleTypeFilterChange('all')}
            >
              همه
            </button>
            <button
              type="button"
              className={typeFilter === 'income' ? 'active' : ''}
              onClick={() => handleTypeFilterChange('income')}
            >
              درآمد
            </button>
            <button
              type="button"
              className={typeFilter === 'expense' ? 'active' : ''}
              onClick={() => handleTypeFilterChange('expense')}
            >
              هزینه
            </button>
          </div>

          <div className="form-group transaction-category-filter">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">همه دسته‌بندی‌ها</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!data?.recentRecords.length ? (
          <p className="empty-text">هنوز تراکنشی ثبت نشده</p>
        ) : !filteredRecords.length ? (
          <p className="empty-text">تراکنشی با این فیلتر یافت نشد</p>
        ) : (
          filteredRecords.map((r, i) => (
            <div key={i} className="record-item">
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {r.formName} · {r.category} · {r.createdAt}
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
