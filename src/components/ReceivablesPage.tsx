import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Receivable } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { isTokenValid } from '../services/auth';
import {
  addReceivablePayment,
  createReceivable,
  ensureReceivablesSheet,
  fetchReceivables,
  isReceivableComplete,
  paidAmount,
  remainingAmount,
  sortReceivables,
  updateReceivable,
} from '../services/receivables';
import AmountInput from './AmountInput';
import { InstallmentCardListSkeleton } from './skeleton';
import JalaliDatePicker from './JalaliDatePicker';
import { formatMoney } from '../utils/formatMoney';
import { formatIsoDatePersian, getTodayIso } from '../utils/jalaliDate';
import { showError, showSuccess } from '../utils/toast';
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial';
import { createPageSpeedDialActions } from '../hooks/pageSpeedDialActions';
import FormModal from './FormModal';
import CardEditButton from './CardEditButton';

type ReceivableWithRow = Receivable & { rowNumber: number };

export default function ReceivablesPage({ onReauth }: { onReauth?: () => void }) {
  const [items, setItems] = useState<ReceivableWithRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ReceivableWithRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payingId, setPayingId] = useState('');


  const [form, setForm] = useState({
    debtor: '',
    amount: '' as number | '',
    borrowDate: getTodayIso(),
    note: '',
  });
  const [paymentForm, setPaymentForm] = useState<{
    receivableId: string;
    amount: number | '';
    note: string;
  } | null>(null);

  const loadItems = useCallback(async () => {
    const settings = getSettings();
    if (!settings?.spreadsheetId) return;
    if (!isTokenValid()) {
      onReauth?.();
      return;
    }

    setLoading(true);
    try {
      await ensureReceivablesSheet(settings.spreadsheetId);
      const data = await fetchReceivables(settings.spreadsheetId);
      setItems(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری طلب‌ها';
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

    if (!form.debtor.trim()) {
      showError('نام شخص یا ارگان الزامی است');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      showError('مبلغ را وارد کنید');
      return;
    }
    if (!form.borrowDate) {
      showError('تاریخ قرض الزامی است');
      return;
    }

    const settings = getSettings()!;
    setSaving(true);
    try {
      if (editingItem) {
        const nextAmount = Number(form.amount);
        if (nextAmount < paidAmount(editingItem)) {
          showError('مبلغ نمی‌تواند کمتر از مجموع پرداخت‌ها باشد');
          return;
        }
        const updated = {
          ...editingItem,
          debtor: form.debtor.trim(),
          amount: nextAmount,
          borrowDate: form.borrowDate,
          note: form.note.trim(),
        };
        await updateReceivable(settings.spreadsheetId, editingItem.rowNumber, updated);
        showSuccess('طلب ویرایش شد');
      } else {
        await createReceivable(settings.spreadsheetId, {
          debtor: form.debtor.trim(),
          amount: Number(form.amount),
          borrowDate: form.borrowDate,
          note: form.note.trim(),
        });
        showSuccess('طلب جدید ثبت شد');
      }
      closeForm();
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : editingItem ? 'خطا در ویرایش طلب' : 'خطا در ثبت طلب';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async (receivable: ReceivableWithRow) => {
    if (!paymentForm || paymentForm.receivableId !== receivable.id) return;

    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    const payAmount = Number(paymentForm.amount);
    if (!payAmount || payAmount <= 0) {
      showError('مبلغ پرداخت را وارد کنید');
      return;
    }

    const remaining = remainingAmount(receivable);
    if (payAmount > remaining) {
      showError(`مبلغ پرداخت نمی‌تواند بیشتر از مانده (${formatMoney(remaining)}) باشد`);
      return;
    }

    setPayingId(receivable.id);
    try {
      const updated = await addReceivablePayment(settings.spreadsheetId, receivable, {
        amount: payAmount,
        note: paymentForm.note.trim(),
      });
      setItems((prev) =>
        sortReceivables(
          prev.map((item) =>
            item.id === receivable.id
              ? { ...updated, rowNumber: receivable.rowNumber }
              : item
          )
        )
      );
      setPaymentForm(null);
      showSuccess('پرداخت ثبت شد');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت پرداخت';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setPayingId('');
    }
  };

  const resetCreateForm = () => {
    setForm({
      debtor: '',
      amount: '',
      borrowDate: getTodayIso(),
      note: '',
    });
  };

  const openCreateForm = () => {
    setEditingItem(null);
    resetCreateForm();
    setShowForm(true);
  };

  const openEditForm = (item: ReceivableWithRow) => {
    setEditingItem(item);
    setForm({
      debtor: item.debtor,
      amount: item.amount,
      borrowDate: item.borrowDate,
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

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات طلب‌ها',
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
        <div className="icon">💰</div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  const totalRemaining = items.reduce((sum, item) => sum + remainingAmount(item), 0);

  return (
    <div>
      <div className="card-header-row" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 600 }}>طلب‌ها</h2>
      </div>

      {loading && items.length === 0 ? (
        <InstallmentCardListSkeleton />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">💰</div>
          <p>هنوز طلبی ثبت نشده</p>
        </div>
      ) : (
        items.map((item) => {
          const expanded = expandedId === item.id;
          const paid = paidAmount(item);
          const remaining = remainingAmount(item);
          const complete = isReceivableComplete(item);
          const progress =
            item.amount > 0 ? Math.round((paid / item.amount) * 100) : 0;

          return (
            <div
              key={item.id}
              className={`card installment-card${complete ? ' receivable-complete' : ''}`}
            >
              <div className="card-header-with-edit">
                <button
                  type="button"
                  className="installment-header"
                  onClick={() => {
                    setExpandedId(expanded ? null : item.id);
                    setPaymentForm(null);
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.debtor}</div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        marginTop: '0.25rem',
                      }}
                    >
                      {formatMoney(item.amount)}
                      {complete
                        ? ' · تسویه شده'
                        : ` · مانده: ${formatMoney(remaining)}`}
                    </div>
                    <div className="installment-progress">
                      <div
                        className="installment-progress-bar"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="installment-chevron">{expanded ? '▲' : '▼'}</span>
                </button>
                <CardEditButton
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditForm(item);
                  }}
                />
              </div>

              {expanded && (
                <div className="installment-payments">
                  {item.note && <p className="installment-note">{item.note}</p>}

                  <div className="receivable-summary">
                    <div>
                      <span className="receivable-summary-label">تاریخ قرض</span>
                      <span>{formatIsoDatePersian(item.borrowDate)}</span>
                    </div>
                    <div>
                      <span className="receivable-summary-label">پرداخت شده</span>
                      <span className="receivable-paid">{formatMoney(paid)}</span>
                    </div>
                    <div>
                      <span className="receivable-summary-label">مانده</span>
                      <span className={complete ? 'receivable-settled' : 'receivable-remaining'}>
                        {formatMoney(remaining)}
                      </span>
                    </div>
                  </div>

                  {item.payments.length > 0 && (
                    <div className="receivable-payment-list">
                      <div className="receivable-payment-list-title">سوابق پرداخت</div>
                      {item.payments.map((payment) => (
                        <div key={payment.id} className="receivable-payment-item">
                          <div>
                            <span dir="ltr">{formatMoney(payment.amount)}</span>
                            <span className="installment-due">
                              {formatIsoDatePersian(payment.paidAt)}
                            </span>
                            {payment.note && (
                              <span className="installment-due">{payment.note}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!complete && (
                    <div className="receivable-add-payment">
                      {paymentForm?.receivableId === item.id ? (
                        <div className="receivable-payment-form">
                          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <label>مبلغ پرداخت</label>
                            <AmountInput
                              value={paymentForm.amount}
                              onChange={(val) =>
                                setPaymentForm((f) =>
                                  f ? { ...f, amount: val } : f
                                )
                              }
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <label>توضیحات</label>
                            <input
                              type="text"
                              value={paymentForm.note}
                              onChange={(e) =>
                                setPaymentForm((f) =>
                                  f ? { ...f, note: e.target.value } : f
                                )
                              }
                              placeholder="اختیاری"
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={payingId === item.id}
                              onClick={() => handleAddPayment(item)}
                            >
                              {payingId === item.id && <span className="spinner" />}
                              ثبت پرداخت
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setPaymentForm(null)}
                            >
                              انصراف
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() =>
                            setPaymentForm({
                              receivableId: item.id,
                              amount: '',
                              note: '',
                            })
                          }
                        >
                          + ثبت پرداخت
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {items.length > 0 && (
        <div className="card receivable-total-card">
          <div className="receivable-total-label">مجموع مانده طلب‌ها</div>
          <div className="receivable-total-amount">{formatMoney(totalRemaining)}</div>
        </div>
      )}

      <FormModal
        open={showForm}
        title={editingItem ? 'ویرایش طلب' : 'ثبت طلب جدید'}
        onClose={closeForm}
        onSubmit={handleSubmit}
        saving={saving}
        saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره طلب'}
      >
        <div className="form-group">
          <label>نام شخص یا ارگان <span className="required">*</span></label>
          <input
            type="text"
            value={form.debtor}
            onChange={(e) => setForm((f) => ({ ...f, debtor: e.target.value }))}
            placeholder="مثلاً: علی محمدی"
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
          <label>تاریخ قرض گرفتن <span className="required">*</span></label>
          <JalaliDatePicker
            value={form.borrowDate}
            onChange={(iso) => setForm((f) => ({ ...f, borrowDate: iso }))}
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
