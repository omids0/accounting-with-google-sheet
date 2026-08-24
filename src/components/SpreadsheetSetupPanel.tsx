import { useState } from 'react';
import type { SpreadsheetEntry } from '../types';
import {
  activateSpreadsheet,
  createNamedSpreadsheet,
  getDefaultFirstSheetLabel,
} from '../services/spreadsheetSetup';
import {
  SPREADSHEET_TITLE_PREFIX,
  formatSpreadsheetTitle,
  getSpreadsheetLabel,
} from '../services/spreadsheetCatalog';
import { FormSelect } from './form';
import { showError } from '../utils/toast';
import AppIcon from './AppIcon';

interface SpreadsheetSetupPanelProps {
  mode: 'pick' | 'create';
  options?: SpreadsheetEntry[];
  defaultLabel?: string;
  onComplete: () => void;
}

export default function SpreadsheetSetupPanel({
  mode: initialMode,
  options = [],
  defaultLabel = 'اصلی',
  onComplete,
}: SpreadsheetSetupPanelProps) {
  const [mode, setMode] = useState<'pick' | 'create'>(initialMode);
  const [selectedId, setSelectedId] = useState(options[0]?.id ?? '');
  const [newLabel, setNewLabel] = useState(defaultLabel);
  const [loading, setLoading] = useState(false);


  const handleActivate = async () => {
    if (!selectedId) {
      showError('یک شیت انتخاب کنید');
      return;
    }

    setLoading(true);
    try {
      await activateSpreadsheet(selectedId);
      onComplete();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در اتصال به شیت');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newLabel.trim()) {
      showError('نام شیت را وارد کنید');
      return;
    }

    setLoading(true);
    try {
      await createNamedSpreadsheet(newLabel.trim());
      onComplete();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در ساخت شیت');
    } finally {
      setLoading(false);
    }
  };

  const previewTitle = newLabel.trim()
    ? formatSpreadsheetTitle(newLabel.trim())
    : `${SPREADSHEET_TITLE_PREFIX}…`;

  return (
    <div className="login-page">
      <div className="login-card animate-in">
        <div className="login-logo">
          <span className="icon">
            <AppIcon name="folder" />
          </span>
          <h1>{mode === 'pick' ? 'انتخاب شیت' : 'ساخت اولین شیت'}</h1>
          <p>
            {mode === 'pick'
              ? 'شیت‌های حسابداری روی Google Drive پیدا شد. یکی را انتخاب کنید — شیت جدید خودکار ساخته نمی‌شود.'
              : 'اولین شیت با فرمت استاندارد ساخته می‌شود و روی همه دستگاه‌ها قابل پیدا کردن است.'}
          </p>
        </div>

        {mode === 'pick' ? (
          <>
            <FormSelect
              label="شیت‌های موجود در Drive"
              value={selectedId}
              onChange={setSelectedId}
              disabled={loading}
              options={options.map((sheet) => ({
                value: sheet.id,
                label: getSpreadsheetLabel(sheet.name),
              }))}
              hint={
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '0.5rem',
                  }}
                >
                  فقط فایل‌های با فرمت «{SPREADSHEET_TITLE_PREFIX}…» یا «حسابداری …»
                  نمایش داده می‌شوند.
                </p>
              }
            />

            <button
              className="btn btn-primary"
              onClick={handleActivate}
              disabled={loading || !selectedId}
              style={{ width: '100%' }}
            >
              {loading && <span className="spinner" />}
              ادامه با این شیت
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setMode('create')}
              disabled={loading}
              style={{ width: '100%', marginTop: '0.75rem' }}
            >
              + ساخت شیت جدید
            </button>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>نام شیت</label>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="مثلاً: 1406"
                disabled={loading}
              />
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  marginTop: '0.5rem',
                }}
                dir="ltr"
              >
                {previewTitle}
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading && <span className="spinner" />}
              ساخت و ادامه
            </button>

            {options.length > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setMode('pick')}
                disabled={loading}
                style={{ width: '100%', marginTop: '0.75rem' }}
              >
                بازگشت به لیست شیت‌ها
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export { getDefaultFirstSheetLabel };
