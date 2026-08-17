import { useState, useEffect, useCallback } from 'react';
import type { Dang } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { isTokenValid } from '../services/auth';
import {
  createDang,
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

type DangWithRow = Dang & { rowNumber: number };

export default function DangPage({ onReauth }: { onReauth?: () => void }) {
  const [items, setItems] = useState<DangWithRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState('');
  const [savingAmountId, setSavingAmountId] = useState('');
  const [amountEdits, setAmountEdits] = useState<Record<string, number | ''>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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
    setError('');
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
      setError(msg);
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

    if (!form.title.trim()) {
      setMessage({ type: 'error', text: 'عنوان الزامی است' });
      return;
    }
    if (!form.counterparty.trim()) {
      setMessage({ type: 'error', text: 'طرف حساب الزامی است' });
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setMessage({ type: 'error', text: 'مبلغ را وارد کنید' });
      return;
    }
    if (!form.date) {
      setMessage({ type: 'error', text: 'تاریخ الزامی است' });
      return;
    }

    const settings = getSettings()!;
    setSaving(true);
    setMessage(null);
    try {
      await createDang(settings.spreadsheetId, {
        title: form.title.trim(),
        counterparty: form.counterparty.trim(),
        amount: Number(form.amount),
        date: form.date,
        note: form.note.trim(),
      });
      setForm({
        title: '',
        counterparty: '',
        amount: '',
        date: getTodayIso(),
        note: '',
      });
      setShowForm(false);
      setMessage({ type: 'success', text: 'دنگ جدید ثبت شد' });
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت دنگ';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      setMessage({ type: 'error', text: msg });
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
    setMessage(null);
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
      setMessage({ type: 'error', text: msg });
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
      setMessage({ type: 'error', text: 'مبلغ باید بیشتر از صفر باشد' });
      return;
    }
    if (amount === item.amount) return;

    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    setSavingAmountId(item.id);
    setMessage(null);
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
      setMessage({ type: 'error', text: msg });
    } finally {
      setSavingAmountId('');
    }
  };

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

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <form className="card" onSubmit={handleCreate}>
          <h3 className="card-title">ثبت دنگ جدید</h3>

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

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" />}
            ذخیره دنگ
          </button>
        </form>
      )}

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
    </div>
  );
}
