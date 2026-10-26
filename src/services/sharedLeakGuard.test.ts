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
import { saveReminderRules, upsertPushSubscription, DEFAULT_RULES } from './reminders'
import {
  ACTIVITY_SHEET,
  PUSH_SUBS_SHEET,
  REMINDER_LOG_SHEET,
  REMINDERS_SHEET,
  SHARED_ACCOUNT_SHEETS
} from './sheetNames'
import { moveSyncToSpreadsheet } from './spreadsheetSwitch'
import { setItem, STORAGE_KEYS } from './storage'
import { isSharedWorkspace, setWorkspaceType } from './workspace'

const tabsWritten = () => io.writes.map(entry => entry.slice(entry.indexOf(':') + 1))

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

beforeEach(() => {
  localStorage.clear()
  io.writes = []
  io.native = false
  io.marker = []
  vi.clearAllMocks()
})

describe('a shared account never receives personal-only tabs', () => {
  it.each([false, true])(
    'startup (native: %s) writes nothing outside the shared set',
    async native => {
      io.native = native
      setWorkspaceType('SH', 'shared')

      await runEngagementStartup('SH')

      expect(tabsWritten().every(tab => SHARED_ACCOUNT_SHEETS.includes(tab))).toBe(true)
      expect(tabsWritten()).not.toContain(PUSH_SUBS_SHEET)
      expect(refreshScheduledReminders).not.toHaveBeenCalled()
      expect(syncBudgetDigest).not.toHaveBeenCalled()
    }
  )

  it.each([false, true])(
    'reads the marker of a sheet this device knows nothing about first (native: %s)',
    async native => {
      io.native = native
      io.marker = [['نوع فضا', 'حساب مشترک']]

      await runEngagementStartup('FRESH-' + String(native))

      expect(io.writes).toEqual([])
      expect(refreshScheduledReminders).not.toHaveBeenCalled()
    }
  )

  it('treats a sheet registered as shared as shared before its marker row is read', async () => {
    setItem(STORAGE_KEYS.SETTINGS, {
      spreadsheetId: 'SH',
      spreadsheets: [{ id: 'SH', kind: 'shared' }]
    })

    expect(isSharedWorkspace('SH')).toBe(true)

    await runEngagementStartup('SH')

    expect(io.writes).toEqual([])
  })

  it.each([false, true])('a switch into it (native: %s) registers no push keys', async native => {
    io.native = native
    setWorkspaceType('SH', 'shared')

    await moveSyncToSpreadsheet('P1', 'SH')
    await flush()

    expect(io.writes).toEqual([])
    expect(refreshScheduledReminders).not.toHaveBeenCalled()
  })

  it('refuses the reminder and push writers themselves', async () => {
    setWorkspaceType('SH', 'shared')

    await saveReminderRules('SH', [DEFAULT_RULES[0]])
    await upsertPushSubscription('SH', {
      endpoint: 'https://push.example/device-1',
      p256dh: 'P256DH-KEY',
      auth: 'AUTH-KEY',
      deviceLabel: 'Chrome',
      updatedAt: '2026-10-25T00:00:00.000Z'
    })

    expect(io.writes).toEqual([])
  })

  it('writes no «فعالیت» row for an app open or an operation', async () => {
    setWorkspaceType('SH', 'shared')

    await syncAppOpen('SH')
    await syncOperation('SH', '2026-10-25')

    expect(tabsWritten()).not.toContain(ACTIVITY_SHEET)
  })

  it('still writes the personal sheet the same day after a shared open', async () => {
    setWorkspaceType('SH', 'shared')

    await syncAppOpen('SH')
    await syncAppOpen('P1')

    expect(io.writes).toContain(`ensure:${ACTIVITY_SHEET}`)
  })
})

// Task 15: a building no longer gets the reminder setup (buildingLeakGuard.test.ts).
describe('a personal sheet keeps its reminder setup', () => {
  it('startup ensures and writes as before', async () => {
    const id = 'P7'

    await runEngagementStartup(id)

    expect(io.writes).toEqual(
      expect.arrayContaining([
        `ensure:${REMINDERS_SHEET}`,
        `ensure:${PUSH_SUBS_SHEET}`,
        `ensure:${REMINDER_LOG_SHEET}`,
        `append:${REMINDERS_SHEET}`,
        `ensure:${ACTIVITY_SHEET}`,
        `append:${ACTIVITY_SHEET}`,
        `append:${PUSH_SUBS_SHEET}`
      ])
    )
  })

  it('a switch refreshes reminders', async () => {
    const id = 'P8'

    io.native = true

    await moveSyncToSpreadsheet('P0', id)
    await flush()

    expect(refreshScheduledReminders).toHaveBeenCalledWith(id, { force: true })
  })
})
