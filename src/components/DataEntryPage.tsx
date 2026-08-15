import { useState, useEffect } from 'react';
import type { FieldConfig } from '../types';
import { getSettings, getDefaultSettings, isConfigured } from '../services/settings';
import { appendRecord } from '../services/sheets';

function getInitialValue(field: FieldConfig): string | number {
  if (field.type === 'date') {
    return new Date().toISOString().split('T')[0];
  }
  if (field.type === 'number') return '';
  if (field.type === 'select' && field.options?.length) return field.options[0];
  return '';
}

function isSessionExpiredError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : '';
  return msg.includes('منقضی') || msg.includes('401');
}

export default function DataEntryPage({
  onTokenExpired,
}: {
  onTokenExpired?: () => void;
}) {
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const settings = getSettings() ?? getDefaultSettings();
    setFields(settings.fields);
    const initial: Record<string, string | number> = {};
    settings.fields.forEach((f) => {
      initial[f.id] = getInitialValue(f);
    });
    setValues(initial);
    setConfigured(isConfigured());
  }, []);

  const handleChange = (fieldId: string, value: string | number) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) {
      setMessage({ type: 'error', text: 'ابتدا در تنظیمات، شیت گوگل را متصل کنید' });
      return;
    }

    for (const field of fields) {
      if (field.required) {
        const val = values[field.id];
        if (val === '' || val === undefined || val === null) {
          setMessage({ type: 'error', text: `فیلد «${field.label}» الزامی است` });
          return;
        }
      }
    }

    setLoading(true);
    setMessage(null);
    try {
      const settings = getSettings()!;
      const recordId = crypto.randomUUID();
      const createdAt = new Date().toLocaleString('fa-IR');
      await appendRecord(settings, recordId, createdAt, values);
      setMessage({ type: 'success', text: 'رکورد با موفقیت ذخیره شد ✓' });
      const reset: Record<string, string | number> = {};
      fields.forEach((f) => {
        reset[f.id] = getInitialValue(f);
      });
      setValues(reset);
    } catch (err) {
      if (isSessionExpiredError(err)) {
        onTokenExpired?.();
        return;
      }
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'خطا در ذخیره',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!configured) {
    return (
      <div className="empty-state">
        <div className="icon">⚙️</div>
        <p>هنوز شیت گوگل متصل نشده</p>
        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
          به بخش تنظیمات بروید و شیت را بسازید یا متصل کنید
        </p>
      </div>
    );
  }

  return (
    <div>
      {message && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      <form onSubmit={handleSubmit}>
        {fields.map((field) => (
          <div key={field.id} className="form-group">
            <label>
              {field.label}
              {field.required && <span className="required"> *</span>}
            </label>

            {field.type === 'text' && (
              <input
                type="text"
                value={String(values[field.id] ?? '')}
                onChange={(e) => handleChange(field.id, e.target.value)}
              />
            )}

            {field.type === 'number' && (
              <input
                type="number"
                inputMode="decimal"
                value={values[field.id] === '' ? '' : values[field.id]}
                onChange={(e) =>
                  handleChange(
                    field.id,
                    e.target.value === '' ? '' : Number(e.target.value)
                  )
                }
                dir="ltr"
              />
            )}

            {field.type === 'date' && (
              <input
                type="date"
                value={String(values[field.id] ?? '')}
                onChange={(e) => handleChange(field.id, e.target.value)}
                dir="ltr"
              />
            )}

            {field.type === 'select' && (
              <select
                value={String(values[field.id] ?? '')}
                onChange={(e) => handleChange(field.id, e.target.value)}
              >
                {(field.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading && <span className="spinner" />}
          ذخیره در گوگل شیت
        </button>
      </form>
    </div>
  );
}
