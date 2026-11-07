import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Every tab a writer touched, in call order: `fn:tab`. */
const io = vi.hoisted(() => ({
  writes: [] as string[],
  native: false,
  /** Data rows of «تنظیمات دوره» (the sheet itself says personal: no marker row). */
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
import { CHILD_READ_ONLY_MESSAGE } from './childReadOnly'
import { runEngagementStartup } from './engagementStartup'
import { saveReminderRules, upsertPushSubscription, DEFAULT_RULES } from './reminders'
import {
  ACTIVITY_LOG_SHEET,
  ACTIVITY_SHEET,
  APP_LOCK_SHEET,
  CHILD_VIEW_SHEETS,
  PERSONAL_REMINDERS_SHEET,
  PUSH_SUBS_SHEET,
  REMINDER_LOG_SHEET,
  REMINDERS_SHEET,
  SMS_TEMPLATES_SHEET
} from './sheetNames'
import { apiRequest } from './sheetsApi'
import { getKnownSheetNames } from './sheetSyncSheetNames'
import { moveSyncToSpreadsheet } from './spreadsheetSwitch'
import { setItem, STORAGE_KEYS } from './storage'
import { isChildWorkspace, isPersonalWorkspace, setWorkspaceType } from './workspace'
import type { AppSettings } from '../types'

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

const push = {
  endpoint: 'https://push.example/device-1',
  p256dh: 'P256DH-KEY',
  auth: 'AUTH-KEY',
  deviceLabel: 'Chrome',
  updatedAt: '2026-11-03T00:00:00.000Z'
}

beforeEach(() => {
  localStorage.clear()
  io.writes = []
  io.native = false
  io.marker = []
  vi.clearAllMocks()
})

describe("a parent's read-only view of a child's account is never written to", () => {
  it.each([false, true])('startup (native: %s) writes nothing', async native => {
    io.native = native
    setWorkspaceType('CH', 'child')

    await runEngagementStartup('CH')

    expect(io.writes).toEqual([])
    expect(refreshScheduledReminders).not.toHaveBeenCalled()
    expect(syncBudgetDigest).not.toHaveBeenCalled()
  })

  it('the sheet saying «personal» does not turn a registered child into a personal sheet', async () => {
    setItem(STORAGE_KEYS.SETTINGS, {
      spreadsheetId: 'CH',
      spreadsheets: [{ id: 'CH', kind: 'child' }]
    })

    expect(isChildWorkspace('CH')).toBe(true)
    expect(isPersonalWorkspace('CH')).toBe(false)

    await runEngagementStartup('CH')

    expect(io.writes).toEqual([])
    expect(isChildWorkspace('CH')).toBe(true)
  })

  it.each([false, true])('a switch into it (native: %s) registers no push keys', async native => {
    io.native = native
    setWorkspaceType('CH', 'child')

    await moveSyncToSpreadsheet('P1', 'CH')
    await flush()

    expect(io.writes).toEqual([])
    expect(refreshScheduledReminders).not.toHaveBeenCalled()
  })

  it('refuses the reminder and push writers themselves', async () => {
    setWorkspaceType('CH', 'child')

    await saveReminderRules('CH', [DEFAULT_RULES[0]])
    await upsertPushSubscription('CH', push)

    expect(io.writes).toEqual([])
  })

  it('writes no «فعالیت» row for an app open or an operation', async () => {
    setWorkspaceType('CH', 'child')

    await syncAppOpen('CH')
    await syncOperation('CH', '2026-11-03')

    expect(io.writes).toEqual([])
  })

  it('the personal sheet of the parent still gets its setup the same day', async () => {
    setWorkspaceType('CH', 'child')

    await syncAppOpen('CH')
    await syncAppOpen('P1')

    expect(io.writes).toContain(`ensure:${ACTIVITY_SHEET}`)
  })

  it('downloads only record tabs: none of the private ones', () => {
    setWorkspaceType('CH', 'child')

    const settings = { forms: [] } as unknown as AppSettings

    const tabs = getKnownSheetNames(settings, 'CH')

    for (const tab of [
      PUSH_SUBS_SHEET,
      APP_LOCK_SHEET,
      REMINDERS_SHEET,
      REMINDER_LOG_SHEET,
      PERSONAL_REMINDERS_SHEET,
      ACTIVITY_SHEET,
      ACTIVITY_LOG_SHEET,
      SMS_TEMPLATES_SHEET
    ]) {
      expect(tabs).not.toContain(tab)
    }
    expect(tabs).toEqual([...CHILD_VIEW_SHEETS])
  })

  it('stops any Sheets write before it leaves the device', async () => {
    setWorkspaceType('CH', 'child')

    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))

    vi.stubGlobal('fetch', fetchMock)

    const sheetsUrl = 'https://sheets.googleapis.com/v4/spreadsheets/CH'

    await expect(
      apiRequest(`${sheetsUrl}/values/A1:append`, { method: 'POST', body: '{}' })
    ).rejects.toThrow(CHILD_READ_ONLY_MESSAGE)
    await expect(apiRequest(`${sheetsUrl}:batchUpdate`, { method: 'POST' })).rejects.toThrow(
      CHILD_READ_ONLY_MESSAGE
    )
    await expect(apiRequest(`${sheetsUrl}/values/A1`, { method: 'PUT' })).rejects.toThrow(
      CHILD_READ_ONLY_MESSAGE
    )
    expect(fetchMock).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})
