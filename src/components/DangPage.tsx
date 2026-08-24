import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Dang } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { isTokenValid } from '../services/auth';
import {
  createDang,
  deleteDang,
  ensureDangSheet,
  exportDangsCsv,
  fetchDangs,
  importDangsCsv,
  sortDangs,
  toggleDangPaid,
  updateDang,
  unpaidDangTotal,
} from '../services/dang';
import AmountInput from './AmountInput';
import JalaliDatePicker from './JalaliDatePicker';
import { CategorySelect } from './form';
import { syncCategoriesFromSheet } from '../services/categories';
import { getDangCategories } from '../services/settings';
import { DangCardListSkeleton } from './skeleton';
import { formatMoney } from '../utils/formatMoney';
import { formatIsoDatePersian, getTodayIso } from '../utils/jalaliDate';
import { showError, showSuccess } from '../utils/toast';
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial';
import { createPageSpeedDialActions } from '../hooks/pageSpeedDialActions';
import { useSheetImportExport } from '../hooks/useSheetImportExport';
import FormModal from './FormModal';
import CardEditButton from './CardEditButton';
import CardDeleteButton from './CardDeleteButton';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import PageHeader from './PageHeader';
import SearchEmptyState from './SearchEmptyState';
import AppIcon from './AppIcon';
import { matchSearch } from '../utils/search';

type DangWithRow = Dang & { rowNumber: number };

export default function DangPage({ onReauth }: { onReauth?: () => void }) {
  const [items, setItems] = useState<DangWithRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<DangWithRow | null>(null);
  const [deletingItem, setDeletingItem] = useState<DangWithRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState('');
  const [savingAmountId, setSavingAmountId] = useState('');
  const [amountEdits, setAmountEdits] = useState<Record<string, number | ''>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>(() => getDangCategories());
  const [form, setForm] = useState({
    title: '',
    category: '',
    counterparty: '',
    amount: '' as number | '',
    date: getTodayIso(),
    note: '',
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
      await ensureDangSheet(settings.spreadsheetId);
      await syncCategoriesFromSheet(settings.spreadsheetId);
      setCategories(getDangCategories());
      const data = await fetchDangs(settings.spreadsheetId);
      setItems(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری بدهی‌ها';
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

    if (!form.title.trim()) {
      showError('عنوان الزامی است');
      return;
    }
    if (!form.category.trim()) {
      showError('دسته‌بندی الزامی است');
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
    if (!form.date) {
      showError('تاریخ الزامی است');
      return;
    }

    const settings = getSettings()!;
    setSaving(true);
    try {
      if (editingItem) {
        const updated: Dang = {
          ...editingItem,
          title: form.title.trim(),
          category: form.category.trim(),
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          date: form.date,
          note: form.note.trim(),
        };
        await updateDang(settings.spreadsheetId, editingItem.rowNumber, updated);
        showSuccess('بدهی ویرایش شد');
      } else {
        await createDang(settings.spreadsheetId, {
          title: form.title.trim(),
          category: form.category.trim(),
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          date: form.date,
          note: form.note.trim(),
        });
        showSuccess('بدهی جدید ثبت شد');
      }
      closeForm();
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : editingItem ? 'خطا در ویرایش بدهی' : 'خطا در ثبت بدهی';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePaid = async (item: DangWithRow, paid: boolean) => {
    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    setTogglingId(item.id);
    try {
      const updated = await toggleDangPaid(settings.spreadsheetId, item, paid);
      setItems((prev) =>
        sortDangs(
          prev.map((d) =>
            d.id === item.id ? { ...updated, rowNumber: item.rowNumber } : d
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

  const handleAmountChange = (item: DangWithRow, value: number | '') => {
    setAmountEdits((prev) => ({ ...prev, [item.id]: value }));
  };

  const handleAmountBlur = async (item: DangWithRow) => {
    const pending = amountEdits[item.id];
    if (pending === undefined) return;

    setAmountEdits((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });

    const amount = Number(pending);
    if (!amount || amount <= 0) {
      showError('مبلغ باید بیشتر از صفر باشد');
      return;
    }
    if (amount === item.amount) return;

    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    setSavingAmountId(item.id);
    try {
      const updated: Dang = { ...item, amount };
      await updateDang(settings.spreadsheetId, item.rowNumber, updated);
      setItems((prev) =>
        sortDangs(
          prev.map((d) =>
            d.id === item.id ? { ...updated, rowNumber: item.rowNumber } : d
          )
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در به‌روزرسانی مبلغ';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setSavingAmountId('');
    }
  };

  const resetCreateForm = () => {
    setForm({
      title: '',
      category: categories[0] ?? '',
      counterparty: '',
      amount: '',
      date: getTodayIso(),
      note: '',
    });
  };

  const openCreateForm = () => {
    setEditingItem(null);
    resetCreateForm();
    setShowForm(true);
  };

  const openEditForm = (item: DangWithRow) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      category: item.category,
      counterparty: item.counterparty,
      amount: item.amount,
      date: item.date,
      note: item.note,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingItem(null);
    resetCreateForm();
  };

  const openDeleteConfirm = (item: DangWithRow) => {
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
      await deleteDang(settings.spreadsheetId, deletingItem.rowNumber);
      setDeletingItem(null);
      showSuccess('بدهی حذف شد');
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف بدهی';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const { handleExport, handleImport } = useSheetImportExport({
    exportFn: exportDangsCsv,
    importFn: importDangsCsv,
    onComplete: loadItems,
    onReauth,
  });

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات بدهی',
      actions: createPageSpeedDialActions({
        onAdd: () => openCreateForm(),
        onRefresh: loadItems,
        refreshDisabled: loading,
        onImport: handleImport,
        onExport: handleExport,
      }),
    }),
    [loadItems, loading, handleImport, handleExport]
  );

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null);

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        matchSearch(
          searchQuery,
          item.title,
          item.category,
          item.counterparty,
          item.note,
          item.amount,
          item.date
        )
      ),
    [items, searchQuery]
  );

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="debt" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  const totalUnpaid = unpaidDangTotal(items);

  return (
    <div>
      <PageHeader
        title="بدهی"
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="جستجو در بدهی‌ها..."
      />

      {loading && items.length === 0 ? (
        <DangCardListSkeleton />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
          <AppIcon name="debt" />
        </div>
          <p>هنوز بدهی ثبت نشده</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <SearchEmptyState />
      ) : (
        <>
          {filteredItems.map((item) => {
            const amountValue =
              amountEdits[item.id] !== undefined ? amountEdits[item.id] : item.amount;

            return (
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
                    <span className="dang-card-title">{item.title}</span>
                    <div className="dang-card-amount-wrap">
                      <AmountInput
                        compact
                        value={amountValue}
                        onChange={(val) => handleAmountChange(item, val)}
                        onBlur={() => handleAmountBlur(item)}
                      />
                      {savingAmountId === item.id && (
                        <span className="dang-amount-saving">...</span>
                      )}
                    </div>
                  </div>
                  <div className="dang-card-meta">
                    {item.category && `${item.category} · `}
                    طرف حساب: {item.counterparty}
                    {item.date && (
                      <span className="dang-card-date">
                        · {formatIsoDatePersian(item.date)}
                      </span>
                    )}
                  </div>
                  {item.note && <p className="dang-card-note">{item.note}</p>}
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
            );
          })}

          {totalUnpaid > 0 && (
            <div className="card dang-total-footer">
              <span className="dang-total-label">مانده پرداخت نشده</span>
              <span className="dang-total-value" dir="ltr">
                {formatMoney(totalUnpaid)}
              </span>
            </div>
          )}
        </>
      )}

      <FormModal
        open={showForm}
        title={editingItem ? 'ویرایش بدهی' : 'ثبت بدهی جدید'}
        onClose={closeForm}
        onSubmit={handleSubmit}
        saving={saving}
        saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره بدهی'}
      >
        <div className="form-group">
          <label>عنوان <span className="required">*</span></label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="مثلاً: خرید از فروشگاه"
          />
        </div>

        <div className="form-group">
          <label>دسته‌بندی <span className="required">*</span></label>
          <CategorySelect
            value={form.category}
            onChange={(category) => setForm((f) => ({ ...f, category }))}
            categories={categories}
            categoryScope="dang"
            onCategoriesChange={(next) => {
              setCategories(next);
              if (!next.includes(form.category)) {
                setForm((f) => ({ ...f, category: next[0] ?? '' }));
              }
            }}
            onReauth={onReauth}
            aria-label="دسته‌بندی بدهی"
          />
        </div>

        <div className="form-group">
          <label>طرف حساب <span className="required">*</span></label>
          <input
            type="text"
            value={form.counterparty}
            onChange={(e) => setForm((f) => ({ ...f, counterparty: e.target.value }))}
            placeholder="نام شخص یا گروه"
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
          <label>تاریخ <span className="required">*</span></label>
          <JalaliDatePicker
            value={form.date}
            onChange={(date) => setForm((f) => ({ ...f, date }))}
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
