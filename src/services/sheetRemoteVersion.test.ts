import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('./sheetsApi', () => ({ apiRequest }))

const ID = 'sheet-1'

async function load() {
  vi.resetModules()

  const { initStore } = await import('./spreadsheetStore')

  initStore(ID)

  return {
    ...(await import('./sheetRemoteVersion')),
    ...(await import('./spreadsheetSyncMeta'))
  }
}

describe('Drive modifiedTime check', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('reports a change while nothing is remembered', async () => {
    const { checkRemoteChanged } = await load()

    apiRequest.mockResolvedValueOnce({ modifiedTime: 'T1' })

    expect(await checkRemoteChanged(ID)).toEqual({ driveChanged: true, modifiedTime: 'T1' })
  })

  it('trusts a remembered time without any age limit', async () => {
    const { checkRemoteChanged, rememberRemoteVersion } = await load()

    rememberRemoteVersion(ID, 'T1')
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 60 * 60_000)
    apiRequest.mockResolvedValueOnce({ modifiedTime: 'T1' })

    expect(await checkRemoteChanged(ID)).toEqual({ driveChanged: false, modifiedTime: 'T1' })
    vi.restoreAllMocks()
  })

  it('keeps the remembered time in the persisted sync meta', async () => {
    const { rememberRemoteVersion, getSyncMeta, forgetRemoteVersion } = await load()

    rememberRemoteVersion(ID, 'T7')
    expect(getSyncMeta(ID)?.modifiedTime).toBe('T7')

    forgetRemoteVersion(ID)
    expect(getSyncMeta(ID)?.modifiedTime ?? null).toBeNull()
  })

  it('relies on change tokens alone when Drive cannot be read', async () => {
    const { checkRemoteChanged, rememberRemoteVersion } = await load()

    rememberRemoteVersion(ID, 'T1')
    apiRequest.mockRejectedValueOnce(new Error('403'))

    expect(await checkRemoteChanged(ID)).toEqual({ driveChanged: false, modifiedTime: null })
  })
})
