import { wasNudgeShownToday } from './nudges'
import {
  countRecordRows,
  getOnboardingState,
  isOnboardingClosed,
  type OnboardingStepId
} from './onboarding'
import {
  CHECKS_SHEET,
  DANG_SPLIT_GROUPS_SHEET,
  PERSONAL_REMINDERS_SHEET,
  TIMESHEETS_SHEET
} from './sheetNames'
import { getSheetDataRows } from './spreadsheetStore'
import { getItem, setItem } from './storage'
import type { Tab } from '../components/layout/types'

export const DISCOVERY_STORAGE_KEY = 'accounting_discovery_v1'

export const DISCOVERY_MIN_RECORDS = 5

export const DISCOVERY_GRACE_MS = 3 * 24 * 60 * 60 * 1000

export interface DiscoveryFeature {
  id: string
  tab: Tab
  title: string
  pitch: string
  sheets: string[]
}

/** Features without a data signal; vehicles are suggested after a «خودرو» expense instead. */
export const DISCOVERY_FEATURES: DiscoveryFeature[] = [
  {
    id: 'reminders',
    tab: 'personal-reminders',
    title: 'یادآوری شخصی',
    pitch: 'قبض، بیمه و موعدهای شخصی را ثبت کن و سر وقت اعلان بگیر.',
    sheets: [PERSONAL_REMINDERS_SHEET]
  },
  {
    id: 'checks',
    tab: 'checks',
    title: 'چک‌ها',
    pitch: 'چک‌های پرداختی و دریافتی را با تاریخ سررسید یک‌جا مدیریت کن.',
    sheets: [CHECKS_SHEET]
  },
  {
    id: 'dang-split',
    tab: 'dang-split',
    title: 'محاسبه دنگ',
    pitch: 'هزینه مشترک سفر و مهمانی را بین افراد تقسیم کن.',
    sheets: [DANG_SPLIT_GROUPS_SHEET]
  },
  {
    id: 'timesheets',
    tab: 'timesheets',
    title: 'تایم‌شیت',
    pitch: 'ساعت کاری پروژه‌هایت را ثبت کن و گزارش بگیر.',
    sheets: [TIMESHEETS_SHEET]
  }
]

interface DiscoveryState {
  dismissed?: boolean
  index?: number
}

type DiscoveryStore = Record<string, DiscoveryState>

function readState(spreadsheetId: string): DiscoveryState {
  return (getItem<DiscoveryStore>(DISCOVERY_STORAGE_KEY) ?? {})[spreadsheetId] ?? {}
}

function writeState(spreadsheetId: string, patch: DiscoveryState): void {
  const store = getItem<DiscoveryStore>(DISCOVERY_STORAGE_KEY) ?? {}

  setItem(DISCOVERY_STORAGE_KEY, {
    ...store,
    [spreadsheetId]: { ...store[spreadsheetId], ...patch }
  })
}

function featureHasData(spreadsheetId: string, feature: DiscoveryFeature): boolean {
  return feature.sheets.some(sheet =>
    (getSheetDataRows(spreadsheetId, sheet) ?? []).some(row =>
      row.some(cell => String(cell ?? '').trim())
    )
  )
}

/** Features the user has not tried yet; one that gets data leaves the queue for good. */
export function getDiscoveryQueue(spreadsheetId: string): DiscoveryFeature[] {
  return DISCOVERY_FEATURES.filter(feature => !featureHasData(spreadsheetId, feature))
}

export function isDiscoveryEligible(
  spreadsheetId: string,
  steps: OnboardingStepId[],
  now = Date.now()
): boolean {
  if (readState(spreadsheetId).dismissed) return false
  // A contextual suggestion already spoke today.
  if (wasNudgeShownToday(spreadsheetId, new Date(now))) return false

  const onboarding = getOnboardingState(spreadsheetId)

  if (!isOnboardingClosed(onboarding, steps)) return false
  if (!getDiscoveryQueue(spreadsheetId).length) return false

  const records = countRecordRows(spreadsheetId) ?? 0

  if (records >= DISCOVERY_MIN_RECORDS) return true

  const closedAt = onboarding?.closedAt

  return closedAt !== undefined && now - closedAt >= DISCOVERY_GRACE_MS
}

export function getDiscoveryIndex(spreadsheetId: string): number {
  return readState(spreadsheetId).index ?? 0
}

export function setDiscoveryIndex(spreadsheetId: string, index: number): void {
  writeState(spreadsheetId, { index })
}

export function dismissDiscovery(spreadsheetId: string): void {
  writeState(spreadsheetId, { dismissed: true })
}
