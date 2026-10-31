import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { UPDATE_BACKUP_TIMEOUT_MS, backupBeforeUpdate } from './updateBackup'

const FAILED = 'پشتیبان پیش از به‌روزرسانی ساخته نشد'

const mocks = vi.hoisted(() => ({
  env: { dev: false },
  isTokenValid: vi.fn(() => true),
  sharedCan: vi.fn(() => true),
  settings: { spreadsheetId: 'sheet-1' } as { spreadsheetId: string } | null,
  buildActiveBackup: vi.fn(),
  uploadAndPrune: vi.fn(),
  showInfo: vi.fn()
}))

vi.mock('./appUpdate', () => ({
  UPDATE_BACKUP_FAILED_MESSAGE: 'پشتیبان پیش از به‌روزرسانی ساخته نشد'
}))
vi.mock('./auth', () => ({ isTokenValid: mocks.isTokenValid }))
vi.mock('./driveBackupRun', () => ({
  buildActiveBackup: mocks.buildActiveBackup,
  uploadAndPrune: mocks.uploadAndPrune
}))
vi.mock('./settings', () => ({ getSettings: () => mocks.settings }))
vi.mock('./sharedCan', () => ({ sharedCan: mocks.sharedCan }))
vi.mock('./spreadsheetCatalog', () => ({ activeSpreadsheetLabel: () => 'حساب شخصی' }))
vi.mock('../utils/appEnv', () => ({
  get IS_DEV_ENV() {
    return mocks.env.dev
  },
  get APP_VERSION_LABEL() {
    return mocks.env.dev ? '2.17.0-dev' : '2.17.0'
  }
}))
vi.mock('../utils/toast', () => ({ showInfo: mocks.showInfo }))

const backup = {
  blob: new Blob(['zip']),
  name: 'x.zip',
  exportedAt: new Date(2026, 9, 31, 18, 40)
}

const setOnline = (online: boolean) => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)

describe('backupBeforeUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.env.dev = false
    mocks.settings = { spreadsheetId: 'sheet-1' }
    mocks.isTokenValid.mockReturnValue(true)
    mocks.sharedCan.mockReturnValue(true)
    mocks.buildActiveBackup.mockResolvedValue(backup)
    mocks.uploadAndPrune.mockResolvedValue({ id: 'f1' })
    setOnline(true)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('uploads a production copy of the active spreadsheet named with environment and versions', async () => {
    expect(await backupBeforeUpdate('2.18.0')).toBe('saved')

    expect(mocks.buildActiveBackup).toHaveBeenCalledWith('sheet-1')

    const [id, sent, kind, known, version] = mocks.uploadAndPrune.mock.calls[0]

    expect(id).toBe('sheet-1')
    expect(kind).toBe('update-prod')
    expect(known).toBeUndefined()
    expect(version).toBe('2.17.0')
    expect(sent.blob).toBe(backup.blob)
    expect(sent.name).toContain('حساب شخصی · پشتیبان به‌روزرسانی · prod · 2.17.0 to 2.18.0 ')
    expect(mocks.showInfo).not.toHaveBeenCalled()
  })

  it('the develop app writes its own kind', async () => {
    mocks.env.dev = true

    await backupBeforeUpdate()

    const [, sent, kind, , version] = mocks.uploadAndPrune.mock.calls[0]

    expect(kind).toBe('update-dev')
    expect(version).toBe('2.17.0-dev')
    expect(sent.name).toContain(' · dev · 2.17.0-dev ')
  })

  it.each([
    ['offline', () => setOnline(false)],
    ['signed out', () => mocks.isTokenValid.mockReturnValue(false)],
    ['a viewer without export', () => mocks.sharedCan.mockReturnValue(false)],
    ['no spreadsheet yet', () => (mocks.settings = null)]
  ])('does nothing and says nothing when %s', async (_name, arrange) => {
    arrange()

    expect(await backupBeforeUpdate()).toBe('skipped')
    expect(mocks.buildActiveBackup).not.toHaveBeenCalled()
    expect(mocks.uploadAndPrune).not.toHaveBeenCalled()
    expect(mocks.showInfo).not.toHaveBeenCalled()
  })

  it('asks the export permission of this spreadsheet', async () => {
    await backupBeforeUpdate()

    expect(mocks.sharedCan).toHaveBeenCalledWith('export', 'sheet-1')
  })

  it('reports a failure with one quiet toast and resolves, so the update goes on', async () => {
    mocks.uploadAndPrune.mockRejectedValue(new Error('403'))

    expect(await backupBeforeUpdate()).toBe('failed')
    expect(mocks.showInfo).toHaveBeenCalledTimes(1)
    expect(mocks.showInfo).toHaveBeenCalledWith(FAILED)
  })

  it('reports a failed build (queued edits not sent) the same way', async () => {
    mocks.buildActiveBackup.mockRejectedValue(new Error('pending'))

    expect(await backupBeforeUpdate()).toBe('failed')
    expect(mocks.uploadAndPrune).not.toHaveBeenCalled()
    expect(mocks.showInfo).toHaveBeenCalledWith(FAILED)
  })

  it('gives up after the cap, tells the user, and ignores a late failure', async () => {
    vi.useFakeTimers()

    let reject: (error: Error) => void = () => undefined

    mocks.uploadAndPrune.mockReturnValue(new Promise((_, fail) => (reject = fail)))

    const run = backupBeforeUpdate()

    await vi.advanceTimersByTimeAsync(UPDATE_BACKUP_TIMEOUT_MS - 1)
    expect(mocks.showInfo).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(await run).toBe('failed')
    expect(mocks.showInfo).toHaveBeenCalledTimes(1)
    expect(mocks.showInfo).toHaveBeenCalledWith(FAILED)

    reject(new Error('late'))
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.showInfo).toHaveBeenCalledTimes(1)
  })

  it('a second press while one runs joins it instead of uploading twice', async () => {
    let finish: (value: unknown) => void = () => undefined

    mocks.uploadAndPrune.mockReturnValue(new Promise(resolve => (finish = resolve)))

    const first = backupBeforeUpdate()
    const second = backupBeforeUpdate()

    await vi.waitFor(() => expect(mocks.uploadAndPrune).toHaveBeenCalled())
    finish({ id: 'f1' })

    expect(await Promise.all([first, second])).toEqual(['saved', 'saved'])
    expect(mocks.buildActiveBackup).toHaveBeenCalledTimes(1)
    expect(mocks.uploadAndPrune).toHaveBeenCalledTimes(1)

    // Once it ended, the next press starts a new run.
    await backupBeforeUpdate()
    expect(mocks.uploadAndPrune).toHaveBeenCalledTimes(2)
  })
})
