import { useState, useEffect, useCallback, useMemo } from 'react';
import type { InstallmentPlan } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { isTokenValid } from '../services/auth';
import {
  createInstallmentPlan,
  ensureInstallmentsSheet,
  fetchInstallmentPlans,
  isInstallmentPlanComplete,
  sortInstallmentPayments,
  sortInstallmentPlans,
  toggleInstallmentPayment,
  totalInstallmentsInRange,
  totalUnpaidInstallments,
} from '../services/installments';
import AmountInput from './AmountInput';
import { InstallmentCardListSkeleton } from './skeleton';
import { formatMoney } from '../utils/formatMoney';
import { formatIsoDatePersian, getTodayIso } from '../utils/jalaliDate';
import {
  formatJalaliMonthLabel,
  getInstallmentDueRange,
  getJalaliMonthKey,
} from '../utils/dateRange';
import { showError, showSuccess } from '../utils/toast';
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial';
import { createPageSpeedDialActions } from '../hooks/pageSpeedDialActions';
import FormModal from './FormModal';

type PlanWithRow = InstallmentPlan & { rowNumber: number };

export default function InstallmentsPage({ onReauth }: { onReauth?: () => void }) {
  const [plans, setPlans] = useState<PlanWithRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingKey, setTogglingKey] = useState('');


  const [form, setForm] = useState({
    title: '',
    amount: '' as number | '',
    count: '' as number | '',
    dueDay: '' as number | '',
    note: '',
  });

  const loadPlans = useCallback(async () => {
    const settings = getSettings();
    if (!settings?.spreadsheetId) return;
    if (!isTokenValid()) {
      onReauth?.();
      return;
    }

    setLoading(true);
    try {
      await ensureInstallmentsSheet(settings.spreadsheetId);
      const data = await fetchInstallmentPlans(settings.spreadsheetId);
      setPlans(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری اقساط';
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
    if (isConfigured()) loadPlans();
  }, [loadPlans]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.();
      return;
    }

    if (!form.title.trim()) {
      showError('عنوان قسط الزامی است');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      showError('مبلغ قسط را وارد کنید');
      return;
    }
    if (!form.count || Number(form.count) < 1) {
      showError('تعداد بازپرداخت باید حداقل ۱ باشد');
      return;
    }
    const dueDay = Number(form.dueDay);
    if (!dueDay || dueDay < 1 || dueDay > 31) {
      showError('موعد قسط باید بین ۱ تا ۳۱ باشد');
      return;
    }

    const settings = getSettings()!;
    setSaving(true);
    try {
      await createInstallmentPlan(settings.spreadsheetId, {
        title: form.title.trim(),
        amount: Number(form.amount),
        count: Number(form.count),
        dueDay,
        note: form.note.trim(),
      });
      setForm({ title: '', amount: '', count: '', dueDay: '', note: '' });
      setShowForm(false);
      showSuccess('قسط جدید ثبت شد');
      await loadPlans();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت قسط';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePayment = async (
    plan: PlanWithRow,
    paymentIndex: number,
    paid: boolean
  ) => {
    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    const key = `${plan.id}-${paymentIndex}`;
    setTogglingKey(key);
    try {
      const updated = await toggleInstallmentPayment(
        settings.spreadsheetId,
        plan,
        paymentIndex,
        paid
      );
      setPlans((prev) =>
        prev.map((p) =>
          p.id === plan.id ? { ...updated, rowNumber: plan.rowNumber } : p
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بروزرسانی پرداخت';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setTogglingKey('');
    }
  };

  const resetCreateForm = () => {
    setForm({ title: '', amount: '', count: '', dueDay: '', note: '' });
  };

  const closeCreateForm = () => {
    if (saving) return;
    setShowForm(false);
    resetCreateForm();
  };

  const monthRange = useMemo(() => getInstallmentDueRange('month-to-date'), []);
  const monthLabel = useMemo(
    () => formatJalaliMonthLabel(getJalaliMonthKey(getTodayIso())),
    []
  );
  const monthTotals = useMemo(
    () => ({
      total: totalInstallmentsInRange(plans, monthRange),
      unpaid: totalUnpaidInstallments(plans, monthRange),
    }),
    [plans, monthRange]
  );
  const sortedPlans = useMemo(() => sortInstallmentPlans(plans), [plans]);

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات اقساط',
      actions: createPageSpeedDialActions({
        onAdd: () => setShowForm(true),
        onRefresh: loadPlans,
        refreshDisabled: loading,
      }),
    }),
    [loadPlans, loading]
  );

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null);

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">📅</div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  const paidCount = (plan: InstallmentPlan) =>
    plan.payments.filter((p) => p.paid).length;

  return (
    <div>
      <div className="card-header-row" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 600 }}>اقساط</h2>
      </div>

      {loading && plans.length === 0 ? (
        <InstallmentCardListSkeleton />
      ) : plans.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📅</div>
          <p>هنوز قسطی ثبت نشده</p>
        </div>
      ) : (
        sortedPlans.map((plan) => {
          const expanded = expandedId === plan.id;
          const done = paidCount(plan);
          const total = plan.count;
          const complete = isInstallmentPlanComplete(plan);
          const progress = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <div
              key={plan.id}
              className={`card installment-card${complete ? ' installment-complete' : ''}`}
            >
              <button
                type="button"
                className="installment-header"
                onClick={() => setExpandedId(expanded ? null : plan.id)}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{plan.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    {formatMoney(plan.amount)}
                    {complete ? ' · تکمیل شده' : ` · ${done}/${total} پرداخت شده`}
                  </div>
                  <div className="installment-progress">
                    <div className="installment-progress-bar" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <span className="installment-chevron">{expanded ? '▲' : '▼'}</span>
              </button>

              {expanded && (
                <div className="installment-payments">
                  {plan.note && (
                    <p className="installment-note">{plan.note}</p>
                  )}
                  {sortInstallmentPayments(plan.payments).map(({ payment, index }) => {
                    const toggleKey = `${plan.id}-${index}`;
                    return (
                      <label
                        key={payment.n}
                        className={`installment-payment-row${payment.paid ? ' paid' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={payment.paid}
                          disabled={togglingKey === toggleKey}
                          onChange={(e) =>
                            handleTogglePayment(plan, index, e.target.checked)
                          }
                        />
                        <div className="installment-payment-info">
                          <span>قسط {payment.n.toLocaleString('fa-IR')}</span>
                          <span className="installment-due">
                            موعد: {formatIsoDatePersian(payment.dueDate)}
                          </span>
                          {payment.paid && payment.paidAt && (
                            <span className="installment-paid-at">
                              پرداخت: {formatIsoDatePersian(payment.paidAt)}
                            </span>
                          )}
                        </div>
                        <span className="installment-payment-amount" dir="ltr">
                          {formatMoney(plan.amount)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {plans.length > 0 && (
        <div className="card installment-month-summary">
          <h3 className="card-title" style={{ fontSize: '0.9rem' }}>
            خلاصه {monthLabel}
          </h3>
          <div className="installment-month-summary-rows">
            <div className="installment-month-summary-row">
              <span className="installment-month-summary-label">مجموع اقساط این ماه</span>
              <span className="installment-month-summary-value" dir="ltr">
                {formatMoney(monthTotals.total)}
              </span>
            </div>
            <div className="installment-month-summary-row">
              <span className="installment-month-summary-label">پرداخت‌نشده این ماه</span>
              <span className="installment-month-summary-value unpaid" dir="ltr">
                {formatMoney(monthTotals.unpaid)}
              </span>
            </div>
          </div>
        </div>
      )}

      <FormModal
        open={showForm}
        title="ثبت قسط جدید"
        onClose={closeCreateForm}
        onSubmit={handleCreate}
        saving={saving}
        saveLabel="ذخیره قسط"
      >
        <div className="form-group">
          <label>عنوان قسط <span className="required">*</span></label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="مثلاً: وام بانکی"
          />
        </div>

        <div className="form-group">
          <label>مبلغ قسط <span className="required">*</span></label>
          <AmountInput
            value={form.amount}
            onChange={(val) => setForm((f) => ({ ...f, amount: val }))}
          />
        </div>

        <div className="form-group">
          <label>تعداد بازپرداخت <span className="required">*</span></label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={form.count === '' ? '' : form.count}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                count: e.target.value === '' ? '' : Number(e.target.value),
              }))
            }
            dir="ltr"
          />
        </div>

        <div className="form-group">
          <label>موعد قسط در ماه <span className="required">*</span></label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={form.dueDay === '' ? '' : form.dueDay}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                dueDay: e.target.value === '' ? '' : Number(e.target.value),
              }))
            }
            dir="ltr"
            placeholder="۱ تا ۳۱"
          />
        </div>

        <div className="form-group">
          <label>توضیحات</label>
          <textarea
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="توضیحات اختیاری"
          />
        </div>
      </FormModal>
    </div>
  );
}
