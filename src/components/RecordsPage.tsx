import { useState, useEffect, useCallback } from 'react';
import { getSettings, isConfigured } from '../services/settings';
import { fetchRecords } from '../services/sheets';

interface RecordItem {
  id: string;
  createdAt: string;
  values: Record<string, string>;
}

export default function RecordsPage({
  onTokenExpired,
}: {
  onTokenExpired?: () => void;
}) {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState(false);

  const loadRecords = useCallback(async () => {
    const settings = getSettings();
    if (!settings?.sheetId) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchRecords(settings);
      setRecords(data.reverse());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onTokenExpired?.();
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [onTokenExpired]);

  useEffect(() => {
    setConfigured(isConfigured());
    if (isConfigured()) {
      loadRecords();
    }
  }, [loadRecords]);

  if (!configured) {
    return (
      <div className="empty-state">
        <div className="icon">📋</div>
        <p>هنوز شیت گوگل متصل نشده</p>
      </div>
    );
  }

  const settings = getSettings();
  const amountField = settings?.fields.find(
    (f) => f.id === 'amount' || f.label.includes('مبلغ')
  );
  const typeField = settings?.fields.find(
    (f) => f.id === 'type' || f.label.includes('نوع')
  );
  const titleField = settings?.fields.find(
    (f) => f.id === 'title' || f.label.includes('عنوان')
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>آخرین رکوردها</h2>
        <button className="btn btn-secondary btn-sm" onClick={loadRecords} disabled={loading}>
          {loading ? '...' : '↻ بروزرسانی'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && records.length === 0 ? (
        <div className="empty-state">
          <p>در حال بارگذاری...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p>هنوز رکوردی ثبت نشده</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '0 1rem' }}>
          {records.map((record) => {
            const amount = amountField ? record.values[amountField.id] : '';
            const type = typeField ? record.values[typeField.id] : '';
            const title = titleField
              ? record.values[titleField.id]
              : Object.values(record.values)[0] ?? '';

            const isIncome = type === 'درآمد';
            const amountClass = type
              ? isIncome
                ? 'amount-income'
                : 'amount-expense'
              : '';

            return (
              <div key={record.id} className="record-item">
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {record.createdAt}
                  </div>
                  {type && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        background: isIncome ? '#f0fdf4' : '#fef2f2',
                        color: isIncome ? 'var(--color-success)' : 'var(--color-danger)',
                      }}
                    >
                      {type}
                    </span>
                  )}
                </div>
                {amount && (
                  <div className={amountClass} dir="ltr">
                    {isIncome ? '+' : type === 'هزینه' ? '-' : ''}
                    {Number(amount).toLocaleString('fa-IR')}
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
