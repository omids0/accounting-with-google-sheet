import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSettings, isConfigured } from '../../services/settings';
import { isTokenValid } from '../../services/auth';
import {
  getDueDateTypeLabel,
  loadDueDatesReport,
  type DueDateItem,
  type DueDateStatus,
} from '../../services/reports';
import { formatIsoDatePersian } from '../../utils/jalaliDate';
import { showError } from '../../utils/toast';
import { InstallmentCardListSkeleton } from '../skeleton';
import MoneyDisplay from '../MoneyDisplay';
import ReportToolbar from './ReportToolbar';

const STATUS_LABELS: Record<DueDateStatus, string> = {
  overdue: 'سررسید گذشته',
  today: 'امروز',
  upcoming: 'پیش‌رو',
};

const STATUS_ORDER: DueDateStatus[] = ['overdue', 'today', 'upcoming'];

function DueDateBadge({ status }: { status: DueDateStatus }) {
  return (
    <span className={`report-due-badge report-due-badge--${status}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function DueDatesReportPage({ onReauth }: { onReauth?: () => void }) {
  const [items, setItems] = useState<DueDateItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.();
      return;
    }
    const settings = getSettings();
    if (!settings?.spreadsheetId) return;

    setLoading(true);
    try {
      const dueItems = await loadDueDatesReport(settings.spreadsheetId);
      setItems(dueItems);
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
  }, [onReauth]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<DueDateStatus, DueDateItem[]>();
    for (const status of STATUS_ORDER) {
      map.set(status, []);
    }
    for (const item of items) {
      map.get(item.status)?.push(item);
    }
    return STATUS_ORDER.map((status) => ({
      status,
      items: map.get(status) ?? [],
    })).filter((group) => group.items.length > 0);
  }, [items]);

  const totals = useMemo(
    () => ({
      overdue: items
        .filter((item) => item.status === 'overdue')
        .reduce((sum, item) => sum + item.amount, 0),
      upcoming: items
        .filter((item) => item.status !== 'overdue')
        .reduce((sum, item) => sum + item.amount, 0),
    }),
    [items]
  );

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  if (loading && !items.length) {
    return <InstallmentCardListSkeleton count={4} />;
  }

  return (
    <div className="dashboard-page report-page">
      <ReportToolbar
        title="سررسیدها"
        preset="month-to-date"
        customRange={{ start: '', end: '' }}
        onFilterChange={() => {}}
        onRefresh={load}
        loading={loading}
        showDateFilter={false}
        subtitle="۳۰ روز آینده و موارد معوق"
      />

      <div className="stat-grid dashboard-stat-grid">
        <div className="stat-card stat-expense">
          <span className="stat-label">معوق</span>
          <MoneyDisplay amount={totals.overdue} size="stat" tone="expense" />
        </div>
        <div className="stat-card stat-income">
          <span className="stat-label">امروز و پیش‌رو</span>
          <MoneyDisplay amount={totals.upcoming} size="stat" tone="primary" />
        </div>
      </div>

      {!grouped.length ? (
        <div className="card">
          <p className="empty-text">سررسیدی در این بازه ثبت نشده</p>
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.status} className="card">
            <h3 className="chart-title">{STATUS_LABELS[group.status]}</h3>
            {group.items.map((item) => (
              <div key={item.id} className="record-item">
                <div className="record-item-main">
                  <div className="record-item-title">{item.title}</div>
                  <div className="record-item-meta">
                    {getDueDateTypeLabel(item.type)} · {item.subtitle} ·{' '}
                    {formatIsoDatePersian(item.dueDate)}
                  </div>
                </div>
                <div className="report-due-item-end">
                  <DueDateBadge status={item.status} />
                  <MoneyDisplay amount={item.amount} size="record" tone="expense" />
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
