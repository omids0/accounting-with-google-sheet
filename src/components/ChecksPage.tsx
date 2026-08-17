import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Check } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { isTokenValid } from '../services/auth';
import {
  createCheck,
  ensureChecksSheet,
  fetchChecks,
  sortChecks,
  toggleCheckPaid,
  totalChecksInRange,
  totalUnpaidChecksInRange,
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

type CheckWithRow = Check & { rowNumber: number };

export default function ChecksPage({ onReauth }: { onReauth?: () => void }) {
  const [items, setItems] = useState<CheckWithRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState('');


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

  const handleCreate = async (e: React.FormEvent) => {
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
      await createCheck(settings.spreadsheetId, {
        checkNumber: form.checkNumber.trim(),
        counterparty: form.counterparty.trim(),
        amount: Number(form.amount),
        creationDate: form.creationDate,
        dueDate: form.dueDate,
      });
      setForm({
        checkNumber: '',
        counterparty: '',
        amount: '',
        creationDate: getTodayIso(),
        dueDate: getTodayIso(),
      });
      setShowForm(false);
      showSuccess('چک جدید ثبت شد');
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت چک';
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

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">📝</div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card-header-row" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 600 }}>چک‌ها</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowForm((v) => !v)}
            type="button"
          >
            {showForm ? 'بستن' : '+ جدید'}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadItems}
            disabled={loading}
            type="button"
          >
            {loading ? '...' : '↻'}
          </button>
        </div>
      </div>

      {showForm && (
        <form className="card" onSubmit={handleCreate}>
          <h3 className="card-title">ثبت چک جدید</h3>

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

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" />}
            ذخیره چک
          </button>
        </form>
      )}

      {loading && items.length === 0 ? (
        <DangCardListSkeleton />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📝</div>
          <p>هنوز چکی ثبت نشده</p>
        </div>
      ) : (
        <>
          {items.map((item) => (
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
    </div>
  );
}
