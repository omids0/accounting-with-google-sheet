import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAllSheetSpecs } from './allSheetSpecs'
import { ACCOUNTS, fakeFetch, google, PROFILE, summary } from './buildingEntryFake'
import { createBuildingSpreadsheet } from './buildingTemplate'
import { getDefaultSettings, getSettings, saveSettings } from './settings'
import { PERSONAL_ONLY_SHEETS } from './sheetNames'
import { resetSheetSync } from './sheetSync'
import { markFreshlyCreated } from './spreadsheetPreparedSession'
import { switchActiveSpreadsheet } from './spreadsheetSetup'
import { hasStoreData } from './spreadsheetStore'
import { moveSyncToSpreadsheet } from './spreadsheetSwitch'
import { getWorkspaceType } from './workspace'

vi.mock('./auth', () => ({
  getAccessToken: () => 'token',
  isTokenValid: () => true,
  getUserEmail: () => 'manager@example.com'
}))
vi.mock('./localNotifications', () => ({ refreshScheduledReminders: async () => undefined }))
vi.mock('./pushNotifications', () => ({
  getCurrentPushSubscription: async () => null,
  getDeviceLabel: () => 'test'
}))
vi.mock('./sharing', () => ({ refreshSharingInfoIfStale: async () => undefined }))
// The browser's IndexedDB is not in jsdom: a Map stands in for the saved mirrors.
vi.mock('./spreadsheetStoreDb', async importOriginal => {
  const saved = new Map<unknown, unknown>()

  return {
    ...(await importOriginal<Record<string, unknown>>()),
    snapshotDb: {
      get: async (key: unknown) => saved.get(key) ?? null,
      getAll: async () => [...saved.values()],
      put: async (value: { spreadsheetId: string }) => !!saved.set(value.spreadsheetId, value),
      delete: async (key: unknown) => void saved.delete(key),
      deleteDatabase: async () => saved.clear()
    }
  }
})

describe('what creating and entering a building costs (request counts)', () => {
  beforeEach(() => {
    localStorage.clear()
    google.log.length = 0
    google.files.clear()
    google.counter = 0
    vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => fakeFetch(input, init))
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'personal-1',
      spreadsheets: [{ id: 'personal-1', name: 'حسابداری · ۱۴۰۵', createdAt: '' }]
    })
  })

  it('creates a building and enters it', async () => {
    const id = await createBuildingSpreadsheet(PROFILE, ACCOUNTS)
    const creation = summary()

    google.log.length = 0
    await switchActiveSpreadsheet(id)
    const activation = summary()

    google.log.length = 0
    await moveSyncToSpreadsheet('personal-1', id)
    await new Promise(resolve => setTimeout(resolve, 100))
    const pull = summary()

    // Measured before this round's speed-up on the same fake: 16 + 55 + 11 = 82 requests.
    expect(creation.total).toBe(2)
    expect(activation.total).toBeLessThanOrEqual(1)
    expect(pull.total).toBeLessThanOrEqual(3)

    const tabs = [...google.files.get(id)!.keys()]

    for (const personal of PERSONAL_ONLY_SHEETS) expect(tabs).not.toContain(personal)

    expect(getWorkspaceType(id)).toBe('building')
    expect(getSettings()?.spreadsheetId).toBe(id)
    expect(creation.total).toBeGreaterThan(0)
    resetSheetSync(id)
  })

  it('switches from one building to another that was opened before', async () => {
    const first = await createBuildingSpreadsheet(PROFILE, ACCOUNTS)

    await switchActiveSpreadsheet(first)
    await moveSyncToSpreadsheet('personal-1', first)

    const second = await createBuildingSpreadsheet({ ...PROFILE, name: 'گلسار' }, ACCOUNTS)

    await switchActiveSpreadsheet(second)
    await moveSyncToSpreadsheet(first, second)
    await new Promise(resolve => setTimeout(resolve, 100))

    // The user is in the second building and taps the first: the sheet the title cache forgot.
    google.log.length = 0
    await switchActiveSpreadsheet(first)
    const activation = summary()

    google.log.length = 0
    await moveSyncToSpreadsheet(second, first)
    await new Promise(resolve => setTimeout(resolve, 100))
    const pull = summary()

    // Measured before: 9 + 4 = 13 requests for the same switch.
    expect(activation.total).toBeLessThanOrEqual(1)
    // The mirror of the building just left is kept: coming back downloads no tab again.
    expect(pull.total).toBeLessThanOrEqual(2)
    expect(pull.counts['GET batchGet']).toBeUndefined()
    expect(hasStoreData(first)).toBe(true)

    expect(getSettings()?.spreadsheetId).toBe(first)
    expect(getWorkspaceType(first)).toBe('building')
    resetSheetSync(first)
  })
})

describe('what going back to the personal sheet costs (request counts)', () => {
  it('returns from a building to the personal sheet', async () => {
    localStorage.clear()
    google.log.length = 0
    google.files.clear()
    vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => fakeFetch(input, init))
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: '',
      spreadsheets: [{ id: 'personal-1', name: 'حسابداری · ۱۴۰۵', createdAt: '' }]
    })
    google.files.set(
      'personal-1',
      new Map(getAllSheetSpecs('personal-1').map(spec => [spec.sheetName, [spec.headers]]))
    )
    markFreshlyCreated('personal-1')
    await switchActiveSpreadsheet('personal-1')
    await moveSyncToSpreadsheet('', 'personal-1')

    const building = await createBuildingSpreadsheet(PROFILE, ACCOUNTS)

    await switchActiveSpreadsheet(building)
    await moveSyncToSpreadsheet('personal-1', building)
    await new Promise(resolve => setTimeout(resolve, 100))

    google.log.length = 0
    await switchActiveSpreadsheet('personal-1')
    expect(summary().total).toBe(0)

    google.log.length = 0
    await moveSyncToSpreadsheet(building, 'personal-1')
    await new Promise(resolve => setTimeout(resolve, 100))
    const pull = summary()

    // Measured before keeping the mirror: 10 requests, two of them the full batchGet downloads.
    expect(pull.counts['GET batchGet']).toBeUndefined()
    expect(hasStoreData('personal-1')).toBe(true)
    expect(getSettings()?.spreadsheetId).toBe('personal-1')
    resetSheetSync('personal-1')
  })
})
