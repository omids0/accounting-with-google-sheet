import { useState, useEffect } from 'react';
import type { FieldConfig, FieldType } from '../types';
import {
  getSettings,
  saveSettings,
  getDefaultSettings,
} from '../services/settings';
import {
  createSpreadsheet,
  validateSpreadsheet,
  ensureHeaders,
  getSpreadsheetUrl,
} from '../services/sheets';
import { getUserEmail, isTokenValid } from '../services/auth';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'متن' },
  { value: 'number', label: 'عدد' },
  { value: 'date', label: 'تاریخ' },
  { value: 'select', label: 'انتخابی' },
];

export default function SettingsPage() {
  const [sheetId, setSheetId] = useState('');
  const [sheetName, setSheetName] = useState('حسابداری');
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState('حسابداری شخصی');
  const [sheetTab, setSheetTab] = useState<'create' | 'link'>('create');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const settings = getSettings() ?? getDefaultSettings();
    setSheetId(settings.sheetId);
    setSheetName(settings.sheetName);
    setFields(settings.fields);
  }, []);

  const addField = () => {
    const id = `field_${Date.now()}`;
    setFields([
      ...fields,
      { id, label: 'فیلد جدید', type: 'text', required: false },
    ]);
  };

  const updateField = (index: number, updates: Partial<FieldConfig>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
  };

  const removeField = (index: number) => {
    if (fields.length <= 1) {
      setMessage({ type: 'error', text: 'حداقل یک فیلد لازم است' });
      return;
    }
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSaveFields = () => {
    const settings = getSettings() ?? getDefaultSettings();
    saveSettings({ ...settings, sheetId, sheetName, fields });
    setMessage({ type: 'success', text: 'تنظیمات فیلدها ذخیره شد' });
  };

  const handleCreateSheet = async () => {
    if (!isTokenValid()) {
      setMessage({ type: 'error', text: 'نشست گوگل منقضی شده. از منوی اصلی دوباره وارد شوید' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const newSheetId = await createSpreadsheet(spreadsheetTitle, fields);
      const settings = {
        ...(getSettings() ?? getDefaultSettings()),
        sheetId: newSheetId,
        sheetName: 'حسابداری',
        fields,
      };
      saveSettings(settings);
      setSheetId(newSheetId);
      setSheetName('حسابداری');
      setMessage({
        type: 'success',
        text: 'شیت جدید ساخته شد! می‌توانید آن را در گوگل شیت ببینید',
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'خطا در ساخت شیت',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkSheet = async () => {
    if (!isTokenValid()) {
      setMessage({ type: 'error', text: 'نشست گوگل منقضی شده. از منوی اصلی دوباره وارد شوید' });
      return;
    }
    if (!sheetId.trim()) {
      setMessage({ type: 'error', text: 'شناسه شیت را وارد کنید' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await validateSpreadsheet(sheetId.trim(), sheetName);
      const settings = {
        ...(getSettings() ?? getDefaultSettings()),
        sheetId: sheetId.trim(),
        sheetName,
        fields,
      };
      await ensureHeaders(settings);
      saveSettings(settings);
      setMessage({ type: 'success', text: 'شیت با موفقیت متصل شد' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'خطا در اتصال شیت',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {message && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      <div className="card">
        <h2 className="card-title">حساب گوگل</h2>
        <p style={{ fontSize: '0.85rem' }}>
          {getUserEmail()}
        </p>
        <span className={`status-badge ${isTokenValid() ? 'status-connected' : 'status-disconnected'}`}>
          {isTokenValid() ? '✓ متصل' : '✗ نیاز به ورود مجدد'}
        </span>
      </div>

      <div className="card">
        <h2 className="card-title">شیت گوگل</h2>
        <div className="tabs">
          <button
            className={sheetTab === 'create' ? 'active' : ''}
            onClick={() => setSheetTab('create')}
          >
            ساخت شیت جدید
          </button>
          <button
            className={sheetTab === 'link' ? 'active' : ''}
            onClick={() => setSheetTab('link')}
          >
            اتصال شیت موجود
          </button>
        </div>

        {sheetTab === 'create' ? (
          <>
            <div className="form-group">
              <label>عنوان شیت</label>
              <input
                value={spreadsheetTitle}
                onChange={(e) => setSpreadsheetTitle(e.target.value)}
                placeholder="حسابداری شخصی"
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleCreateSheet}
              disabled={loading}
            >
              {loading && <span className="spinner" />}
              ساخت و اتصال شیت
            </button>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>شناسه شیت (Sheet ID)</label>
              <input
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                placeholder="از URL گوگل شیت کپی کنید"
                dir="ltr"
              />
            </div>
            <div className="form-group">
              <label>نام برگه (Tab)</label>
              <input
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="حسابداری"
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleLinkSheet}
              disabled={loading}
            >
              {loading && <span className="spinner" />}
              اتصال شیت
            </button>
          </>
        )}

        {sheetId && (
          <a
            href={getSpreadsheetUrl(sheetId)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', marginTop: '0.75rem', fontSize: '0.85rem' }}
          >
            باز کردن شیت در گوگل ↗
          </a>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">فیلدهای ورودی</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          فیلدهایی که هنگام ثبت هر رکورد نمایش داده می‌شوند را تعریف کنید.
        </p>

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
                onChange={(e) =>
                  updateField(index, { type: e.target.value as FieldType })
                }
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: '0 0 auto' }}>
              <label>الزامی</label>
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(index, { required: e.target.checked })}
                style={{ width: 'auto', marginTop: '0.5rem' }}
              />
            </div>
            <button
              className="remove-btn"
              onClick={() => removeField(index)}
              title="حذف"
            >
              ✕
            </button>
          </div>
        ))}

        {fields.some((f) => f.type === 'select') && (
          <div style={{ marginBottom: '1rem' }}>
            {fields
              .filter((f) => f.type === 'select')
              .map((field) => {
                const idx = fields.indexOf(field);
                return (
                  <div key={field.id} className="form-group">
                    <label>گزینه‌های «{field.label}» (با کاما جدا کنید)</label>
                    <input
                      value={(field.options ?? []).join('، ')}
                      onChange={(e) =>
                        updateField(idx, {
                          options: e.target.value
                            .split(/[,،]/)
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="گزینه۱، گزینه۲، ..."
                    />
                  </div>
                );
              })}
          </div>
        )}

        <button className="btn btn-secondary" onClick={addField} style={{ marginBottom: '0.75rem' }}>
          + افزودن فیلد
        </button>
        <button className="btn btn-primary" onClick={handleSaveFields}>
          ذخیره فیلدها
        </button>
      </div>
    </div>
  );
}
