import { getSpreadsheetUrl } from '../../services/sheets'
import {
  SPREADSHEET_TITLE_PREFIX,
  formatSpreadsheetTitle,
  getSpreadsheetLabel
} from '../../services/spreadsheetCatalog'
import type { SpreadsheetEntry } from '../../types'
import { FormField, FormSelect } from '../form'
import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'

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
    <Card>
      <CardTitle>گوگل شیت</CardTitle>

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
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefreshSpreadsheets}
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading && <span className="spinner" />}
            بروزرسانی از Drive
          </Button>
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
        <Button
          variant="secondary"
          size="sm"
          onClick={onShowNewSheetForm}
          disabled={loading}
          style={{ marginTop: '0.75rem' }}
        >
          + ساخت شیت جدید
        </Button>
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
            <Button variant="primary" size="sm" onClick={onCreateSpreadsheet} disabled={loading}>
              {loading && <span className="spinner" />}
              ساخت
            </Button>
            <Button variant="secondary" size="sm" onClick={onCancelNewSheetForm} disabled={loading}>
              انصراف
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
