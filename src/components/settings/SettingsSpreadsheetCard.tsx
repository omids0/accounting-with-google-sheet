import { getSpreadsheetUrl } from '../../services/sheets'
import {
  SPREADSHEET_TITLE_PREFIX,
  formatSpreadsheetTitle,
  getSpreadsheetLabel
} from '../../services/spreadsheetCatalog'
import type { SpreadsheetEntry } from '../../types'
import { FormField, FormSelect } from '../form'

type SettingsSpreadsheetCardProps = {
  spreadsheetId: string
  spreadsheets: SpreadsheetEntry[]
  newSheetName: string
  showNewSheetForm: boolean
  loading: boolean
  onNewSheetNameChange: (value: string) => void
  onShowNewSheetForm: () => void
  onCancelNewSheetForm: () => void
  onRefreshSpreadsheets: () => void
  onCreateSpreadsheet: () => void
  onSwitchSpreadsheet: (nextId: string) => void
}

export default function SettingsSpreadsheetCard({
  spreadsheetId,
  spreadsheets,
  newSheetName,
  showNewSheetForm,
  loading,
  onNewSheetNameChange,
  onShowNewSheetForm,
  onCancelNewSheetForm,
  onRefreshSpreadsheets,
  onCreateSpreadsheet,
  onSwitchSpreadsheet
}: SettingsSpreadsheetCardProps) {
  return (
    <div className="card">
      <h2 className="card-title">گوگل شیت</h2>

      {spreadsheets.length > 0 && (
        <>
          <FormSelect
            label="شیت فعال"
            value={spreadsheetId}
            onChange={onSwitchSpreadsheet}
            disabled={loading || !spreadsheetId}
            options={spreadsheets.map(sheet => ({
              value: sheet.id,
              label: getSpreadsheetLabel(sheet.name)
            }))}
            hint={
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  marginTop: '0.5rem'
                }}
              >
                لیست از Google Drive همگام می‌شود — روی دستگاه جدید همان شیت‌ها را می‌بینید.
              </p>
            }
          />
          <button
            className="btn btn-secondary btn-sm"
            onClick={onRefreshSpreadsheets}
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
      <p
        style={{
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
          marginTop: '0.5rem'
        }}
      >
        فرمت استاندارد: {SPREADSHEET_TITLE_PREFIX}نام (مثلاً {SPREADSHEET_TITLE_PREFIX}1406)
      </p>

      {!showNewSheetForm ? (
        <button
          className="btn btn-secondary btn-sm"
          onClick={onShowNewSheetForm}
          disabled={loading}
          style={{ marginTop: '0.75rem' }}
        >
          + ساخت شیت جدید
        </button>
      ) : (
        <div style={{ marginTop: '0.75rem' }}>
          <FormField label="نام شیت جدید">
            <input
              value={newSheetName}
              onChange={e => onNewSheetNameChange(e.target.value)}
              placeholder="مثلاً: 1406"
              disabled={loading}
            />
            {newSheetName.trim() && (
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  marginTop: '0.5rem'
                }}
                dir="ltr"
              >
                {formatSpreadsheetTitle(newSheetName.trim())}
              </p>
            )}
          </FormField>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={onCreateSpreadsheet}
              disabled={loading}
            >
              {loading && <span className="spinner" />}
              ساخت
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={onCancelNewSheetForm}
              disabled={loading}
            >
              انصراف
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
