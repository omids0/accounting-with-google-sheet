import { useState, useEffect } from 'react';
import type { CustomForm, FieldConfig } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { appendRecord } from '../services/sheets';
import { isTokenValid } from '../services/auth';
import JalaliDatePicker from './JalaliDatePicker';
import AmountInput from './AmountInput';
import Select from './Select';
import { getTodayIso } from '../utils/jalaliDate';

function getInitialValue(field: FieldConfig): string | number {
  if (field.type === 'date') return getTodayIso();
  if (field.type === 'number') return '';
  if (field.type === 'select' && field.options?.length) return field.options[0];
  return '';
}

export default function DataEntryPage({ onReauth }: { onReauth?: () => void }) {
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [activeFormId, setActiveFormId] = useState('');
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const activeForm = forms.find((f) => f.id === activeFormId);

  useEffect(() => {
    const settings = getSettings();
    if (!settings) return;
    setForms(settings.forms);
    if (settings.forms.length) {
      setActiveFormId(settings.forms[0].id);
      initValues(settings.forms[0]);
    }
  }, []);

  const initValues = (form: CustomForm) => {
    const initial: Record<string, string | number> = {};
    form.fields.forEach((f) => {
      initial[f.id] = getInitialValue(f);
    });
    setValues(initial);
  };

  const selectForm = (form: CustomForm) => {
    setActiveFormId(form.id);
    initValues(form);
    setMessage(null);
  };

  const handleChange = (fieldId: string, value: string | number) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.();
      return;
    }
    if (!activeForm) return;

    for (const field of activeForm.fields) {
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
      await appendRecord(
        settings.spreadsheetId,
        activeForm,
        crypto.randomUUID(),
        new Date().toLocaleString('fa-IR'),
        values
      );
      setMessage({ type: 'success', text: `در شیت «${activeForm.sheetName}» ذخیره شد ✓` });
      initValues(activeForm);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ذخیره';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">✏️</div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  return (
    <div>
      <div className="form-tabs">
        {forms.map((form) => (
          <button
            key={form.id}
            className={[
              activeFormId === form.id ? 'active' : '',
              form.type === 'income' ? 'tab-income' : '',
              form.type === 'expense' ? 'tab-expense' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => selectForm(form)}
            type="button"
          >
            {form.name}
          </button>
        ))}
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {activeForm && (
        <form onSubmit={handleSubmit}>
          {activeForm.fields.map((field) => (
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

              {field.type === 'number' && field.id === 'amount' && (
                <AmountInput
                  value={values[field.id] ?? ''}
                  onChange={(val) => handleChange(field.id, val)}
                />
              )}

              {field.type === 'number' && field.id !== 'amount' && (
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
                <JalaliDatePicker
                  value={String(values[field.id] ?? '')}
                  onChange={(iso) => handleChange(field.id, iso)}
                />
              )}

              {field.type === 'select' && (
                <Select
                  value={String(values[field.id] ?? '')}
                  onChange={(next) => handleChange(field.id, next)}
                  options={(field.options ?? []).map((opt) => ({
                    value: opt,
                    label: opt,
                  }))}
                />
              )}
            </div>
          ))}

          <button
            type="submit"
            className={`btn ${
              activeForm.type === 'expense'
                ? 'btn-outflow'
                : activeForm.type === 'income'
                  ? 'btn-inflow'
                  : 'btn-primary'
            }`}
            disabled={loading}
          >
            {loading && <span className="spinner" />}
            ذخیره در گوگل شیت
          </button>
        </form>
      )}
    </div>
  );
}
