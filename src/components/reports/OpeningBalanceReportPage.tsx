import { useCallback, useEffect, useState } from 'react';
import { getSettings, isConfigured } from '../../services/settings';
import { isTokenValid } from '../../services/auth';
import { loadOpeningBalancesReport } from '../../services/reports';
import type { MonthlyOpeningBalance } from '../../services/monthlyBalance';
import { formatJalaliMonthLabel } from '../../utils/dateRange';
import { formatMoney } from '../../utils/formatMoney';
import { showError } from '../../utils/toast';
import { InstallmentCardListSkeleton } from '../skeleton';
import ReportToolbar from './ReportToolbar';

export default function OpeningBalanceReportPage({ onReauth }: { onReauth?: () => void }) {
  const [items, setItems] = useState<MonthlyOpeningBalance[]>([]);
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
      const balances = await loadOpeningBalancesReport(settings.spreadsheetId);
      setItems(balances);
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

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  if (loading && !items.length) {
    return <InstallmentCardListSkeleton count={3} />;
  }

  return (
    <div className="dashboard-page report-page">
      <ReportToolbar
        title="موجودی اول دوره"
        preset="month-to-date"
        customRange={{ start: '', end: '' }}
        onFilterChange={() => {}}
        onRefresh={load}
        loading={loading}
        showDateFilter={false}
        subtitle="تاریخچه موجودی ماهانه"
      />

      <div className="card">
        {!items.length ? (
          <p className="empty-text">موجودی اول دوره‌ای ثبت نشده</p>
        ) : (
          items.map((item) => (
            <div key={item.monthKey} className="record-item">
              <div className="record-item-main">
                <div className="record-item-title">{formatJalaliMonthLabel(item.monthKey)}</div>
                {item.note && <div className="record-item-meta">{item.note}</div>}
              </div>
              <span className="asset-value" dir="ltr">
                {formatMoney(item.amount)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
