import { useState, useEffect, useCallback } from 'react';
import { getSettings, isConfigured } from '../services/settings';
import { isTokenValid } from '../services/auth';
import {
  fetchAllOpeningBalances,
  setOpeningBalance,
  type MonthlyOpeningBalance,
} from '../services/monthlyBalance';
import { formatJalaliMonthLabel, getDateRange, getJalaliMonthKey } from '../utils/dateRange';
import AmountInput from './AmountInput';
import { formatMoney } from '../utils/formatMoney';

type OpeningBalanceWithRow = MonthlyOpeningBalance & { rowNumber: number };

type EditState = {
  amount: number | '';
  note: string;
};

export default function OpeningBalancePage({ onReauth }: { onReauth?: () => void }) {
  const [items, setItems] = useState<OpeningBalanceWithRow[]>([]);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const currentMonthKey = getJalaliMonthKey(getDateRange('month-to-date').start);

  const syncEdits = useCallback((balances: OpeningBalanceWithRow[]) => {
    const next: Record<string, EditState> = {};
    for (const item of balances) {
      next[item.monthKey] = { amount: item.amount, note: item.note };
    }
    setEdits(next);
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
      const data = await fetchAllOpeningBalances(settings.spreadsheetId);
      const previousMonths = data.filter((item) => item.monthKey < currentMonthKey);
      setItems(previousMonths);
      syncEdits(previousMonths);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری موجودی اول دوره';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentMonthKey, onReauth, syncEdits]);

  useEffect(() => {
    if (isConfigured()) loadItems();
  }, [loadItems]);

  const handleSave = async (item: OpeningBalanceWithRow) => {
    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    const edit = edits[item.monthKey];
    if (!edit || edit.amount === '' || edit.amount < 0) {
      setMessage({ type: 'error', text: 'مبلغ نامعتبر است' });
      syncEdits([item]);
      return;
    }
    if (edit.amount === item.amount && edit.note === item.note) return;

    setSavingId(item.monthKey);
    setMessage(null);
    try {
      const updated = await setOpeningBalance(
        settings.spreadsheetId,
        item.monthKey,
        Number(edit.amount),
        edit.note.trim()
      );
      setItems((prev) =>
        prev
          .map((entry) =>
            entry.monthKey === item.monthKey
              ? { ...updated, rowNumber: item.rowNumber }
              : entry
          )
          .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      );
      setEdits((prev) => ({
        ...prev,
        [item.monthKey]: { amount: updated.amount, note: updated.note },
      }));
      setMessage({
        type: 'success',
        text: `موجودی ${formatJalaliMonthLabel(item.monthKey)} ذخیره شد`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ذخیره موجودی اول';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      setMessage({ type: 'error', text: msg });
      syncEdits([item]);
    } finally {
      setSavingId('');
    }
  };

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">📅</div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card-header-row" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 600 }}>موجودی اول دوره</h2>
        <button
          className="btn btn-secondary btn-sm"
          onClick={loadItems}
          disabled={loading}
          type="button"
        >
          {loading ? '...' : '↻'}
        </button>
      </div>

      <p className="opening-balance-page-hint">
        موجودی کیف پول در ابتدای هر ماه. ماه جاری را از صفحه کیف پول ویرایش کنید.
      </p>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading && items.length === 0 ? (
        <div className="empty-state">
          <p>در حال بارگذاری...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📅</div>
          <p>هنوز موجودی اول دوره‌ای برای ماه‌های قبل ثبت نشده</p>
        </div>
      ) : (
        items.map((item) => {
          const expanded = expandedId === item.monthKey;
          const edit = edits[item.monthKey];
          const displayAmount =
            edit?.amount === '' || edit?.amount == null ? item.amount : Number(edit.amount);

          return (
            <div
              key={item.monthKey}
              className="card installment-card dashboard-opening-card wallet-item-card"
            >
              <button
                type="button"
                className="installment-header wallet-item-header"
                onClick={() => setExpandedId(expanded ? null : item.monthKey)}
              >
                <div className="wallet-item-info">
                  <div className="wallet-item-title-row">
                    <div className="wallet-item-title">
                      {formatJalaliMonthLabel(item.monthKey)}
                    </div>
                    <div className="wallet-item-amount">{formatMoney(displayAmount)}</div>
                  </div>
                  {item.updatedAt && (
                    <div className="wallet-item-note">آخرین ویرایش: {item.updatedAt}</div>
                  )}
                </div>
                <span className="installment-chevron">{expanded ? '▲' : '▼'}</span>
              </button>

              {expanded && edit && (
                <div className="installment-payments dashboard-opening-body">
                  <div className="form-group">
                    <label>موجودی اول دوره</label>
                    <AmountInput
                      value={edit.amount}
                      onChange={(val) =>
                        setEdits((prev) => ({
                          ...prev,
                          [item.monthKey]: { ...prev[item.monthKey], amount: val },
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>توضیحات</label>
                    <textarea
                      value={edit.note}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [item.monthKey]: { ...prev[item.monthKey], note: e.target.value },
                        }))
                      }
                      placeholder="توضیحات اختیاری"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSave(item)}
                    disabled={savingId === item.monthKey || loading}
                  >
                    {savingId === item.monthKey ? '...' : 'ذخیره'}
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
