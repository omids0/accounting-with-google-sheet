import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Dang } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { isTokenValid } from '../services/auth';
import {
  createDang,
  deleteDang,
  ensureDangSheet,
  fetchDangs,
  sortDangs,
  toggleDangPaid,
  updateDang,
  unpaidDangTotal,
} from '../services/dang';
import AmountInput from './AmountInput';
import JalaliDatePicker from './JalaliDatePicker';
import { DangCardListSkeleton } from './skeleton';
import { formatMoney } from '../utils/formatMoney';
import { formatIsoDatePersian, getTodayIso } from '../utils/jalaliDate';
import { showError, showSuccess } from '../utils/toast';
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial';
import { createPageSpeedDialActions } from '../hooks/pageSpeedDialActions';
import FormModal from './FormModal';
import CardEditButton from './CardEditButton';
import CardDeleteButton from './CardDeleteButton';
import ConfirmDeleteModal from './ConfirmDeleteModal';

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
  const [form, setForm] = useState({
    title: '',
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
      const data = await fetchDangs(settings.spreadsheetId);
      setItems(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری دنگ‌ها';
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
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          date: form.date,
          note: form.note.trim(),
        };
        await updateDang(settings.spreadsheetId, editingItem.rowNumber, updated);
        showSuccess('دنگ ویرایش شد');
      } else {
        await createDang(settings.spreadsheetId, {
          title: form.title.trim(),
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          date: form.date,
          note: form.note.trim(),
        });
        showSuccess('دنگ جدید ثبت شد');
      }
      closeForm();
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : editingItem ? 'خطا در ویرایش دنگ' : 'خطا در ثبت دنگ';
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
      showSuccess('دنگ حذف شد');
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف دنگ';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات دنگ',
      actions: createPageSpeedDialActions({
        onAdd: () => openCreateForm(),
        onRefresh: loadItems,
        refreshDisabled: loading,
      }),
    }),
    [loadItems, loading]
  );

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null);

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">🍽️</div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  const totalUnpaid = unpaidDangTotal(items);

  return (
    <div>
      <div className="card-header-row" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 600 }}>دنگ</h2>
      </div>

      {loading && items.length === 0 ? (
        <DangCardListSkeleton />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🍽️</div>
          <p>هنوز دنگی ثبت نشده</p>
        </div>
      ) : (
        <>
          {items.map((item) => {
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
        title={editingItem ? 'ویرایش دنگ' : 'ثبت دنگ جدید'}
        onClose={closeForm}
        onSubmit={handleSubmit}
        saving={saving}
        saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره دنگ'}
      >
        <div className="form-group">
          <label>عنوان <span className="required">*</span></label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="مثلاً: شام رستوران"
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
