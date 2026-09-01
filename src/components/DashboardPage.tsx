import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getSettings, isConfigured, getNetAvailableConfig } from '../services/settings';
import { loadDashboardData, buildDashboardYearlyMonthlyFlow, peekCachedDashboardData } from '../services/dashboard';
import type { DashboardData, DashboardNavTarget } from '../types';
import { isTokenValid } from '../services/auth';
import { DashboardSkeleton } from './skeleton';
import AppIcon from './AppIcon';
import FilterModal from './FilterModal';
import ActiveFilterChips from './ActiveFilterChips';
import { buildDateRangeChip, compactFilterChips } from '../utils/filterChips';
import DateRangeFilter, {
  createDefaultDateRangeFilter,
} from './DateRangeFilter';
import YearFilter, { getDefaultChartYear } from './YearFilter';
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
import { monthlySparkline } from '../utils/sparklineData';
import AnimatedMoneyDisplay from './AnimatedMoneyDisplay';
import StatCard from './StatCard';
import TransactionListItem from './TransactionListItem';
import MoneyDisplay from './MoneyDisplay';
import CardEditButton from './CardEditButton';
import { CategoryBarChart, CategoryDonutChart, IncomeExpenseMonthlyChart } from './charts';
import { getCategoryBarYAxisWidth } from './charts/chartUtils';
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial';
import SpeedDialIcon from './SpeedDialIcon';
import { useDataRefresh } from '../hooks/useDataRefresh';
import { hasStoreData } from '../services/spreadsheetStore';

type TransactionTypeFilter = 'all' | 'income' | 'expense';

function RecordAmount({
  amount,
  type,
}: {
  amount: number;
  type: 'income' | 'expense';
}) {
  return (
    <MoneyDisplay
      amount={amount}
      size="record"
      tone={type === 'income' ? 'income' : 'expense'}
      signed
    />
  );
}

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
  onNewEntry,
  onNavigate,
  onConfigureNetAvailable,
  active = true,
}: {
  onReauth?: () => void;
  onViewRecords?: (formType?: 'income' | 'expense') => void;
  onNewEntry?: (formType: 'income' | 'expense') => void;
  onNavigate?: (target: DashboardNavTarget) => void;
  onConfigureNetAvailable?: () => void;
  active?: boolean;
}) {
  const [data, setData] = useState<DashboardData | null>(() => {
    const settings = getSettings();
    if (!settings?.spreadsheetId || !hasStoreData(settings.spreadsheetId)) return null;
    const range = resolveDateRange('month-to-date', createDefaultDateRangeFilter().customRange);
    const installmentRange = getInstallmentDueRange('month-to-date');
    return peekCachedDashboardData(
      settings,
      range,
      installmentRange,
      getDefaultChartYear(),
      getNetAvailableConfig()
    );
  });
  const [loading, setLoading] = useState(() => data == null);
  const [datePreset, setDatePreset] = useState<RecordsDatePreset>('month-to-date');
  const [customRange, setCustomRange] = useState(
    () => createDefaultDateRangeFilter().customRange
  );
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const [monthlyFlowYear, setMonthlyFlowYear] = useState(getDefaultChartYear);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [draftDatePreset, setDraftDatePreset] = useState<RecordsDatePreset>('month-to-date');
  const [draftCustomRange, setDraftCustomRange] = useState(
    () => createDefaultDateRangeFilter().customRange
  );
  const dateRange = resolveDateRange(datePreset, customRange);
  const dataRevision = useDataRefresh();
  const dataRef = useRef(data);
  dataRef.current = data;

  const load = useCallback(async () => {
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.();
      return;
    }
    const settings = getSettings();
    if (!settings) return;

    if (!dataRef.current) {
      setLoading(true);
    }
    try {
      const range = resolveDateRange(datePreset, customRange);
      const installmentRange =
        datePreset === 'custom'
          ? range
          : getInstallmentDueRange(datePreset as DateRangePreset);
      const dash = await loadDashboardData(
        settings,
        range,
        installmentRange,
        monthlyFlowYear,
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
  }, [onReauth, datePreset, customRange]);

  useEffect(() => {
    load();
  }, [load, dataRevision]);

  useEffect(() => {
    const settings = getSettings();
    if (!settings || !data) return;

    const range = resolveDateRange(datePreset, customRange);
    const installmentRange =
      datePreset === 'custom'
        ? range
        : getInstallmentDueRange(datePreset as DateRangePreset);
    const nextFlow = buildDashboardYearlyMonthlyFlow(
      settings,
      range,
      installmentRange,
      getNetAvailableConfig(),
      monthlyFlowYear
    );
    if (!nextFlow) return;

    setData((prev) => {
      if (!prev || prev.yearlyMonthlyFlow === nextFlow) return prev;
      return { ...prev, yearlyMonthlyFlow: nextFlow };
    });
  }, [monthlyFlowYear, datePreset, customRange]);

  const filteredRecords = useMemo(() => {
    if (!data?.recentRecords.length) return [];
    return data.recentRecords
      .filter((r) => typeFilter === 'all' || r.type === typeFilter)
      .slice(0, 10);
  }, [data?.recentRecords, typeFilter]);

  const categoryYAxisWidth = useMemo(
    () =>
      getCategoryBarYAxisWidth([
        data?.expenseByCategory ?? [],
        data?.incomeByCategory ?? [],
      ]),
    [data?.expenseByCategory, data?.incomeByCategory]
  );

  const financial = data?.financial;
  const incomeSparkline = useMemo(
    () => monthlySparkline(data?.yearlyMonthlyFlow ?? [], 'income'),
    [data?.yearlyMonthlyFlow]
  );
  const expenseSparkline = useMemo(
    () => monthlySparkline(data?.yearlyMonthlyFlow ?? [], 'expense'),
    [data?.yearlyMonthlyFlow]
  );
  const netSparkline = useMemo(
    () => monthlySparkline(data?.yearlyMonthlyFlow ?? [], 'net'),
    [data?.yearlyMonthlyFlow]
  );
  const settings = useMemo(() => getSettings(), []);
  const incomeForm = settings?.forms.find((f) => f.type === 'income');
  const expenseForm = settings?.forms.find((f) => f.type === 'expense');
  const incomeFormName = incomeForm?.name ?? 'درآمد';
  const expenseFormName = expenseForm?.name ?? 'هزینه';
  const transactionTypeOptions = useMemo<TransactionTypeSegmentOption[]>(
    () => [
      { id: 'all', label: 'همه' },
      { id: 'income', label: incomeFormName, tone: 'income' },
      { id: 'expense', label: expenseFormName, tone: 'expense' },
    ],
    [incomeFormName, expenseFormName]
  );

  const openFilterModal = useCallback(() => {
    setDraftDatePreset(datePreset);
    setDraftCustomRange(customRange);
    setFilterModalOpen(true);
  }, [datePreset, customRange]);

  const resetDateFilter = useCallback(() => {
    const defaults = createDefaultDateRangeFilter();
    setDatePreset(defaults.preset as RecordsDatePreset);
    setCustomRange(defaults.customRange);
  }, []);

  const filterChips = useMemo(
    () =>
      compactFilterChips([
        buildDateRangeChip(
          formatDateRangeLabel(dateRange),
          datePreset !== 'month-to-date' ? resetDateFilter : undefined
        ),
      ]),
    [dateRange, datePreset, resetDateFilter]
  );

  useRegisterPageSpeedDial(
    isConfigured()
      ? {
          ariaLabel: 'عملیات داشبورد',
          actions: [
            {
              id: 'income',
              label: incomeFormName,
              icon: <span className="speed-dial-type-icon speed-dial-type-icon--income">+</span>,
              className: 'speed-dial-action--income',
              onClick: () => onNewEntry?.('income'),
            },
            {
              id: 'expense',
              label: expenseFormName,
              icon: <span className="speed-dial-type-icon speed-dial-type-icon--expense">−</span>,
              className: 'speed-dial-action--expense',
              onClick: () => onNewEntry?.('expense'),
            },
            {
              id: 'filter',
              label: 'فیلتر',
              icon: <SpeedDialIcon name="filter" />,
              onClick: openFilterModal,
            },
            {
              id: 'refresh',
              label: 'بروزرسانی',
              icon: <SpeedDialIcon name="refresh" />,
              onClick: load,
              disabled: loading,
            },
          ],
        }
      : null,
    active
  );

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="dashboard" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="dashboard-page">
      <ActiveFilterChips chips={filterChips} onChipClick={openFilterModal} />

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApply={() => {
          setDatePreset(draftDatePreset);
          setCustomRange(draftCustomRange);
          setFilterModalOpen(false);
        }}
        onClear={() => {
          const defaults = createDefaultDateRangeFilter();
          setDraftDatePreset(defaults.preset as RecordsDatePreset);
          setDraftCustomRange(defaults.customRange);
        }}
      >
        <DateRangeFilter
          preset={draftDatePreset}
          customRange={draftCustomRange}
          onChange={(filter) => {
            if (filter.preset === 'all') return;
            setDraftDatePreset(filter.preset);
            setDraftCustomRange(filter.customRange);
          }}
          loading={loading}
        />
      </FilterModal>

      <div className="card dashboard-hero-card dashboard-hero-card--animated">
        <div className="dashboard-hero-header">
          <div className="dashboard-hero-label">دارایی قابل اتکا</div>
          {onConfigureNetAvailable && (
            <CardEditButton
              onClick={onConfigureNetAvailable}
              ariaLabel="تنظیم دارایی قابل اتکا"
            />
          )}
        </div>
        <AnimatedMoneyDisplay
          amount={financial?.netAvailable ?? 0}
          size="hero"
          tone="hero"
        />
        <p className="dashboard-hero-hint">
          مجموع دارایی‌های انتخاب‌شده منهای بدهی‌های انتخاب‌شده
        </p>
      </div>

      <div className="dashboard-flow-section dashboard-flow-section--animated">
        <div className="stat-grid dashboard-stat-grid">
          <StatCard
            label="درآمد دوره"
            amount={data?.totalIncome ?? 0}
            variant="income"
            sparklineData={incomeSparkline}
            animateIndex={0}
            lift
          />
          <StatCard
            label="هزینه دوره"
            amount={data?.totalExpense ?? 0}
            variant="expense"
            sparklineData={expenseSparkline}
            animateIndex={1}
            lift
          />
        </div>
        <StatCard
          label="خالص دوره"
          amount={data?.balance ?? 0}
          variant="flow"
          wide
          flowDirection={
            (data?.balance ?? 0) < 0
              ? 'negative'
              : (data?.balance ?? 0) > 0
                ? 'positive'
                : 'neutral'
          }
          sparklineData={netSparkline}
          animateIndex={2}
        />
        <StatCard
          label="مانده محاسبه‌شده"
          amount={data?.periodBalance ?? 0}
          variant="balance"
          wide
          sparklineData={netSparkline}
          animateIndex={3}
        />
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
            label="بدهی‌ها"
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
        <>
          <CategoryDonutChart
            title="سهم هزینه‌ها"
            data={data!.expenseByCategory}
            tone="expense"
          />
          <CategoryBarChart
            title="هزینه بر اساس دسته‌بندی"
            data={data!.expenseByCategory}
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
            data={data!.incomeByCategory}
            tone="income"
            yAxisWidth={categoryYAxisWidth}
          />
        </>
      )}

      {data && (
        <IncomeExpenseMonthlyChart
          data={data.yearlyMonthlyFlow}
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
            <TransactionListItem
              key={i}
              title={r.title}
              meta={`${r.formName} · ${r.category} · ${formatIsoDatePersian(r.date)}`}
              tone={r.type === 'income' ? 'income' : 'expense'}
              index={i}
            >
              <RecordAmount amount={r.amount} type={r.type} />
            </TransactionListItem>
          ))
        )}
      </div>
    </div>
  );
}
