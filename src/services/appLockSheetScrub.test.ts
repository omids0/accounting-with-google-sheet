import { beforeEach, describe, expect, it, vi } from 'vitest'

const scrubAppLockSheetRow = vi.fn(async (_id: string) => true)

vi.mock('./appLockSync', () => ({
  scrubAppLockSheetRow: (id: string) => scrubAppLockSheetRow(id)
}))

vi.mock('./settings', () => ({ getSettings: () => ({ spreadsheetId: 'sheet-1' }) }))

function signIn(): void {
  localStorage.setItem(
    'accounting_session',
    JSON.stringify({ email: 'a@example.com', accessToken: 't', tokenExpiry: Date.now() + 1e6 })
  )
}

describe('removing the old PIN hash from the sheet', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    signIn()
  })

  it('blanks the sheet row once per device when a local lock exists', async () => {
    const { scrubPinHashFromSheetOnce } = await import('./appLockSheetScrub')

    localStorage.setItem('accounting_app_lock', JSON.stringify({ enabled: true, vault: {} }))

    await scrubPinHashFromSheetOnce()
    await scrubPinHashFromSheetOnce()

    expect(scrubAppLockSheetRow).toHaveBeenCalledTimes(1)
    expect(scrubAppLockSheetRow).toHaveBeenCalledWith('sheet-1')
  })

  it('leaves the sheet alone on a device without a lock', async () => {
    const { scrubPinHashFromSheetOnce } = await import('./appLockSheetScrub')

    await scrubPinHashFromSheetOnce()

    expect(scrubAppLockSheetRow).not.toHaveBeenCalled()
  })

  it('tries again next start when the write failed', async () => {
    const { scrubPinHashFromSheetOnce } = await import('./appLockSheetScrub')

    localStorage.setItem('accounting_app_lock', JSON.stringify({ enabled: false }))
    scrubAppLockSheetRow.mockRejectedValueOnce(new Error('offline'))

    await expect(scrubPinHashFromSheetOnce()).rejects.toThrow()
    await scrubPinHashFromSheetOnce()

    expect(scrubAppLockSheetRow).toHaveBeenCalledTimes(2)
  })
})
