import { useState, useEffect } from 'react';
import type { CustomForm } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { appendRecord } from '../services/sheets';
import { isTokenValid } from '../services/auth';
import { FieldInput, getInitialFieldValue } from './form';
import { FormSkeleton } from './skeleton';
import { showError, showSuccess } from '../utils/toast';

export default function DataEntryPage({ onReauth }: { onReauth?: () => void }) {
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [activeFormId, setActiveFormId] = useState('');
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const activeForm = forms.find((f) => f.id === activeFormId);

  useEffect(() => {
    const settings = getSettings();
    if (!settings) {
      setReady(true);
      return;
    }
    setForms(settings.forms);
    if (settings.forms.length) {
      setActiveFormId(settings.forms[0].id);
      initValues(settings.forms[0]);
    }
    setReady(true);
  }, []);

  const initValues = (form: CustomForm) => {
    const initial: Record<string, string | number> = {};
    form.fields.forEach((f) => {
      initial[f.id] = getInitialFieldValue(f);
    });
    setValues(initial);
  };

  const selectForm = (form: CustomForm) => {
    setActiveFormId(form.id);
    initValues(form);
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
          showError(`فیلد «${field.label}» الزامی است`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const settings = getSettings()!;
      await appendRecord(
        settings.spreadsheetId,
        activeForm,
        crypto.randomUUID(),
        new Date().toLocaleString('fa-IR'),
        values
      );
      showSuccess(`در شیت «${activeForm.sheetName}» ذخیره شد ✓`);
      initValues(activeForm);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ذخیره';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
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

  if (!ready) {
    return <FormSkeleton />;
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

      {activeForm && (
        <form onSubmit={handleSubmit}>
          {activeForm.fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.id] ?? ''}
              onChange={(next) => handleChange(field.id, next)}
            />
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
