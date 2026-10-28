import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const native = { value: false }

const signOutNative = vi.fn(async () => undefined)

const stopSheetSync = vi.fn()

const clearStore = vi.fn()

const logoutViaWorker = vi.fn(async (_id: string) => undefined)

const forgetWorkerSession = vi.fn(async (_id: string) => undefined)

vi.mock('./authWorker', () => ({
  logoutViaWorker: (id: string) => logoutViaWorker(id),
  forgetWorkerSession: (id: string) => forgetWorkerSession(id)
}))

vi.mock('./googleAuthNative', () => ({
  isNativePlatform: () => native.value,
  signOutNative: () => signOutNative()
}))

vi.mock('./sheetSyncLifecycle', () => ({ stopSheetSync: () => stopSheetSync() }))

vi.mock('./spreadsheetStore', () => ({ clearStore: (id: string) => clearStore(id) }))

vi.mock('./spreadsheetSetup', () => ({ clearSpreadsheetPrepareSession: vi.fn() }))

vi.mock('./dashboardCache', () => ({ invalidateDashboardCache: vi.fn() }))

const deleteDatabase = vi.fn((name: string) => {
  const request: { onsuccess?: () => void; name: string } = { name }

  queueMicrotask(() => request.onsuccess?.())

  return request
})

const revoke = vi.fn((_token: string, done?: () => void) => done?.())

function seed(): void {
  localStorage.setItem(
    'accounting_session',
    JSON.stringify({ email: 'a@example.com', accessToken: 'tok', tokenExpiry: Date.now() + 1e6 })
  )
  localStorage.setItem(
    'accounting_settings',
    JSON.stringify({
      spreadsheetId: 'sheet-1',
      spreadsheets: [{ id: 'sheet-1', name: 'x', createdAt: '' }],
      forms: [],
      theme: 'dark',
      currency: 'rial',
      dangCategories: ['a']
    })
  )
  localStorage.setItem('accounting_sync_outbox_sheet-1', JSON.stringify([{ id: '1' }]))
  localStorage.setItem('accounting_sheet_store_sheet-1', '{}')
  localStorage.setItem('accounting_sheet_synced_at_sheet-1', '1')
  localStorage.setItem('accounting_app_lock', JSON.stringify({ enabled: true }))
  localStorage.setItem('accounting_app_lock_device', '{}')
  localStorage.setItem('accounting_app_lock_attempts', '{"failures":3}')
  localStorage.setItem('accounting_start_date', '"2025-01-01"')
  localStorage.setItem('accounting_update_dismissed', '5')
  sessionStorage.setItem('accounting_app_lock_unlocked', '1')
  sessionStorage.setItem('accounting_app_lock_external_handoff', '1')
}

describe('clearAllLocalData', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
    native.value = false
    vi.stubGlobal('indexedDB', { deleteDatabase })
    window.google = { accounts: { oauth2: { initTokenClient: vi.fn(), revoke } } }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete window.google
  })

  it('reports queued writes for the active spreadsheet', async () => {
    const { getPendingSyncCount } = await import('./localDataWipe')

    seed()

    expect(getPendingSyncCount()).toBe(1)
  })

  it('removes account data but keeps device preferences', async () => {
    const { clearAllLocalData } = await import('./localDataWipe')

    seed()
    await clearAllLocalData()

    for (const key of [
      'accounting_session',
      'accounting_sync_outbox_sheet-1',
      'accounting_sheet_store_sheet-1',
      'accounting_sheet_synced_at_sheet-1',
      'accounting_app_lock',
      'accounting_app_lock_device',
      'accounting_app_lock_attempts',
      'accounting_start_date'
    ]) {
      expect(localStorage.getItem(key), key).toBeNull()
    }

    const settings = JSON.parse(localStorage.getItem('accounting_settings') ?? '{}')

    expect(settings.spreadsheetId).toBe('')
    expect(settings.spreadsheets).toEqual([])
    expect(settings.dangCategories).toBeUndefined()
    expect(settings.theme).toBe('dark')
    expect(settings.currency).toBe('rial')
    expect(localStorage.getItem('accounting_update_dismissed')).toBe('5')
    expect(sessionStorage.getItem('accounting_app_lock_unlocked')).toBeNull()
    expect(sessionStorage.getItem('accounting_app_lock_external_handoff')).toBeNull()
    expect(stopSheetSync).toHaveBeenCalled()
    expect(clearStore).toHaveBeenCalledWith('sheet-1')
    expect(deleteDatabase).toHaveBeenCalledWith('accounting_sheet_store')
    expect(revoke).toHaveBeenCalledWith('tok', expect.any(Function))
  })

  it('forgets which shared account this device could not open', async () => {
    const { clearAllLocalData } = await import('./localDataWipe')
    const { markSharedAccessLost, isSharedAccessLost } = await import('./sharedAccessLost')

    seed()
    markSharedAccessLost('shared-1')
    expect(isSharedAccessLost('shared-1')).toBe(true)
    await clearAllLocalData()

    expect(isSharedAccessLost('shared-1')).toBe(false)
  })

  it('signs out natively instead of using the web revoke', async () => {
    const { clearAllLocalData } = await import('./localDataWipe')

    native.value = true
    seed()
    await clearAllLocalData()

    expect(signOutNative).toHaveBeenCalled()
    expect(revoke).not.toHaveBeenCalled()
  })

  it('asks the refresh-token worker to revoke and forget the session on sign-out', async () => {
    const { clearAllLocalData } = await import('./localDataWipe')

    seed()
    localStorage.setItem(
      'accounting_session',
      JSON.stringify({
        email: 'a@example.com',
        accessToken: 'tok',
        tokenExpiry: Date.now() + 1e6,
        authSessionId: 'sess-1'
      })
    )
    await clearAllLocalData()

    expect(logoutViaWorker).toHaveBeenCalledWith('sess-1')
    expect(forgetWorkerSession).not.toHaveBeenCalled()
    expect(localStorage.getItem('accounting_session')).toBeNull()
  })

  it('only forgets the worker copy, never revokes, when a fresh sign-in follows (PIN recovery)', async () => {
    const { clearAllLocalData } = await import('./localDataWipe')

    seed()
    localStorage.setItem(
      'accounting_session',
      JSON.stringify({
        email: 'a@example.com',
        accessToken: 'tok',
        tokenExpiry: Date.now() + 1e6,
        authSessionId: 'sess-1'
      })
    )
    await clearAllLocalData({ revokeAccess: false })

    expect(forgetWorkerSession).toHaveBeenCalledWith('sess-1')
    expect(logoutViaWorker).not.toHaveBeenCalled()
  })

  it('does not call the worker for a session that has no worker session', async () => {
    const { clearAllLocalData } = await import('./localDataWipe')

    seed()
    await clearAllLocalData()

    expect(logoutViaWorker).not.toHaveBeenCalled()
  })

  it('leaves the new sign-in alone when switching accounts', async () => {
    const { clearAllLocalData } = await import('./localDataWipe')

    native.value = true
    seed()
    await clearAllLocalData({ revokeAccess: false })

    expect(signOutNative).not.toHaveBeenCalled()
    expect(localStorage.getItem('accounting_session')).toBeNull()
  })
})
