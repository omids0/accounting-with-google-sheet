import { useState } from 'react'

import {
  SPREADSHEET_TITLE_PREFIX,
  formatSpreadsheetTitle,
  getSpreadsheetLabel
} from '../services/spreadsheetCatalog'
import {
  activateSpreadsheet,
  createNamedSpreadsheet,
  getDefaultFirstSheetLabel
} from '../services/spreadsheetSetup'
import type { SpreadsheetEntry } from '../types'
import AppIcon from './AppIcon'
import { FormField, FormSelect } from './form'
import { spinnerClass } from './ui/displayStyles'
import { animateInClass } from './ui/layoutStyles'
import {
  loginCardClass,
  loginLogoClass,
  loginLogoIconClass,
  loginLogoSubtitleClass,
  loginLogoTitleClass,
  loginPageClass
} from './ui/loginStyles'
import { cn } from '../utils/cn'
import Button from './ui/Button'
import { showError } from '../utils/toast'

interface SpreadsheetSetupPanelProps {
  mode: 'pick' | 'create'
  options?: SpreadsheetEntry[]
  defaultLabel?: string
  onComplete: () => void
}

export default function SpreadsheetSetupPanel({
  mode: initialMode,
  options = [],
  defaultLabel = 'اصلی',
  onComplete
}: SpreadsheetSetupPanelProps) {
  const [mode, setMode] = useState<'pick' | 'create'>(initialMode)

  const [selectedId, setSelectedId] = useState(options[0]?.id ?? '')

  const [newLabel, setNewLabel] = useState(defaultLabel)

  const [loading, setLoading] = useState(false)

  const handleActivate = async () => {
    if (!selectedId) {
      showError('یک شیت انتخاب کنید')

      return
    }

    setLoading(true)
    try {
      await activateSpreadsheet(selectedId)
      onComplete()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در اتصال به شیت')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newLabel.trim()) {
      showError('نام شیت را وارد کنید')

      return
    }

    setLoading(true)
    try {
      await createNamedSpreadsheet(newLabel.trim())
      onComplete()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در ساخت شیت')
    } finally {
      setLoading(false)
    }
  }

  const previewTitle = newLabel.trim()
    ? formatSpreadsheetTitle(newLabel.trim())
    : `${SPREADSHEET_TITLE_PREFIX}…`

  return (
    <div className={loginPageClass}>
      <div className={cn(loginCardClass, animateInClass)}>
        <div className={loginLogoClass}>
          <span className={loginLogoIconClass}>
            <AppIcon name="folder" />
          </span>
          <h1 className={loginLogoTitleClass}>
            {mode === 'pick' ? 'انتخاب شیت' : 'ساخت اولین شیت'}
          </h1>
          <p className={loginLogoSubtitleClass}>
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
              options={options.map(sheet => ({
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
                  فقط فایل‌های با فرمت «{SPREADSHEET_TITLE_PREFIX}…» یا «حسابداری …» نمایش داده
                  می‌شوند.
                </p>
              }
            />

            <Button
              variant="primary"
              onClick={handleActivate}
              disabled={loading || !selectedId}
              style={{ width: '100%' }}
            >
              {loading && <span className={spinnerClass} />}
              ادامه با این شیت
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMode('create')}
              disabled={loading}
              style={{ width: '100%', marginTop: '0.75rem' }}
            >
              + ساخت شیت جدید
            </Button>
          </>
        ) : (
          <>
            <FormField
              label="نام شیت"
              hint={
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '0.5rem'
                  }}
                  dir="ltr"
                >
                  {previewTitle}
                </p>
              }
            >
              <input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="مثلاً: 1406"
                disabled={loading}
              />
            </FormField>

            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading && <span className={spinnerClass} />}
              ساخت و ادامه
            </Button>

            {options.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMode('pick')}
                disabled={loading}
                style={{ width: '100%', marginTop: '0.75rem' }}
              >
                بازگشت به لیست شیت‌ها
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export { getDefaultFirstSheetLabel }
