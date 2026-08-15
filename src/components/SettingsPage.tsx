import { useState, useEffect } from 'react';
import type { CurrencyUnit, FieldConfig, FieldType } from '../types';
import {
  getSettings,
  saveSettings,
  getDefaultSettings,
  addCustomForm,
  updateFormCategories,
  updateCurrency,
} from '../services/settings';
import { CURRENCY_OPTIONS } from '../utils/formatMoney';
import {
  ensureFormSheet,
  getSpreadsheetUrl,
} from '../services/sheets';
import {
  getUserEmail,
  getUserPicture,
  isTokenValid,
  logout,
} from '../services/auth';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'متن' },
  { value: 'number', label: 'عدد' },
  { value: 'date', label: 'تاریخ' },
  { value: 'select', label: 'انتخابی' },
];

export default function SettingsPage({ onLogout }: { onLogout?: () => void }) {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [forms, setForms] = useState(getDefaultSettings().forms);
  const [currency, setCurrency] = useState<CurrencyUnit>('toman');
  const [newFormName, setNewFormName] = useState('');
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const settings = getSettings() ?? getDefaultSettings();
    setSpreadsheetId(settings.spreadsheetId);
    setForms(settings.forms);
    setCurrency(settings.currency ?? 'toman');
  }, []);

  const handleLogout = () => {
    if (confirm('از حساب خارج می‌شوید؟')) {
      logout();
      onLogout?.();
    }
  };

  const handleAddForm = async () => {
    if (!newFormName.trim()) {
      setMessage({ type: 'error', text: 'نام فرم را وارد کنید' });
      return;
    }
    if (!isTokenValid()) {
      setMessage({ type: 'error', text: 'نشست منقضی شده' });
      return;
    }

    const settings = getSettings() ?? getDefaultSettings();
    if (!settings.spreadsheetId) {
      setMessage({ type: 'error', text: 'ابتدا با گوگل وارد شوید' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const newForm = addCustomForm(newFormName.trim(), [
        { id: 'date', label: 'تاریخ', type: 'date', required: true },
        { id: 'title', label: 'عنوان', type: 'text', required: true },
        { id: 'note', label: 'توضیحات', type: 'text', required: false },
      ]);
      await ensureFormSheet(settings.spreadsheetId, newForm);
      const updated = { ...settings, forms: [...settings.forms, newForm] };
      saveSettings(updated);
      setForms(updated.forms);
      setNewFormName('');
      setMessage({ type: 'success', text: `فرم «${newForm.name}» و شیت آن ساخته شد` });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'خطا در ساخت فرم',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategories = (formId: string, categoriesText: string) => {
    const categories = categoriesText
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!categories.length) return;

    updateFormCategories(formId, categories);
    const settings = getSettings() ?? getDefaultSettings();
    const updatedForms = settings.forms.map((f) =>
      f.id === formId
        ? {
            ...f,
            fields: f.fields.map((field) =>
              field.id === 'category' ? { ...field, options: categories } : field
            ),
          }
        : f
    );
    setForms(updatedForms);
    setMessage({ type: 'success', text: 'دسته‌بندی‌ها ذخیره شد' });
  };

  const handleCurrencyChange = (value: CurrencyUnit) => {
    setCurrency(value);
    updateCurrency(value);
    setMessage({ type: 'success', text: 'واحد پول ذخیره شد' });
  };

  const handleSaveFormFields = (formId: string, fields: FieldConfig[]) => {
    const settings = getSettings() ?? getDefaultSettings();
    const updatedForms = settings.forms.map((f) =>
      f.id === formId ? { ...f, fields } : f
    );
    saveSettings({ ...settings, forms: updatedForms });
    setForms(updatedForms);
    setEditingFormId(null);
    setMessage({ type: 'success', text: 'فیلدها ذخیره شد' });
  };

  return (
    <div>
      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="card">
        <h2 className="card-title">حساب گوگل</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {getUserPicture() && (
            <img
              src={getUserPicture()!}
              alt=""
              style={{ width: 36, height: 36, borderRadius: '50%' }}
            />
          )}
          <div>
            <p style={{ fontSize: '0.85rem' }}>{getUserEmail()}</p>
            <span className={`status-badge ${isTokenValid() ? 'status-connected' : 'status-disconnected'}`}>
              {isTokenValid() ? '✓ متصل' : '✗ نیاز به ورود مجدد'}
            </span>
          </div>
        </div>
        <button className="btn btn-danger btn-sm" onClick={handleLogout} style={{ marginTop: '0.75rem' }}>
          خروج
        </button>
      </div>

      {spreadsheetId && (
        <div className="card">
          <h2 className="card-title">گوگل شیت</h2>
          <a
            href={getSpreadsheetUrl(spreadsheetId)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.85rem' }}
          >
            باز کردن شیت در گوگل ↗
          </a>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            هر فرم = یک برگه (Tab) جدا در شیت
          </p>
        </div>
      )}

      <div className="card">
        <h2 className="card-title">تنظیمات عمومی</h2>
        <div className="form-group">
          <label>واحد پول</label>
          <select value={currency} onChange={(e) => handleCurrencyChange(e.target.value as CurrencyUnit)}>
            {CURRENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            واحد پول در تمام نمایش مبالغ (داشبورد، رکوردها و ...) اعمال می‌شود
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">فرم‌های سفارشی</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
          فرم جدید = برگه جدید در گوگل شیت
        </p>

        {forms.map((form) => (
          <div key={form.id} className="form-list-item">
            <div className="form-list-header">
              <strong>{form.name}</strong>
              <span className="form-type-badge">{form.sheetName}</span>
            </div>

            {form.type !== 'custom' && form.fields.find((f) => f.id === 'category') && (
              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label>دسته‌بندی‌های {form.name}</label>
                <input
                  defaultValue={
                    form.fields.find((f) => f.id === 'category')?.options?.join('، ') ?? ''
                  }
                  onBlur={(e) => handleSaveCategories(form.id, e.target.value)}
                  placeholder="دسته۱، دسته۲، ..."
                />
              </div>
            )}

            {form.type === 'custom' && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '0.5rem' }}
                onClick={() =>
                  setEditingFormId(editingFormId === form.id ? null : form.id)
                }
              >
                {editingFormId === form.id ? 'بستن' : 'ویرایش فیلدها'}
              </button>
            )}

            {editingFormId === form.id && (
              <FormFieldEditor
                fields={form.fields}
                onSave={(fields) => handleSaveFormFields(form.id, fields)}
              />
            )}
          </div>
        ))}

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label>افزودن فرم جدید</label>
          <input
            value={newFormName}
            onChange={(e) => setNewFormName(e.target.value)}
            placeholder="مثلاً: دارایی‌ها"
          />
        </div>
        <button className="btn btn-primary" onClick={handleAddForm} disabled={loading}>
          {loading && <span className="spinner" />}
          ساخت فرم و شیت
        </button>
      </div>
    </div>
  );
}

function FormFieldEditor({
  fields: initialFields,
  onSave,
}: {
  fields: FieldConfig[];
  onSave: (fields: FieldConfig[]) => void;
}) {
  const [fields, setFields] = useState(initialFields);

  const updateField = (index: number, updates: Partial<FieldConfig>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
  };

  const addField = () => {
    setFields([
      ...fields,
      { id: `field_${Date.now()}`, label: 'فیلد جدید', type: 'text', required: false },
    ]);
  };

  return (
    <div style={{ marginTop: '0.75rem' }}>
      {fields.map((field, index) => (
        <div key={field.id} className="field-row">
          <div className="form-group">
            <label>برچسب</label>
            <input
              value={field.label}
              onChange={(e) => updateField(index, { label: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>نوع</label>
            <select
              value={field.type}
              onChange={(e) => updateField(index, { type: e.target.value as FieldType })}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" onClick={addField} style={{ marginBottom: '0.5rem' }}>
        + فیلد
      </button>
      <button className="btn btn-primary btn-sm" onClick={() => onSave(fields)}>
        ذخیره فیلدها
      </button>
    </div>
  );
}
