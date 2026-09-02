import type { FieldType, ThemeMode } from '../../types'

export type SettingsPageProps = {
  onLogout?: () => void
  onSpreadsheetChange?: () => void
}

export const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'متن' },
  { value: 'number', label: 'عدد' },
  { value: 'date', label: 'تاریخ' },
  { value: 'select', label: 'انتخابی' }
]

export const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'لایت مود (روشن)' },
  { value: 'dark', label: 'نایت مود (تاریک)' }
]
