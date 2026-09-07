import { appendSheetRow, ensureSheetWithHeaders, fetchSheetRows, updateSheetRow } from './sheets'
import { getTodayIso } from '../utils/jalaliDate'

export const PERIOD_SETTINGS_SHEET = 'تنظیمات دوره'

export const PERIOD_SETTINGS_HEADERS = ['کلید', 'مقدار', 'زمان ثبت']

export const MEMBERSHIP_DATE_KEY = 'تاریخ عضویت'

export const ANCHOR_MONTH_KEY = 'ماه لنگر'

/**
 * Period settings are infrastructure, not user data: skipping the revision bump
 * keeps a settings write from invalidating caches and re-triggering the very
 * load that wrote it.
 */
const WRITE_OPTIONS = { skipActivity: true, skipRevision: true } as const

export async function ensurePeriodSettingsSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, PERIOD_SETTINGS_SHEET, PERIOD_SETTINGS_HEADERS)
}

interface PeriodSettingRow {
  value: string
  rowNumber: number
}

async function fetchPeriodSettingRows(
  spreadsheetId: string
): Promise<Map<string, PeriodSettingRow>> {
  await ensurePeriodSettingsSheet(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, PERIOD_SETTINGS_SHEET)

  const map = new Map<string, PeriodSettingRow>()

  rows.forEach((row, index) => {
    const key = String(row[0] ?? '').trim()

    if (!key || map.has(key)) return

    map.set(key, { value: String(row[1] ?? '').trim(), rowNumber: index + 2 })
  })

  return map
}

export async function getPeriodSetting(spreadsheetId: string, key: string): Promise<string> {
  const rows = await fetchPeriodSettingRows(spreadsheetId).catch(
    () => new Map<string, PeriodSettingRow>()
  )

  return rows.get(key)?.value ?? ''
}

export async function setPeriodSetting(
  spreadsheetId: string,
  key: string,
  value: string
): Promise<void> {
  const rows = await fetchPeriodSettingRows(spreadsheetId)

  const row = [key, value, new Date().toLocaleString('fa-IR')]

  const existing = rows.get(key)

  if (existing) {
    await updateSheetRow(
      spreadsheetId,
      PERIOD_SETTINGS_SHEET,
      existing.rowNumber,
      row,
      WRITE_OPTIONS
    )

    return
  }

  await appendSheetRow(spreadsheetId, PERIOD_SETTINGS_SHEET, row, WRITE_OPTIONS)
}

/**
 * Records the membership date the first time a spreadsheet is prepared. Existing
 * users predate this column, so callers must fall back to their earliest record.
 */
export async function ensureMembershipDate(spreadsheetId: string): Promise<string> {
  const stored = await getPeriodSetting(spreadsheetId, MEMBERSHIP_DATE_KEY)

  if (stored) return stored

  const today = getTodayIso()

  await setPeriodSetting(spreadsheetId, MEMBERSHIP_DATE_KEY, today)

  return today
}

export async function getMembershipDate(spreadsheetId: string): Promise<string> {
  return getPeriodSetting(spreadsheetId, MEMBERSHIP_DATE_KEY)
}

export async function getAnchorMonthKey(spreadsheetId: string): Promise<string> {
  return getPeriodSetting(spreadsheetId, ANCHOR_MONTH_KEY)
}

export async function setAnchorMonthKey(spreadsheetId: string, monthKey: string): Promise<void> {
  await setPeriodSetting(spreadsheetId, ANCHOR_MONTH_KEY, monthKey)
}
