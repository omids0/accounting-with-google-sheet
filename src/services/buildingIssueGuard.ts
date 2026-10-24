import { getItem, setItem } from './storage'

/** «تنظیمات دوره» row: `<YYYY-MM>@<deviceId>@<ISO time>` of the newest automatic issue. */
export const ISSUE_MARKER_ROW = 'آخرین صدور'

/** Another device's marker for the same month blocks the automatic issue for this long. */
export const ISSUE_MARKER_WINDOW_MS = 2 * 60_000

/** This device's random id (per device, never wiped with the account). */
export const DEVICE_ID_KEY = 'accounting_device_id_v1'

/** `{ [spreadsheetId]: 'YYYY-MM-DD' }`: the day the automatic issue last ran; in `ACCOUNT_KEYS`. */
export const AUTO_ISSUE_DAY_KEY = 'accounting_building_auto_issue_v1'

export interface IssueMarker {
  monthKey: string
  deviceId: string
  at: string
}

export function formatIssueMarker(marker: IssueMarker): string {
  return `${marker.monthKey}@${marker.deviceId}@${marker.at}`
}

export function parseIssueMarker(raw: string | undefined): IssueMarker | null {
  const [monthKey, deviceId, at] = (raw ?? '').split('@')

  return monthKey && deviceId && at && !Number.isNaN(Date.parse(at))
    ? { monthKey, deviceId, at }
    : null
}

/**
 * Another device started issuing `monthKey` less than two minutes ago: this device must back off
 * (it will see the finished receivables after the next sync). A marker of this device, of another
 * month or an old one never blocks.
 */
export function isIssueBlocked(
  marker: IssueMarker | null,
  monthKey: string,
  deviceId: string,
  nowMs: number
): boolean {
  if (!marker || marker.monthKey !== monthKey || marker.deviceId === deviceId) return false

  return nowMs - Date.parse(marker.at) < ISSUE_MARKER_WINDOW_MS
}

export function getDeviceId(): string {
  const saved = getItem<string>(DEVICE_ID_KEY)

  if (saved) return saved

  const created = crypto.randomUUID()

  try {
    setItem(DEVICE_ID_KEY, created)
  } catch {
    // Private mode: a new id per page load only makes the guard stricter, never looser.
  }

  return created
}

type DayStore = Record<string, string>

/** The automatic issue runs once per building per day. */
export function hasAutoIssuedToday(spreadsheetId: string, todayIso: string): boolean {
  return getItem<DayStore>(AUTO_ISSUE_DAY_KEY)?.[spreadsheetId] === todayIso.slice(0, 10)
}

export function markAutoIssuedToday(spreadsheetId: string, todayIso: string): void {
  try {
    setItem(AUTO_ISSUE_DAY_KEY, {
      ...getItem<DayStore>(AUTO_ISSUE_DAY_KEY),
      [spreadsheetId]: todayIso.slice(0, 10)
    })
  } catch {
    // Private mode: the day gate resets with the page; the marker still guards the sheet.
  }
}
