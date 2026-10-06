import { useOpenSheetWithGoogle } from '../hooks/useOpenSheetWithGoogle'
import { isNativePlatform } from '../services/googleAuthNative'
import { getSpreadsheetLabel } from '../services/spreadsheetCatalog'
import type { SpreadsheetEntry } from '../types'
import Alert from './ui/Alert'
import Button from './ui/Button'

interface SheetAccessNoticeProps {
  /** The active sheet the app could not open. */
  sheet: SpreadsheetEntry
  disabled?: boolean
  onOpened: () => void | Promise<void>
  /** Shown when the create form is not already on screen. */
  onCreateNew?: () => void
}

const noteStyle = { fontSize: '0.75rem', marginTop: '0.5rem' } as const

/**
 * Under drive.file the app cannot open a sheet it did not create (e.g. a copy
 * made by hand in Drive). Explains that and offers Google Picker or a new sheet.
 */
export default function SheetAccessNotice({
  sheet,
  disabled = false,
  onOpened,
  onCreateNew
}: SheetAccessNoticeProps) {
  const { available, opening, openWithGoogle } = useOpenSheetWithGoogle(onOpened)

  const label = sheet.name === sheet.id ? 'فعلی' : `«${getSpreadsheetLabel(sheet.name)}»`

  return (
    <Alert variant="warning">
      <strong>اپ به شیت {label} دسترسی ندارد</strong>
      <p style={noteStyle}>
        برای امنیت بیشتر، اپ فقط فایل‌هایی از Google Drive را می‌بیند که خودش ساخته یا شما با خود اپ
        باز کرده‌اید. اگر این شیت را دستی کپی کرده یا بیرون از اپ ساخته‌اید، یا پاکش کرده‌اید، اپ
        نمی‌تواند آن را باز کند.
      </p>

      {available ? (
        <Button
          variant="primary"
          size="sm"
          onClick={() => void openWithGoogle()}
          disabled={disabled || opening}
          loading={opening}
          style={{ width: '100%', marginTop: '0.75rem' }}
        >
          باز کردن شیت با گوگل
        </Button>
      ) : (
        <p style={noteStyle}>
          {isNativePlatform()
            ? 'در اپ اندروید انتخاب فایل از Drive ممکن نیست. یک بار نسخهٔ وب را باز کنید و با «باز کردن شیت با گوگل» همین شیت را انتخاب کنید، یا اینجا شیت جدید بسازید.'
            : 'گزینهٔ «باز کردن شیت با گوگل» هنوز توسط مدیر اپ فعال نشده (کلید Google Picker تنظیم نشده است). فعلاً می‌توانید شیت جدید بسازید.'}
        </p>
      )}

      {onCreateNew && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onCreateNew}
          disabled={disabled || opening}
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          ساخت شیت جدید
        </Button>
      )}
    </Alert>
  )
}
