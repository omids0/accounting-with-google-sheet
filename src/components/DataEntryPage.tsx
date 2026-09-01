import { useState, useEffect } from 'react';
import type { CustomForm } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { appendRecord } from '../services/sheets';
import { isTokenValid } from '../services/auth';
import { FieldInput, getInitialFieldValue, sortFormFields } from './form';
import TransactionTypeSegment, {
  transactionTypeOptionsFromForms,
} from './TransactionTypeSegment';
import { FormSkeleton } from './skeleton';
import { showError, showSuccess } from '../utils/toast';
import AppIcon from './AppIcon';

export default function DataEntryPage({
  onReauth,
  onCancel,
  initialFormType,
}: {
  onReauth?: () => void;
  onCancel?: () => void;
  initialFormType?: 'income' | 'expense';
}) {
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
    let selectedForm = settings.forms[0];
    if (initialFormType) {
      const matched = settings.forms.find((f) => f.type === initialFormType);
      if (matched) selectedForm = matched;
    }
    if (selectedForm) {
      setActiveFormId(selectedForm.id);
      initValues(selectedForm);
    }
    setReady(true);
  }, [initialFormType]);

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

  const refreshForms = () => {
    const settings = getSettings();
    if (settings) setForms(settings.forms);
  };

  const handleChange = (fieldId: string, value: string | number) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleCategoriesChange = (categories: string[]) => {
    refreshForms();
    if (!categories.includes(String(values.category ?? ''))) {
      setValues((prev) => ({ ...prev, category: categories[0] ?? '' }));
    }
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
      showSuccess(`در شیت «${activeForm.sheetName}» ذخیره شد`);
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
        <div className="icon">
          <AppIcon name="edit" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  if (!ready) {
    return <FormSkeleton />;
  }

  return (
    <div>
      <TransactionTypeSegment
        className="data-entry-type-segment"
        options={transactionTypeOptionsFromForms(forms)}
        value={activeFormId}
        onChange={(formId) => {
          const form = forms.find((f) => f.id === formId);
          if (form) selectForm(form);
        }}
        ariaLabel="نوع ثبت"
      />

      {activeForm && (
        <div className="app-form">
          <form onSubmit={handleSubmit}>
          {sortFormFields(activeForm.fields).map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.id] ?? ''}
              onChange={(next) => handleChange(field.id, next)}
              formId={activeForm.id}
              onCategoriesChange={handleCategoriesChange}
              onReauth={onReauth}
            />
          ))}

          <div className="form-actions">
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
              ذخیره
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={loading}
              onClick={() => onCancel?.()}
            >
              انصراف
            </button>
          </div>
          </form>
        </div>
      )}
    </div>
  );
}
