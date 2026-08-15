import { useState, useEffect, useCallback } from 'react';
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
import type { DashboardData } from '../types';
import { isTokenValid } from '../services/auth';

const INCOME_COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'];
const EXPENSE_COLORS = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'];

function formatMoney(n: number): string {
  return n.toLocaleString('fa-IR');
}

export default function DashboardPage({ onReauth }: { onReauth?: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const dash = await loadDashboardData(settings);
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
  }, [onReauth]);

  useEffect(() => {
    load();
  }, [load]);

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
        {!data?.recentRecords.length ? (
          <p className="empty-text">هنوز تراکنشی ثبت نشده</p>
        ) : (
          data.recentRecords.map((r, i) => (
            <div key={i} className="record-item">
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {r.formName} · {r.createdAt}
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
