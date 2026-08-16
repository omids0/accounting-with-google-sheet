import { useState, useEffect } from 'react';
import type { CurrencyUnit, FieldConfig, FieldType, SpreadsheetEntry } from '../types';
import {
  getSettings,
  saveSettings,
  getDefaultSettings,
  getSpreadsheets,
  addCustomForm,
  updateCurrency,
} from '../services/settings';
import { saveFormCategoriesToSheet, syncCategoriesFromSheet } from '../services/categories';
import { CURRENCY_OPTIONS } from '../utils/formatMoney';
import {
  ensureFormSheet,
  getSpreadsheetUrl,
} from '../services/sheets';
import {
  createNamedSpreadsheet,
  switchActiveSpreadsheet,
  syncSpreadsheetsFromDrive,
} from '../services/spreadsheetSetup';
import {
  SPREADSHEET_TITLE_PREFIX,
  formatSpreadsheetTitle,
  getSpreadsheetLabel,
} from '../services/spreadsheetCatalog';
import { FormField, FormSelect } from './form';
import {
  getUserEmail,
  getUserPicture,
  isTokenValid,
  logout,
} from '../services/auth';
import { usePwaInstall } from '../hooks/usePwaInstall';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'متن' },
  { value: 'number', label: 'عدد' },
  { value: 'date', label: 'تاریخ' },
  { value: 'select', label: 'انتخابی' },
];

export default function SettingsPage({
  onLogout,
  onSpreadsheetChange,
}: {
  onLogout?: () => void;
  onSpreadsheetChange?: () => void;
}) {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetEntry[]>([]);
  const [newSheetName, setNewSheetName] = useState('');
  const [showNewSheetForm, setShowNewSheetForm] = useState(false);
  const [forms, setForms] = useState(getDefaultSettings().forms);
  const [currency, setCurrency] = useState<CurrencyUnit>('toman');
  const [newFormName, setNewFormName] = useState('');
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [categoriesKey, setCategoriesKey] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { canInstall, isInstalled, showIosHint, isIos, install, dismissIosHint } = usePwaInstall();

  useEffect(() => {
    const settings = getSettings() ?? getDefaultSettings();
    setSpreadsheetId(settings.spreadsheetId);
    setSpreadsheets(getSpreadsheets());
    setForms(settings.forms);
    setCurrency(settings.currency ?? 'toman');

    if (!isTokenValid()) return;

    const loadSheetData = async () => {
      try {
        if (settings.spreadsheetId) {
          await syncCategoriesFromSheet(settings.spreadsheetId);
          const refreshed = getSettings() ?? getDefaultSettings();
          setForms(refreshed.forms);
          setCategoriesKey((key) => key + 1);
        }

        const merged = await syncSpreadsheetsFromDrive();
        setSpreadsheets(merged);
        setSpreadsheetId(getSettings()?.spreadsheetId ?? settings.spreadsheetId);
      } catch {
        // Keep local list if Drive sync fails (e.g. old token scope).
      }
    };

    loadSheetData();
  }, []);

  const handleLogout = () => {
    if (confirm('از حساب خارج می‌شوید؟')) {
      logout();
      onLogout?.();
    }
  };

  const handleRefreshSpreadsheets = async () => {
    if (!isTokenValid()) {
      setMessage({ type: 'error', text: 'نشست منقضی شده — دوباره وارد شوید' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const merged = await syncSpreadsheetsFromDrive();
      setSpreadsheets(merged);
      setSpreadsheetId(getSettings()?.spreadsheetId ?? '');
      setMessage({ type: 'success', text: 'لیست شیت‌ها از Google Drive بروز شد' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'خطا در دریافت لیست از Drive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpreadsheet = async () => {
    if (!newSheetName.trim()) {
      setMessage({ type: 'error', text: 'نام شیت را وارد کنید' });
      return;
    }
    if (!isTokenValid()) {
      setMessage({ type: 'error', text: 'نشست منقضی شده' });
      return;
    }

    setLoading(true);
    setMessage(null);
    const trimmedName = newSheetName.trim();
    try {
      const newId = await createNamedSpreadsheet(trimmedName);
      setSpreadsheetId(newId);
      setSpreadsheets(getSpreadsheets());
      setNewSheetName('');
      setShowNewSheetForm(false);
      setMessage({
        type: 'success',
        text: `شیت «${formatSpreadsheetTitle(trimmedName)}» ساخته و فعال شد`,
      });
      onSpreadsheetChange?.();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'خطا در ساخت شیت',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchSpreadsheet = async (nextId: string) => {
    if (!nextId || nextId === spreadsheetId) return;
    if (!isTokenValid()) {
      setMessage({ type: 'error', text: 'نشست منقضی شده' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await switchActiveSpreadsheet(nextId);
      setSpreadsheetId(nextId);
      setSpreadsheets(getSpreadsheets());
      await syncCategoriesFromSheet(nextId);
      const refreshed = getSettings() ?? getDefaultSettings();
      setForms(refreshed.forms);
      setCategoriesKey((key) => key + 1);
      const selected = getSpreadsheets().find((sheet) => sheet.id === nextId);
      setMessage({
        type: 'success',
        text: `شیت فعال: ${selected ? getSpreadsheetLabel(selected.name) : 'انتخاب‌شده'}`,
      });
      onSpreadsheetChange?.();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'خطا در تغییر شیت',
      });
    } finally {
      setLoading(false);
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

  const handleSaveCategories = async (formId: string, categoriesText: string) => {
    const categories = categoriesText
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!categories.length) return;

    const settings = getSettings() ?? getDefaultSettings();
    if (!settings.spreadsheetId) {
      setMessage({ type: 'error', text: 'ابتدا شیت فعال را انتخاب کنید' });
      return;
    }
    if (!isTokenValid()) {
      setMessage({ type: 'error', text: 'نشست منقضی شده' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await saveFormCategoriesToSheet(settings.spreadsheetId, formId, categories);
      const refreshed = getSettings() ?? getDefaultSettings();
      setForms(refreshed.forms);
      setCategoriesKey((key) => key + 1);
      setMessage({ type: 'success', text: 'دسته‌بندی‌ها در گوگل شیت ذخیره شد' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'خطا در ذخیره دسته‌بندی‌ها',
      });
    } finally {
      setLoading(false);
    }
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

      {(spreadsheetId || spreadsheets.length > 0) && (
        <div className="card">
          <h2 className="card-title">گوگل شیت</h2>

          {spreadsheets.length > 0 && (
            <>
              <FormSelect
                label="شیت فعال"
                value={spreadsheetId}
                onChange={handleSwitchSpreadsheet}
                disabled={loading || !spreadsheetId}
                options={spreadsheets.map((sheet) => ({
                  value: sheet.id,
                  label: getSpreadsheetLabel(sheet.name),
                }))}
                hint={
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                    لیست از Google Drive همگام می‌شود — روی دستگاه جدید همان شیت‌ها را می‌بینید.
                  </p>
                }
              />
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleRefreshSpreadsheets}
                disabled={loading}
                style={{ marginTop: '0.5rem' }}
              >
                {loading && <span className="spinner" />}
                بروزرسانی از Drive
              </button>
            </>
          )}

          {spreadsheetId && (
            <a
              href={getSpreadsheetUrl(spreadsheetId)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.85rem', display: 'inline-block', marginTop: '0.5rem' }}
            >
              باز کردن شیت فعال در گوگل ↗
            </a>
          )}
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            فرمت استاندارد: {SPREADSHEET_TITLE_PREFIX}نام (مثلاً {SPREADSHEET_TITLE_PREFIX}1406)
          </p>

          {!showNewSheetForm ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowNewSheetForm(true)}
              disabled={loading}
              style={{ marginTop: '0.75rem' }}
            >
              + ساخت شیت جدید
            </button>
          ) : (
            <div style={{ marginTop: '0.75rem' }}>
              <div className="form-group">
                <label>نام شیت جدید</label>
                <input
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  placeholder="مثلاً: 1406"
                  disabled={loading}
                />
                {newSheetName.trim() && (
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      marginTop: '0.5rem',
                    }}
                    dir="ltr"
                  >
                    {formatSpreadsheetTitle(newSheetName.trim())}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleCreateSpreadsheet}
                  disabled={loading}
                >
                  {loading && <span className="spinner" />}
                  ساخت
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowNewSheetForm(false);
                    setNewSheetName('');
                  }}
                  disabled={loading}
                >
                  انصراف
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h2 className="card-title">نصب اپ</h2>
        {isInstalled ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            اپ روی این دستگاه نصب شده است.
          </p>
        ) : (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              با نصب اپ، دسترسی سریع‌تر از صفحهٔ اصلی گوشی یا دسکتاپ دارید.
            </p>
            {(canInstall || isIos) && (
              <button className="btn btn-primary btn-sm" type="button" onClick={install}>
                نصب اپ روی دستگاه
              </button>
            )}
            {!canInstall && !isIos && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                اگر دکمهٔ بالا نیست، از منوی مرورگر (⋮) گزینه «Install app» یا آیکون نصب در نوار
                آدرس را بزنید.
              </p>
            )}
            {showIosHint && (
              <div className="alert alert-info" style={{ marginTop: '0.75rem' }}>
                <p style={{ marginBottom: '0.5rem' }}>
                  در Safari: دکمهٔ Share (□↑) → «Add to Home Screen»
                </p>
                <button className="btn btn-secondary btn-sm" type="button" onClick={dismissIosHint}>
                  متوجه شدم
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">تنظیمات عمومی</h2>
        <FormSelect
          label="واحد پول"
          value={currency}
          onChange={(next) => handleCurrencyChange(next as CurrencyUnit)}
          options={CURRENCY_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          hint={
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              واحد پول در تمام نمایش مبالغ (داشبورد، رکوردها و ...) اعمال می‌شود
            </p>
          }
        />
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
                  key={`${form.id}-${categoriesKey}`}
                  defaultValue={
                    form.fields.find((f) => f.id === 'category')?.options?.join('، ') ?? ''
                  }
                  onBlur={(e) => handleSaveCategories(form.id, e.target.value)}
                  placeholder="دسته۱، دسته۲، ..."
                  disabled={loading}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                  در برگه «دسته‌بندی‌ها» گوگل شیت ذخیره می‌شود و روی همه دستگاه‌ها یکسان است.
                </p>
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
          <FormField label="برچسب">
            <input
              value={field.label}
              onChange={(e) => updateField(index, { label: e.target.value })}
            />
          </FormField>
          <FormSelect
            label="نوع"
            value={field.type}
            onChange={(next) => updateField(index, { type: next as FieldType })}
            options={FIELD_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
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
