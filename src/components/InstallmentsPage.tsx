import { useState, useEffect, useCallback, useMemo } from 'react';
import type { InstallmentPlan } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { isTokenValid } from '../services/auth';
import {
  createInstallmentPlan,
  ensureInstallmentsSheet,
  exportInstallmentsCsv,
  exportInstallmentsPdf,
  fetchInstallmentPlans,
  importInstallmentsCsv,
  hasInstallmentDueInRange,
  isInstallmentPlanComplete,
  reconcilePaymentsOnEdit,
  sortInstallmentPayments,
  sortInstallmentPlans,
  toggleInstallmentPayment,
  updateInstallmentPaymentAmount,
  getInstallmentPaymentAmount,
  totalInstallmentsInRange,
  totalUnpaidInstallments,
  deleteInstallmentPlan,
  updateInstallmentPlan,
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
import { useSheetImportExport } from '../hooks/useSheetImportExport';
import FormModal from './FormModal';
import CardEditButton from './CardEditButton';
import { AccordionCollapse } from './AccordionCollapse';
import CardDeleteButton from './CardDeleteButton';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import ConfirmActionModal from './ConfirmActionModal';
import PageHeader from './PageHeader';
import SearchEmptyState from './SearchEmptyState';
import AppIcon from './AppIcon';
import { matchSearch } from '../utils/search';

type PlanWithRow = InstallmentPlan & { rowNumber: number };

export default function InstallmentsPage({ onReauth }: { onReauth?: () => void }) {
  const [plans, setPlans] = useState<PlanWithRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanWithRow | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<PlanWithRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingKey, setTogglingKey] = useState('');
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number | ''>>({});
  const [expandedPaymentKey, setExpandedPaymentKey] = useState<string | null>(null);
  const [savingAmountKey, setSavingAmountKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');


  const [form, setForm] = useState({
    title: '',
    amount: '' as number | '',
    count: '' as number | '',
    dueDay: '' as number | '',
    note: '',
  });

  const syncPaymentAmounts = useCallback((planList: PlanWithRow[]) => {
    const next: Record<string, number | ''> = {};
    for (const plan of planList) {
      plan.payments.forEach((payment, index) => {
        next[`${plan.id}-${index}`] = getInstallmentPaymentAmount(payment, plan);
      });
    }
    setPaymentAmounts(next);
  }, []);

  const syncPaymentAmountsForPlan = useCallback((plan: PlanWithRow) => {
    setPaymentAmounts((prev) => {
      const next = { ...prev };
      plan.payments.forEach((payment, index) => {
        next[`${plan.id}-${index}`] = getInstallmentPaymentAmount(payment, plan);
      });
      return next;
    });
  }, []);

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
      syncPaymentAmounts(data);
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
  }, [onReauth, syncPaymentAmounts]);

  useEffect(() => {
    if (isConfigured()) loadPlans();
  }, [loadPlans]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      if (editingPlan) {
        const reconciled = reconcilePaymentsOnEdit(editingPlan, {
          title: form.title.trim(),
          amount: Number(form.amount),
          count: Number(form.count),
          dueDay,
          note: form.note.trim(),
        });
        if ('error' in reconciled) {
          showError(reconciled.error);
          return;
        }
        await updateInstallmentPlan(settings.spreadsheetId, editingPlan.rowNumber, reconciled);
        showSuccess('قسط ویرایش شد');
      } else {
        await createInstallmentPlan(settings.spreadsheetId, {
          title: form.title.trim(),
          amount: Number(form.amount),
          count: Number(form.count),
          dueDay,
          note: form.note.trim(),
        });
        showSuccess('قسط جدید ثبت شد');
      }
      closeForm();
      await loadPlans();
    } catch (err) {
      const msg = err instanceof Error ? err.message : editingPlan ? 'خطا در ویرایش قسط' : 'خطا در ثبت قسط';
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

  const handlePaymentAmountSave = async (plan: PlanWithRow, paymentIndex: number) => {
    const key = `${plan.id}-${paymentIndex}`;
    const nextAmount = paymentAmounts[key];
    if (nextAmount === '' || nextAmount === undefined) {
      showError('مبلغ نامعتبر است');
      syncPaymentAmountsForPlan(plan);
      return;
    }
    if (nextAmount <= 0) {
      showError('مبلغ باید بیشتر از صفر باشد');
      syncPaymentAmountsForPlan(plan);
      return;
    }

    const payment = plan.payments[paymentIndex];
    if (!payment) return;

    const currentAmount = getInstallmentPaymentAmount(payment, plan);
    if (nextAmount === currentAmount) return;

    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    setSavingAmountKey(key);
    try {
      const updated = await updateInstallmentPaymentAmount(
        settings.spreadsheetId,
        plan,
        paymentIndex,
        nextAmount
      );
      const updatedPlan = { ...updated, rowNumber: plan.rowNumber };
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? updatedPlan : p))
      );
      syncPaymentAmountsForPlan(updatedPlan);
      showSuccess('مبلغ قسط ذخیره شد');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در به‌روزرسانی مبلغ';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
      syncPaymentAmountsForPlan(plan);
    } finally {
      setSavingAmountKey('');
    }
  };

  const resetCreateForm = () => {
    setForm({ title: '', amount: '', count: '', dueDay: '', note: '' });
  };

  const openCreateForm = () => {
    setEditingPlan(null);
    resetCreateForm();
    setShowForm(true);
  };

  const openEditForm = (plan: PlanWithRow) => {
    setEditingPlan(plan);
    setForm({
      title: plan.title,
      amount: plan.amount,
      count: plan.count,
      dueDay: plan.dueDay,
      note: plan.note,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingPlan(null);
    resetCreateForm();
  };

  const openDeleteConfirm = (plan: PlanWithRow) => {
    setDeletingPlan(plan);
  };

  const closeDeleteConfirm = () => {
    if (deleting) return;
    setDeletingPlan(null);
  };

  const handleDelete = async () => {
    if (!deletingPlan) return;

    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    setDeleting(true);
    try {
      await deleteInstallmentPlan(settings.spreadsheetId, deletingPlan.rowNumber, deletingPlan);
      if (expandedId === deletingPlan.id) setExpandedId(null);
      setDeletingPlan(null);
      showSuccess('قسط حذف شد');
      await loadPlans();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف قسط';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setDeleting(false);
    }
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
  const monthPlans = useMemo(
    () =>
      sortInstallmentPlans(
        plans.filter((plan) => hasInstallmentDueInRange(plan, monthRange))
      ),
    [plans, monthRange]
  );
  const filteredPlans = useMemo(
    () =>
      monthPlans.filter((plan) =>
        matchSearch(searchQuery, plan.title, plan.note, plan.amount, plan.count)
      ),
    [monthPlans, searchQuery]
  );

  const {
    handleExport,
    handleExportPdf,
    handleImport,
    importExportConfirmModal,
  } = useSheetImportExport({
    exportFn: exportInstallmentsCsv,
    exportPdfFn: exportInstallmentsPdf,
    importFn: importInstallmentsCsv,
    onComplete: loadPlans,
    onReauth,
  });

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات اقساط',
      actions: createPageSpeedDialActions({
        onAdd: () => openCreateForm(),
        onRefresh: loadPlans,
        refreshDisabled: loading,
        onImport: handleImport,
        onExport: handleExport,
        onExportPdf: handleExportPdf,
      }),
    }),
    [loadPlans, loading, handleImport, handleExport, handleExportPdf]
  );

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null);

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="installments" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  const paidCount = (plan: InstallmentPlan) =>
    plan.payments.filter((p) => p.paid).length;

  return (
    <div>
      <PageHeader
        title="اقساط"
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="جستجو در اقساط..."
      />

      {loading && plans.length === 0 ? (
        <InstallmentCardListSkeleton />
      ) : plans.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
          <AppIcon name="installments" />
        </div>
          <p>هنوز قسطی ثبت نشده</p>
        </div>
      ) : monthPlans.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
            <AppIcon name="installments" />
          </div>
          <p>هیچ قسطی برای {monthLabel} نیست</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <SearchEmptyState />
      ) : (
        filteredPlans.map((plan) => {
          const expanded = expandedId === plan.id;
          const done = paidCount(plan);
          const total = plan.count;
          const complete = isInstallmentPlanComplete(plan);
          const progress = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <div
              key={plan.id}
              className={`card installment-card${complete ? ' installment-complete' : ''}${expanded ? ' installment-card--expanded' : ''}`}
            >
              <div className="card-header-with-edit">
                <button
                  type="button"
                  className={`installment-header${expanded ? ' installment-header--expanded' : ''}`}
                  onClick={() => {
                    if (expanded) setExpandedPaymentKey(null);
                    setExpandedId(expanded ? null : plan.id);
                  }}
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
                  <span className="installment-chevron">▼</span>
                </button>
                <div className="card-action-buttons">
                  <CardEditButton
                    onClick={(event) => {
                      event.stopPropagation();
                      openEditForm(plan);
                    }}
                  />
                  <CardDeleteButton
                    onClick={(event) => {
                      event.stopPropagation();
                      openDeleteConfirm(plan);
                    }}
                  />
                </div>
              </div>

              <AccordionCollapse open={expanded}>
                <div className="installment-payments">
                  {plan.note && (
                    <p className="installment-note">{plan.note}</p>
                  )}
                  {sortInstallmentPayments(plan.payments).map(({ payment, index }) => {
                    const toggleKey = `${plan.id}-${index}`;
                    const amountKey = toggleKey;
                    const paymentExpanded = expandedPaymentKey === amountKey;
                    const rawAmount =
                      paymentAmounts[amountKey] ?? getInstallmentPaymentAmount(payment, plan);
                    const displayAmount =
                      rawAmount === '' ? getInstallmentPaymentAmount(payment, plan) : Number(rawAmount);

                    return (
                      <div
                        key={payment.n}
                        className={`installment-payment-item${paymentExpanded ? ' installment-payment-item--expanded' : ''}${payment.paid ? ' paid' : ''}`}
                      >
                        <div className="installment-payment-row">
                          <input
                            type="checkbox"
                            checked={payment.paid}
                            disabled={togglingKey === toggleKey}
                            onChange={(e) =>
                              handleTogglePayment(plan, index, e.target.checked)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            type="button"
                            className={`installment-payment-header${paymentExpanded ? ' installment-payment-header--expanded' : ''}`}
                            onClick={() =>
                              setExpandedPaymentKey((prev) =>
                                prev === amountKey ? null : amountKey
                              )
                            }
                          >
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
                            <div className="wallet-item-amount installment-payment-amount-display" dir="ltr">
                              {formatMoney(displayAmount)}
                            </div>
                            <span className="installment-chevron installment-payment-chevron">▼</span>
                          </button>
                        </div>

                        <AccordionCollapse open={paymentExpanded}>
                          <div className="installment-payment-edit wallet-item-edit">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>مبلغ قسط</label>
                              <AmountInput
                                compact
                                value={paymentAmounts[amountKey] ?? getInstallmentPaymentAmount(payment, plan)}
                                onChange={(val) =>
                                  setPaymentAmounts((prev) => ({ ...prev, [amountKey]: val }))
                                }
                                onBlur={() => handlePaymentAmountSave(plan, index)}
                              />
                            </div>
                            {savingAmountKey === amountKey && <span className="spinner" />}
                          </div>
                        </AccordionCollapse>
                      </div>
                    );
                  })}
                </div>
              </AccordionCollapse>
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
        title={editingPlan ? 'ویرایش قسط' : 'ثبت قسط جدید'}
        onClose={closeForm}
        onSubmit={handleSubmit}
        saving={saving}
        saveLabel={editingPlan ? 'ذخیره تغییرات' : 'ذخیره قسط'}
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

      <ConfirmActionModal {...importExportConfirmModal} />

      <ConfirmDeleteModal
        open={deletingPlan !== null}
        message="از حذف این مورد مطمئن هستید؟"
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}
