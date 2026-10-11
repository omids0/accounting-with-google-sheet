import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setBankSmsCaptureEnabled, setBankSmsNativeViewDays } from './bankSmsNative'
import { getBankSmsPrefs, updateBankSmsPrefs } from './bankSmsPrefs'
import { applyBankSmsViewDays, syncBankSmsNativeSettings } from './bankSmsViewRange'

vi.mock('./bankSmsNative', () => ({
  setBankSmsCaptureEnabled: vi.fn(async () => undefined),
  setBankSmsNativeViewDays: vi.fn(async () => undefined)
}))

describe('bank SMS review range on the phone', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('gives the native notifications the same range as the review page', async () => {
    await applyBankSmsViewDays(3)

    expect(getBankSmsPrefs().viewDays).toBe(3)
    expect(setBankSmsNativeViewDays).toHaveBeenCalledWith(3)
  })

  it('keeps the chosen range when an older app build lacks the native method', async () => {
    vi.mocked(setBankSmsNativeViewDays).mockRejectedValueOnce(new Error('not implemented'))

    await expect(applyBankSmsViewDays(30)).resolves.toBeUndefined()
    expect(getBankSmsPrefs().viewDays).toBe(30)
  })

  it('re-syncs the switch and the range on app start', async () => {
    updateBankSmsPrefs({ enabled: true, viewDays: 7 })

    await syncBankSmsNativeSettings()

    expect(setBankSmsCaptureEnabled).toHaveBeenCalledWith(true)
    expect(setBankSmsNativeViewDays).toHaveBeenCalledWith(7)
  })
})
