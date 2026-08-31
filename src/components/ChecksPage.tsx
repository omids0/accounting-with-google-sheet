import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Check } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { isTokenValid } from '../services/auth';
import {
  createCheck,
  deleteCheck,
  ensureChecksSheet,
  exportChecksCsv,
  exportChecksPdf,
  fetchChecks,
  importChecksCsv,
  sortChecks,
  toggleCheckPaid,
  totalChecksInRange,
  totalUnpaidChecksInRange,
  updateCheck,
} from '../services/checks';
import AmountInput from './AmountInput';
import JalaliDatePicker from './JalaliDatePicker';
import { DangCardListSkeleton } from './skeleton';
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
import CardDeleteButton from './CardDeleteButton';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import ConfirmActionModal from './ConfirmActionModal';
import PageHeader from './PageHeader';
import SearchEmptyState from './SearchEmptyState';
import AppIcon from './AppIcon';
import { matchSearch } from '../utils/search';

type CheckWithRow = Check & { rowNumber: number };

export default function ChecksPage({ onReauth }: { onReauth?: () => void }) {
  const [items, setItems] = useState<CheckWithRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CheckWithRow | null>(null);
  const [deletingItem, setDeletingItem] = useState<CheckWithRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');


  const [form, setForm] = useState({
    checkNumber: '',
    counterparty: '',
    amount: '' as number | '',
    creationDate: getTodayIso(),
    dueDate: getTodayIso(),
  });

  const loadItems = useCallback(async () => {
    const settings = getSettings();
    if (!settings?.spreadsheetId) return;
    if (!isTokenValid()) {
      onReauth?.();
      return;
    }

    setLoading(true);
    try {
      await ensureChecksSheet(settings.spreadsheetId);
      const data = await fetchChecks(settings.spreadsheetId);
      setItems(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری چک‌ها';
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
    if (isConfigured()) loadItems();
  }, [loadItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.();
      return;
    }

    if (!form.checkNumber.trim()) {
      showError('شماره چک الزامی است');
      return;
    }
    if (!form.counterparty.trim()) {
      showError('طرف حساب الزامی است');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      showError('مبلغ را وارد کنید');
      return;
    }
    if (!form.creationDate) {
      showError('تاریخ صدور الزامی است');
      return;
    }
    if (!form.dueDate) {
      showError('تاریخ سررسید الزامی است');
      return;
    }

    const settings = getSettings()!;
    setSaving(true);
    try {
      if (editingItem) {
        const updated: Check = {
          ...editingItem,
          checkNumber: form.checkNumber.trim(),
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          creationDate: form.creationDate,
          dueDate: form.dueDate,
        };
        await updateCheck(settings.spreadsheetId, editingItem.rowNumber, updated);
        showSuccess('چک ویرایش شد');
      } else {
        await createCheck(settings.spreadsheetId, {
          checkNumber: form.checkNumber.trim(),
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          creationDate: form.creationDate,
          dueDate: form.dueDate,
        });
        showSuccess('چک جدید ثبت شد');
      }
      closeForm();
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : editingItem ? 'خطا در ویرایش چک' : 'خطا در ثبت چک';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePaid = async (item: CheckWithRow, paid: boolean) => {
    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    setTogglingId(item.id);
    try {
      const updated = await toggleCheckPaid(settings.spreadsheetId, item, paid);
      setItems((prev) =>
        sortChecks(
          prev.map((c) =>
            c.id === item.id ? { ...updated, rowNumber: item.rowNumber } : c
          )
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در به‌روزرسانی';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setTogglingId('');
    }
  };

  const monthRange = useMemo(() => getInstallmentDueRange('month-to-date'), []);
  const monthLabel = useMemo(
    () => formatJalaliMonthLabel(getJalaliMonthKey(getTodayIso())),
    []
  );
  const monthTotals = useMemo(
    () => ({
      total: totalChecksInRange(items, monthRange),
      unpaid: totalUnpaidChecksInRange(items, monthRange),
    }),
    [items, monthRange]
  );
  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        matchSearch(
          searchQuery,
          item.checkNumber,
          item.counterparty,
          item.amount,
          item.creationDate,
          item.dueDate
        )
      ),
    [items, searchQuery]
  );

  const resetCreateForm = () => {
    setForm({
      checkNumber: '',
      counterparty: '',
      amount: '',
      creationDate: getTodayIso(),
      dueDate: getTodayIso(),
    });
  };

  const openCreateForm = () => {
    setEditingItem(null);
    resetCreateForm();
    setShowForm(true);
  };

  const openEditForm = (item: CheckWithRow) => {
    setEditingItem(item);
    setForm({
      checkNumber: item.checkNumber,
      counterparty: item.counterparty,
      amount: item.amount,
      creationDate: item.creationDate,
      dueDate: item.dueDate,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingItem(null);
    resetCreateForm();
  };

  const openDeleteConfirm = (item: CheckWithRow) => {
    setDeletingItem(item);
  };

  const closeDeleteConfirm = () => {
    if (deleting) return;
    setDeletingItem(null);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    setDeleting(true);
    try {
      await deleteCheck(settings.spreadsheetId, deletingItem.rowNumber, deletingItem);
      setDeletingItem(null);
      showSuccess('چک حذف شد');
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف چک';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const {
    handleExport,
    handleExportPdf,
    handleImport,
    importExportConfirmModal,
  } = useSheetImportExport({
    exportFn: exportChecksCsv,
    exportPdfFn: exportChecksPdf,
    importFn: importChecksCsv,
    onComplete: loadItems,
    onReauth,
  });

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات چک‌ها',
      actions: createPageSpeedDialActions({
        onAdd: () => openCreateForm(),
        onRefresh: loadItems,
        refreshDisabled: loading,
        onImport: handleImport,
        onExport: handleExport,
        onExportPdf: handleExportPdf,
      }),
    }),
    [loadItems, loading, handleImport, handleExport, handleExportPdf]
  );

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null);

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="checks" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="چک‌ها"
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="جستجو در چک‌ها..."
      />

      {loading && items.length === 0 ? (
        <DangCardListSkeleton />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
          <AppIcon name="checks" />
        </div>
          <p>هنوز چکی ثبت نشده</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <SearchEmptyState />
      ) : (
        <>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`card dang-card${item.paid ? ' paid' : ''}`}
            >
              <input
                type="checkbox"
                className="dang-checkbox"
                checked={item.paid}
                disabled={togglingId === item.id}
                onChange={(e) => handleTogglePaid(item, e.target.checked)}
              />
              <div className="dang-card-body">
                <div className="dang-card-header">
                  <span className="dang-card-title">
                    چک {item.checkNumber}
                  </span>
                  <span className="dang-card-amount" dir="ltr">
                    {formatMoney(item.amount)}
                  </span>
                </div>
                <div className="dang-card-meta">
                  طرف حساب: {item.counterparty}
                </div>
                <div className="dang-card-meta">
                  {item.creationDate && (
                    <span>صدور: {formatIsoDatePersian(item.creationDate)}</span>
                  )}
                  {item.dueDate && (
                    <span className="dang-card-date">
                      · سررسید: {formatIsoDatePersian(item.dueDate)}
                    </span>
                  )}
                </div>
                {item.paid && item.paidAt && (
                  <p className="dang-paid-at">
                    در {item.paidAt} پرداخت شده
                  </p>
                )}
              </div>
              <div className="card-action-buttons">
                <CardEditButton onClick={() => openEditForm(item)} />
                <CardDeleteButton onClick={() => openDeleteConfirm(item)} />
              </div>
            </div>
          ))}

          <div className="card installment-month-summary">
            <h3 className="card-title" style={{ fontSize: '0.9rem' }}>
              خلاصه {monthLabel}
            </h3>
            <div className="installment-month-summary-rows">
              <div className="installment-month-summary-row">
                <span className="installment-month-summary-label">
                  مجموع چک‌های این ماه
                </span>
                <span className="installment-month-summary-value" dir="ltr">
                  {formatMoney(monthTotals.total)}
                </span>
              </div>
              <div className="installment-month-summary-row">
                <span className="installment-month-summary-label">
                  پرداخت‌نشده تا پایان ماه
                </span>
                <span className="installment-month-summary-value unpaid" dir="ltr">
                  {formatMoney(monthTotals.unpaid)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      <FormModal
        open={showForm}
        title={editingItem ? 'ویرایش چک' : 'ثبت چک جدید'}
        onClose={closeForm}
        onSubmit={handleSubmit}
        saving={saving}
        saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره چک'}
      >
        <div className="form-group">
          <label>شماره چک <span className="required">*</span></label>
          <input
            type="text"
            value={form.checkNumber}
            onChange={(e) => setForm((f) => ({ ...f, checkNumber: e.target.value }))}
            placeholder="شماره چک"
            dir="ltr"
          />
        </div>

        <div className="form-group">
          <label>طرف حساب <span className="required">*</span></label>
          <input
            type="text"
            value={form.counterparty}
            onChange={(e) => setForm((f) => ({ ...f, counterparty: e.target.value }))}
            placeholder="نام طرف حساب"
          />
        </div>

        <div className="form-group">
          <label>مبلغ <span className="required">*</span></label>
          <AmountInput
            value={form.amount}
            onChange={(val) => setForm((f) => ({ ...f, amount: val }))}
          />
        </div>

        <div className="form-group">
          <label>تاریخ صدور <span className="required">*</span></label>
          <JalaliDatePicker
            value={form.creationDate}
            onChange={(date) => setForm((f) => ({ ...f, creationDate: date }))}
          />
        </div>

        <div className="form-group">
          <label>تاریخ سررسید <span className="required">*</span></label>
          <JalaliDatePicker
            value={form.dueDate}
            onChange={(date) => setForm((f) => ({ ...f, dueDate: date }))}
          />
        </div>
      </FormModal>

      <ConfirmActionModal {...importExportConfirmModal} />

      <ConfirmDeleteModal
        open={deletingItem !== null}
        message="از حذف این مورد مطمئن هستید؟"
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}
