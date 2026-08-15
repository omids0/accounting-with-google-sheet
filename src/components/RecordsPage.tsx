import { useState, useEffect, useCallback } from 'react';
import type { CustomForm } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { fetchRecords } from '../services/sheets';
import { isTokenValid } from '../services/auth';

import { formatMoney } from '../utils/formatMoney';
import { formatIsoDatePersian } from '../utils/jalaliDate';

interface RecordItem {
  id: string;
  createdAt: string;
  values: Record<string, string>;
}

export default function RecordsPage({ onReauth }: { onReauth?: () => void }) {
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [activeFormId, setActiveFormId] = useState('');
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeForm = forms.find((f) => f.id === activeFormId);

  const loadRecords = useCallback(async () => {
    const settings = getSettings();
    const form = settings?.forms.find((f) => f.id === activeFormId);
    if (!settings?.spreadsheetId || !form) return;

    if (!isTokenValid()) {
      onReauth?.();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await fetchRecords(settings.spreadsheetId, form);
      setRecords(data.reverse());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeFormId, onReauth]);

  useEffect(() => {
    const settings = getSettings();
    if (!settings) return;
    setForms(settings.forms);
    if (settings.forms.length) setActiveFormId(settings.forms[0].id);
  }, []);

  useEffect(() => {
    if (activeFormId && isConfigured()) loadRecords();
  }, [activeFormId, loadRecords]);

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">📋</div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  const amountField = activeForm?.fields.find((f) => f.id === 'amount');
  const dateField = activeForm?.fields.find((f) => f.type === 'date');
  const titleField = activeForm?.fields.find(
    (f) => f.id === 'title' || f.label.includes('عنوان')
  );
  const categoryField = activeForm?.fields.find((f) => f.id === 'category');

  return (
    <div>
      <div className="form-tabs">
        {forms.map((form) => (
          <button
            key={form.id}
            className={activeFormId === form.id ? 'active' : ''}
            onClick={() => setActiveFormId(form.id)}
            type="button"
          >
            {form.name}
          </button>
        ))}
      </div>

      <div className="card-header-row" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 600 }}>
          {activeForm?.name ?? 'رکوردها'}
        </h2>
        <button className="btn btn-secondary btn-sm" onClick={loadRecords} disabled={loading}>
          {loading ? '...' : '↻'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && records.length === 0 ? (
        <div className="empty-state"><p>در حال بارگذاری...</p></div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p>هنوز رکوردی ثبت نشده</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '0 1rem' }}>
          {records.map((record) => {
            const amount = amountField ? record.values[amountField.id] : '';
            const title = titleField
              ? record.values[titleField.id]
              : Object.values(record.values)[0] ?? '';
            const category = categoryField ? record.values[categoryField.id] : '';
            const date = dateField ? record.values[dateField.id] : '';
            const isIncome = activeForm?.type === 'income';

            return (
              <div key={record.id} className="record-item">
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {date ? formatIsoDatePersian(date) : record.createdAt}
                    {category && ` · ${category}`}
                  </div>
                </div>
                {amount && (
                  <div
                    className={isIncome ? 'amount-income' : activeForm?.type === 'expense' ? 'amount-expense' : ''}
                    dir="ltr"
                  >
                    {isIncome ? '+' : activeForm?.type === 'expense' ? '-' : ''}
                    {formatMoney(Number(amount))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
