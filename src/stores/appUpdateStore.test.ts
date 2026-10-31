import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  backupBeforeUpdate: vi.fn(),
  applyApk: vi.fn(),
  applyWeb: vi.fn(() => Promise.resolve()),
  showInfo: vi.fn(),
  native: false
}))

vi.mock('../services/updateBackup', () => ({ backupBeforeUpdate: mocks.backupBeforeUpdate }))
vi.mock('../services/appUpdate', () => ({
  UPDATE_BACKUP_FAILED_MESSAGE: 'ساخته نشد',
  applyUpdate: mocks.applyApk,
  getDismissedKey: () => null,
  checkForUpdate: vi.fn(),
  dismissUpdate: vi.fn()
}))
vi.mock('../services/googleAuthNative', () => ({ isNativePlatform: () => mocks.native }))
vi.mock('../services/webUpdate', () => ({
  applyUpdate: mocks.applyWeb,
  checkForUpdate: vi.fn(),
  subscribeWebUpdate: vi.fn()
}))
vi.mock('../utils/toast', () => ({ showInfo: mocks.showInfo }))

const WEB_UPDATE = { versionName: '2.18.0', key: 'web:2.18.0' }

async function loadStore(native: boolean) {
  vi.resetModules()
  mocks.native = native

  const { useAppUpdateStore } = await import('./appUpdateStore')

  useAppUpdateStore.setState({
    update: native ? { ...WEB_UPDATE, apkUrl: 'https://example.test/a.apk' } : WEB_UPDATE
  })

  return useAppUpdateStore
}

describe('appUpdateStore.apply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.backupBeforeUpdate.mockResolvedValue('saved')
  })

  it('backs up first, then installs the web update', async () => {
    const order: string[] = []

    mocks.backupBeforeUpdate.mockImplementation(async () => void order.push('backup'))
    mocks.applyWeb.mockImplementation(async () => void order.push('apply'))

    const store = await loadStore(false)

    await store.getState().apply()

    expect(order).toEqual(['backup', 'apply'])
    expect(mocks.backupBeforeUpdate).toHaveBeenCalledWith('2.18.0')
    expect(store.getState().preparing).toBe(false)
  })

  it('on the APK it backs up, then opens the installer', async () => {
    const store = await loadStore(true)

    await store.getState().apply()

    expect(mocks.backupBeforeUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.applyApk).toHaveBeenCalledWith(
      expect.objectContaining({ apkUrl: expect.any(String) })
    )
    expect(mocks.applyWeb).not.toHaveBeenCalled()
  })

  it('shows the progress state while the backup runs', async () => {
    let finish: (value: string) => void = () => undefined

    mocks.backupBeforeUpdate.mockReturnValue(new Promise(resolve => (finish = resolve)))

    const store = await loadStore(false)
    const run = store.getState().apply()

    await vi.waitFor(() => expect(store.getState().preparing).toBe(true))
    expect(mocks.applyWeb).not.toHaveBeenCalled()

    finish('saved')
    await run

    expect(store.getState().preparing).toBe(false)
    expect(mocks.applyWeb).toHaveBeenCalledTimes(1)
  })

  it('a second press while preparing does nothing', async () => {
    let finish: (value: string) => void = () => undefined

    mocks.backupBeforeUpdate.mockReturnValue(new Promise(resolve => (finish = resolve)))

    const store = await loadStore(false)
    const first = store.getState().apply()

    await vi.waitFor(() => expect(store.getState().preparing).toBe(true))
    await store.getState().apply()
    finish('saved')
    await first

    expect(mocks.backupBeforeUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.applyWeb).toHaveBeenCalledTimes(1)
  })

  it('still updates when the backup code cannot run, and says so once', async () => {
    mocks.backupBeforeUpdate.mockRejectedValue(new Error('boom'))

    const store = await loadStore(false)

    await store.getState().apply()

    expect(mocks.showInfo).toHaveBeenCalledTimes(1)
    expect(mocks.showInfo).toHaveBeenCalledWith('ساخته نشد')
    expect(mocks.applyWeb).toHaveBeenCalledTimes(1)
    expect(store.getState().preparing).toBe(false)
  })

  it('does nothing without an update', async () => {
    const store = await loadStore(false)

    store.setState({ update: null })
    await store.getState().apply()

    expect(mocks.backupBeforeUpdate).not.toHaveBeenCalled()
    expect(mocks.applyWeb).not.toHaveBeenCalled()
  })
})
