import { useState, useEffect, useCallback, useMemo } from 'react';
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
  getInstallmentDueDateInRange,
  reconcilePaymentsOnEdit,
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
import { distributionSparkline } from '../utils/sparklineData';
import { getTodayIso } from '../utils/jalaliDate';
import {
  formatJalaliMonthLabel,
  getInstallmentDueRange,
  getJalaliMonthKey,
} from '../utils/dateRange';
import { showError, showSuccess } from '../utils/toast';
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial';
import { createPageSpeedDialActions } from '../hooks/pageSpeedDialActions';
import { useSheetImportExport } from '../hooks/useSheetImportExport';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import FormModal from './FormModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import ConfirmActionModal from './ConfirmActionModal';
import PageHeader from './PageHeader';
import StatCard from './StatCard';
import SearchEmptyState from './SearchEmptyState';
import AppIcon from './AppIcon';
import InstallmentPlanCard, { type PlanWithRow } from './InstallmentPlanCard';
import { matchSearch } from '../utils/search';

export default function InstallmentsPage({
  onReauth,
  active = true,
}: {
  onReauth?: () => void;
  active?: boolean;
}) {
  const [plans, setPlans] = useState<PlanWithRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanWithRow | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<PlanWithRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingKey, setTogglingKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);

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

  const handleTogglePayment = useCallback(
    async (plan: PlanWithRow, paymentIndex: number, paid: boolean) => {
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
    },
    [onReauth]
  );

  const handlePaymentAmountSave = useCallback(
    async (plan: PlanWithRow, paymentIndex: number, nextAmount: number) => {
      const payment = plan.payments[paymentIndex];
      if (!payment) return;

      const currentAmount = getInstallmentPaymentAmount(payment, plan);
      if (nextAmount === currentAmount) return;

      const settings = getSettings();
      if (!settings?.spreadsheetId || !isTokenValid()) {
        onReauth?.();
        return;
      }

      try {
        const updated = await updateInstallmentPaymentAmount(
          settings.spreadsheetId,
          plan,
          paymentIndex,
          nextAmount
        );
        const updatedPlan = { ...updated, rowNumber: plan.rowNumber };
        setPlans((prev) => prev.map((p) => (p.id === plan.id ? updatedPlan : p)));
        showSuccess('مبلغ قسط ذخیره شد');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'خطا در به‌روزرسانی مبلغ';
        if (msg.includes('منقضی') || msg.includes('401')) {
          onReauth?.();
          return;
        }
        showError(msg);
        throw err;
      }
    },
    [onReauth]
  );

  const resetCreateForm = useCallback(() => {
    setForm({ title: '', amount: '', count: '', dueDay: '', note: '' });
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingPlan(null);
    resetCreateForm();
    setShowForm(true);
  }, [resetCreateForm]);

  const openEditForm = useCallback((plan: PlanWithRow) => {
    setEditingPlan(plan);
    setForm({
      title: plan.title,
      amount: plan.amount,
      count: plan.count,
      dueDay: plan.dueDay,
      note: plan.note,
    });
    setShowForm(true);
  }, []);

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingPlan(null);
    resetCreateForm();
  };

  const openDeleteConfirm = useCallback((plan: PlanWithRow) => {
    setDeletingPlan(plan);
  }, []);

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

  const handleToggleExpand = useCallback((planId: string) => {
    setExpandedId((prev) => (prev === planId ? null : planId));
  }, []);

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
        matchSearch(debouncedSearchQuery, plan.title, plan.note, plan.amount, plan.count)
      ),
    [monthPlans, debouncedSearchQuery]
  );
  const displayPlans = useMemo(
    () =>
      filteredPlans.map((plan) => {
        const done = plan.payments.reduce(
          (count, payment) => count + (payment.paid ? 1 : 0),
          0
        );
        const complete = isInstallmentPlanComplete(plan);
        const progress = plan.count > 0 ? Math.round((done / plan.count) * 100) : 0;
        const dueDate = getInstallmentDueDateInRange(plan, monthRange);
        return { plan, done, complete, progress, dueDate };
      }),
    [filteredPlans, monthRange]
  );
  const monthAmountSparkline = useMemo(
    () => distributionSparkline(monthPlans.map((plan) => plan.amount)),
    [monthPlans]
  );
  const monthUnpaidSparkline = useMemo(
    () =>
      distributionSparkline(
        monthPlans.flatMap((plan) =>
          plan.payments
            .filter((payment) => !payment.paid)
            .map((payment) => payment.amount ?? plan.amount)
        )
      ),
    [monthPlans]
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
        onAdd: openCreateForm,
        onRefresh: loadPlans,
        refreshDisabled: loading,
        onImport: handleImport,
        onExport: handleExport,
        onExportPdf: handleExportPdf,
      }),
    }),
    [openCreateForm, loadPlans, loading, handleImport, handleExport, handleExportPdf]
  );

  useRegisterPageSpeedDial(isConfigured() && active ? pageSpeedDialConfig : null);

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
        displayPlans.map(({ plan, done, complete, progress, dueDate }) => {
          const togglingPaymentIndex = togglingKey.startsWith(`${plan.id}-`)
            ? Number(togglingKey.slice(plan.id.length + 1))
            : null;

          return (
            <InstallmentPlanCard
              key={plan.id}
              plan={plan}
              expanded={expandedId === plan.id}
              done={done}
              complete={complete}
              progress={progress}
              dueDate={dueDate}
              togglingPaymentIndex={togglingPaymentIndex}
              onToggleExpand={handleToggleExpand}
              onEdit={openEditForm}
              onDelete={openDeleteConfirm}
              onTogglePayment={handleTogglePayment}
              onPaymentAmountSave={handlePaymentAmountSave}
            />
          );
        })
      )}

      {plans.length > 0 && (
        <div className="stat-grid dashboard-stat-grid">
          <StatCard
            label={`مجموع اقساط ${monthLabel}`}
            amount={monthTotals.total}
            variant="default"
            tone="primary"
            sparklineData={monthAmountSparkline}
            animateIndex={0}
            lift
          />
          <StatCard
            label="پرداخت‌نشده این ماه"
            amount={monthTotals.unpaid}
            variant="expense"
            sparklineData={monthUnpaidSparkline}
            animateIndex={1}
            lift
          />
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
