import { useState, useEffect, useCallback } from 'react';
import type { WalletAccount } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { isTokenValid } from '../services/auth';
import {
  createWalletAccount,
  ensureWalletSheet,
  fetchWalletAccounts,
  updateWalletAccount,
} from '../services/wallet';
import AmountInput from './AmountInput';
import { formatMoney } from '../utils/formatMoney';

type WalletAccountWithRow = WalletAccount & { rowNumber: number };

export default function WalletPage({ onReauth }: { onReauth?: () => void }) {
  const [items, setItems] = useState<WalletAccountWithRow[]>([]);
  const [balances, setBalances] = useState<Record<string, number | ''>>({});
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [form, setForm] = useState({
    title: '',
    balance: '' as number | '',
    note: '',
  });

  const syncBalances = useCallback((accounts: WalletAccountWithRow[]) => {
    const next: Record<string, number | ''> = {};
    for (const account of accounts) {
      next[account.id] = account.balance;
    }
    setBalances(next);
  }, []);

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
      await ensureWalletSheet(settings.spreadsheetId);
      const data = await fetchWalletAccounts(settings.spreadsheetId);
      setItems(data);
      syncBalances(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری کیف پول';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [onReauth, syncBalances]);

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
    if (form.balance === '' || Number(form.balance) < 0) {
      setMessage({ type: 'error', text: 'موجودی را وارد کنید' });
      return;
    }

    const settings = getSettings()!;
    setSaving(true);
    setMessage(null);
    try {
      await createWalletAccount(settings.spreadsheetId, {
        title: form.title.trim(),
        balance: Number(form.balance),
        note: form.note.trim(),
      });
      setForm({ title: '', balance: '', note: '' });
      setShowForm(false);
      setMessage({ type: 'success', text: 'حساب جدید اضافه شد' });
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت حساب';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      setMessage({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleBalanceSave = async (account: WalletAccountWithRow) => {
    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    const nextBalance = balances[account.id];
    if (nextBalance === '' || nextBalance < 0) {
      setMessage({ type: 'error', text: 'موجودی نامعتبر است' });
      syncBalances([account]);
      return;
    }
    if (nextBalance === account.balance) return;

    setSavingId(account.id);
    setMessage(null);
    try {
      const updated = await updateWalletAccount(settings.spreadsheetId, {
        ...account,
        balance: nextBalance,
      });
      setItems((prev) =>
        prev
          .map((item) =>
            item.id === account.id ? { ...updated, rowNumber: account.rowNumber } : item
          )
          .sort((a, b) => a.title.localeCompare(b.title, 'fa'))
      );
      setMessage({ type: 'success', text: `موجودی «${account.title}» ذخیره شد` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ذخیره موجودی';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      setMessage({ type: 'error', text: msg });
      syncBalances([account]);
    } finally {
      setSavingId('');
    }
  };

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">👛</div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  const totalBalance = items.reduce((sum, item) => {
    const value = balances[item.id];
    return sum + (value === '' ? item.balance : Number(value));
  }, 0);

  return (
    <div>
      <div className="card-header-row" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 600 }}>کیف پول</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowForm((v) => !v)}
            type="button"
          >
            {showForm ? 'بستن' : '+ حساب'}
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
          <h3 className="card-title">حساب جدید</h3>

          <div className="form-group">
            <label>عنوان <span className="required">*</span></label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="مثلاً: بانک ملت، نقدی، ..."
            />
          </div>

          <div className="form-group">
            <label>موجودی <span className="required">*</span></label>
            <AmountInput
              value={form.balance}
              onChange={(val) => setForm((f) => ({ ...f, balance: val }))}
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
            ذخیره حساب
          </button>
        </form>
      )}

      {loading && items.length === 0 ? (
        <div className="empty-state">
          <p>در حال بارگذاری...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">👛</div>
          <p>هنوز حسابی ثبت نشده</p>
        </div>
      ) : (
        items.map((account) => (
          <div key={account.id} className="card wallet-item-card">
            <div className="wallet-item-header">
              <div>
                <div className="wallet-item-title">{account.title}</div>
                {account.note && <div className="wallet-item-note">{account.note}</div>}
              </div>
              {savingId === account.id && <span className="spinner" />}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>موجودی</label>
              <AmountInput
                compact
                value={balances[account.id] ?? account.balance}
                onChange={(val) =>
                  setBalances((prev) => ({ ...prev, [account.id]: val }))
                }
                onBlur={() => handleBalanceSave(account)}
              />
            </div>
          </div>
        ))
      )}

      {items.length > 0 && (
        <div className="card receivable-total-card">
          <div className="receivable-total-label">مجموع کل حساب‌ها</div>
          <div className="receivable-total-amount">{formatMoney(totalBalance)}</div>
        </div>
      )}
    </div>
  );
}
