import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Every tab a writer touched, in call order: `fn:tab`. */
const io = vi.hoisted(() => ({
  writes: [] as string[],
  native: false,
  /** Data rows of «تنظیمات دوره» (the workspace marker). */
  marker: [] as string[][]
}))

const track = vi.hoisted(
  () => (fn: string) =>
    vi.fn(async (_id: string, sheet: string) => {
      io.writes.push(`${fn}:${sheet}`)
    })
)

vi.mock('./sheets', () => ({
  ensureSheetWithHeaders: track('ensure'),
  appendSheetRow: track('append'),
  updateSheetRow: track('update'),
  deleteSheetRow: track('delete'),
  fetchSheetRows: vi.fn(async (_id: string, sheet: string) =>
    sheet === 'تنظیمات دوره' ? io.marker : []
  )
}))

vi.mock('./googleAuthNative', () => ({ isNativePlatform: () => io.native }))

vi.mock('./pushNotifications', () => ({
  getCurrentPushSubscription: vi.fn(async () => ({
    endpoint: 'https://push.example/device-1',
    keys: { p256dh: 'P256DH-KEY', auth: 'AUTH-KEY' }
  })),
  getDeviceLabel: () => 'Chrome'
}))

const refreshScheduledReminders = vi.hoisted(() => vi.fn(async () => 0))
const syncBudgetDigest = vi.hoisted(() => vi.fn(async () => undefined))
const setLastOperationDateNative = vi.hoisted(() => vi.fn(async () => undefined))

vi.mock('./localNotifications', () => ({ refreshScheduledReminders }))
vi.mock('./budgetDigest', () => ({ syncBudgetDigest }))
vi.mock('./bankSmsNative', () => ({ setLastOperationDateNative }))
vi.mock('./sheetSync', () => ({
  initializeSheetSync: vi.fn(async () => undefined),
  resetSheetSync: vi.fn()
}))

import { syncAppOpen, syncOperation } from './activityTracking'
import { runEngagementStartup } from './engagementStartup'
import { BUILDING_MODULE_SHEET_SPECS, BUILDING_SHEET_SPECS } from './moduleSheetSpecs'
import {
  ensureReminderSheets,
  saveReminderRules,
  upsertPushSubscription,
  DEFAULT_RULES
} from './reminders'
import {
  ACTIVITY_SHEET,
  APP_LOCK_SHEET,
  PUSH_SUBS_SHEET,
  REMINDER_LOG_SHEET,
  REMINDERS_SHEET
} from './sheetNames'
import { moveSyncToSpreadsheet } from './spreadsheetSwitch'
import { setItem, STORAGE_KEYS } from './storage'
import { getWorkspaceType, setWorkspaceType } from './workspace'

/** The personal-only tabs a building file must never receive from this device. */
const PERSONAL_ENGAGEMENT_TABS = [
  REMINDERS_SHEET,
  PUSH_SUBS_SHEET,
  REMINDER_LOG_SHEET,
  ACTIVITY_SHEET,
  APP_LOCK_SHEET
]

/** The building's own tabs, without the personal engagement ones. */
const BUILDING_TABS = [...BUILDING_MODULE_SHEET_SPECS, ...BUILDING_SHEET_SPECS]
  .map(spec => spec.sheetName)
  .filter(tab => !PERSONAL_ENGAGEMENT_TABS.includes(tab))

const tabsWritten = () => io.writes.map(entry => entry.slice(entry.indexOf(':') + 1))

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

const PUSH_ROW = {
  endpoint: 'https://push.example/device-1',
  p256dh: 'P256DH-KEY',
  auth: 'AUTH-KEY',
  deviceLabel: 'Chrome',
  updatedAt: '2026-10-26T00:00:00.000Z'
}

beforeEach(() => {
  localStorage.clear()
  io.writes = []
  io.native = false
  io.marker = []
  vi.clearAllMocks()
})

describe('a building sheet never receives personal-only tabs', () => {
  it.each([false, true])(
    'startup (native: %s) writes no tab outside the building set and nothing to «ناتیف»',
    async native => {
      io.native = native
      setWorkspaceType('B1', 'building')

      await runEngagementStartup('B1')

      expect(tabsWritten().every(tab => BUILDING_TABS.includes(tab))).toBe(true)
      expect(tabsWritten()).not.toContain(PUSH_SUBS_SHEET)
      expect(io.writes).toEqual([])
      expect(refreshScheduledReminders).not.toHaveBeenCalled()
      expect(syncBudgetDigest).not.toHaveBeenCalled()
      expect(setLastOperationDateNative).not.toHaveBeenCalled()
    }
  )

  it.each([false, true])(
    'reads the marker of a sheet this device knows nothing about first (native: %s)',
    async native => {
      io.native = native
      io.marker = [['نوع فضا', 'ساختمان']]

      await runEngagementStartup('FRESH-B-' + String(native))

      expect(getWorkspaceType('FRESH-B-' + String(native))).toBe('building')
      expect(io.writes).toEqual([])
      expect(refreshScheduledReminders).not.toHaveBeenCalled()
    }
  )

  it('treats a sheet registered as a building as one before its marker row is read', async () => {
    setItem(STORAGE_KEYS.SETTINGS, {
      spreadsheetId: 'B9',
      spreadsheets: [{ id: 'B9', kind: 'building' }]
    })

    await runEngagementStartup('B9')

    expect(io.writes).toEqual([])
  })

  it.each([false, true])('a switch into it (native: %s) registers no push keys', async native => {
    io.native = native
    setWorkspaceType('B2', 'building')

    await moveSyncToSpreadsheet('P1', 'B2')
    await flush()

    expect(io.writes).toEqual([])
    expect(refreshScheduledReminders).not.toHaveBeenCalled()
  })

  it('refuses the reminder and push writers themselves', async () => {
    setWorkspaceType('B3', 'building')

    await ensureReminderSheets('B3')
    await saveReminderRules('B3', [DEFAULT_RULES[0]])
    await upsertPushSubscription('B3', PUSH_ROW)

    expect(io.writes).toEqual([])
  })

  it('writes no «فعالیت» row for an app open or an operation', async () => {
    setWorkspaceType('B4', 'building')

    await syncAppOpen('B4')
    await syncOperation('B4', '2026-10-26')

    expect(tabsWritten()).not.toContain(ACTIVITY_SHEET)
  })

  it('still writes the personal sheet the same day after a building open', async () => {
    setWorkspaceType('B5', 'building')

    await syncAppOpen('B5')
    await syncAppOpen('P1')

    expect(io.writes).toContain(`ensure:${ACTIVITY_SHEET}`)
  })
})

describe('the personal sheet performs exactly the same calls as before', () => {
  it('web startup: reminder tabs, default rules, the app open and the push row', async () => {
    await runEngagementStartup('P7')

    expect(io.writes).toEqual(PERSONAL_WEB_STARTUP)
  })

  it('APK startup: the same sheet writes plus the device reminders and digest', async () => {
    io.native = true

    await runEngagementStartup('P8')

    expect(io.writes).toEqual(PERSONAL_APK_STARTUP)
    expect(setLastOperationDateNative).toHaveBeenCalledTimes(1)
    expect(refreshScheduledReminders).toHaveBeenCalledWith('P8')
    expect(syncBudgetDigest).toHaveBeenCalledWith('P8')
  })

  it.each([false, true])('a switch (native: %s) refreshes its reminders', async native => {
    io.native = native

    await moveSyncToSpreadsheet('B1', 'P9')
    await flush()

    if (native) expect(refreshScheduledReminders).toHaveBeenCalledWith('P9', { force: true })
    else expect(io.writes).toContain(`append:${PUSH_SUBS_SHEET}`)
  })
})

const REMINDER_SETUP = [
  `ensure:${REMINDERS_SHEET}`,
  `ensure:${PUSH_SUBS_SHEET}`,
  `ensure:${REMINDER_LOG_SHEET}`
]

/** Recorded at 4c61c53, before this fix: the personal path must not change. */
const PERSONAL_APK_STARTUP = [
  // migrateReminderDefaults: ensure, then saveReminderRules ensures again and appends 5 rules.
  ...REMINDER_SETUP,
  ...REMINDER_SETUP,
  ...Array.from({ length: 5 }, () => `append:${REMINDERS_SHEET}`),
  // syncAppOpen
  `ensure:${ACTIVITY_SHEET}`,
  `append:${ACTIVITY_SHEET}`
]

const PERSONAL_WEB_STARTUP = [
  ...PERSONAL_APK_STARTUP,
  // refreshPushSubscription: upsert ensures, fetchPushSubscriptions ensures, then the row.
  ...REMINDER_SETUP,
  ...REMINDER_SETUP,
  `append:${PUSH_SUBS_SHEET}`
]
