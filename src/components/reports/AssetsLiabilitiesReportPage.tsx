import { useCallback, useEffect, useState } from 'react';
import { getSettings, getNetAvailableConfig, isConfigured } from '../../services/settings';
import { loadDashboardData } from '../../services/dashboard';
import { isTokenValid } from '../../services/auth';
import type { DashboardData } from '../../types';
import { getInstallmentDueRange, type DateRangePreset } from '../../utils/dateRange';
import { formatMoney } from '../../utils/formatMoney';
import { showError } from '../../utils/toast';
import { DashboardSkeleton } from '../skeleton';
import MoneyDisplay from '../MoneyDisplay';
import ReportToolbar, { useReportDateFilter } from './ReportToolbar';

function BreakdownRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total?: boolean;
}) {
  return (
    <div className={`asset-row${total ? ' asset-row-total' : ''}`}>
      <span className="asset-label">{label}</span>
      <span className="asset-value" dir="ltr">
        {formatMoney(value)}
      </span>
    </div>
  );
}

export default function AssetsLiabilitiesReportPage({ onReauth }: { onReauth?: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
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
        undefined,
        getNetAvailableConfig()
      );
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

  const financial = data?.financial;

  return (
    <div className="dashboard-page report-page">
      <ReportToolbar
        title="دارایی و بدهی"
        preset={datePreset}
        customRange={customRange}
        onFilterChange={handleDateFilterChange}
        onRefresh={load}
        loading={loading}
      />

      <div className="card dashboard-hero-card">
        <div className="dashboard-hero-label">تراز خالص</div>
        <MoneyDisplay amount={financial?.netAvailable ?? 0} size="hero" tone="hero" />
        <p className="dashboard-hero-hint">دارایی‌ها منهای بدهی‌ها (بر اساس تنظیمات دارایی قابل اتکا)</p>
      </div>

      <div className="card dashboard-assets-card">
        <h3 className="chart-title">دارایی‌ها</h3>
        <div className="asset-breakdown">
          <BreakdownRow label="کیف پول" value={financial?.walletTotal ?? 0} />
          <BreakdownRow label="صندوقچه" value={financial?.treasuryTotal ?? 0} />
          <BreakdownRow label="طلب‌ها" value={financial?.receivablesTotal ?? 0} />
          <BreakdownRow label="مجموع دارایی‌ها" value={financial?.totalAssets ?? 0} total />
        </div>
      </div>

      <div className="card dashboard-assets-card dashboard-liabilities-card">
        <h3 className="chart-title">بدهی‌ها</h3>
        <div className="asset-breakdown">
          <BreakdownRow label="اقساط این دوره" value={financial?.installmentsDue ?? 0} />
          <BreakdownRow label="بدهی‌ها" value={financial?.dangsTotal ?? 0} />
          <BreakdownRow label="چک‌های این دوره" value={financial?.checksDue ?? 0} />
          <BreakdownRow label="مجموع بدهی‌ها" value={financial?.totalLiabilities ?? 0} total />
        </div>
      </div>
    </div>
  );
}
