import type { RestorePreview, RestoreReport } from './backupRestore'
import { formatIsoDatePersian, toIsoDate } from '../utils/jalaliDate'
import { toPersianDigits } from '../utils/normalizeDigits'

function faCount(value: number): string {
  return value.toLocaleString('fa-IR')
}

/** «1.22» → «۱٫۲۲» */
export function formatBackupVersion(version: string): string {
  return toPersianDigits(version).replace(/\./g, '٫')
}

/** «۳ مهر ۱۴۰۵» */
export function formatBackupDate(at: number | string): string {
  const date = new Date(at)

  return Number.isNaN(date.getTime()) ? '—' : formatIsoDatePersian(toIsoDate(date))
}

/**
 * «۱۲ تب، ۸۴۰ ردیف؛ نسخه ۱٫۲۲؛ ۳ مهر ۱۴۰۵» — only tabs that hold rows are counted. The spec's «·»
 * reads as a Persian zero next to Persian digits, hence «؛» (as in the round-4 import preview).
 */
export function formatBackupSummary(preview: RestorePreview): string {
  const filled = preview.tabs.filter(tab => tab.rows > 0)

  const rows = filled.reduce((sum, tab) => sum + tab.rows, 0)

  return [
    `${faCount(filled.length)} تب، ${faCount(rows)} ردیف`,
    `نسخه ${formatBackupVersion(preview.manifest.appVersion)}`,
    formatBackupDate(preview.manifest.exportedAt)
  ].join('؛ ')
}

function tabList(names: string[]): string {
  return names.map(name => `«${name}»`).join('، ')
}

/** Tabs this app does not know; `upcoming` words it for the preview, before the restore runs. */
export function formatIgnoredTabs(names: string[], upcoming = false): string {
  if (!names.length) return ''

  const verb = upcoming ? 'نادیده گرفته می‌شود' : 'نادیده گرفته شد'

  return `${faCount(names.length)} تب ناشناخته ${verb}: ${tabList(names)}`
}

/** «۱۲ تب بازیابی شد؛ ۸۴۰ ردیف نوشته شد؛ ۳ ردیف تکراری یا نامعتبر رد شد.» plus ignored tabs. */
export function formatRestoreReport(report: RestoreReport): string {
  const lines = [
    [
      `${faCount(report.tabs)} تب بازیابی شد`,
      `${faCount(report.written)} ردیف نوشته شد`,
      `${faCount(report.skipped)} ردیف تکراری یا نامعتبر رد شد`
    ].join('؛ ')
  ]

  if (report.unknownTabs.length) lines.push(formatIgnoredTabs(report.unknownTabs))
  if (report.incompatibleTabs.length) {
    lines.push(
      `این تب‌ها هم‌نام تبی دیگر بودند و بازیابی نشدند: ${tabList(report.incompatibleTabs)}`
    )
  }

  return lines.join('\n')
}
