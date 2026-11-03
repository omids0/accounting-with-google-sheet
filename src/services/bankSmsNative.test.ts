import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getBankSmsPermission, openNativeAppSettings } from './bankSmsNative'

const mocks = vi.hoisted(() => ({
  platform: 'web',
  openAppSettings: vi.fn(async () => undefined),
  checkPermissions: vi.fn(async () => ({ sms: 'denied' }))
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => mocks.platform },
  registerPlugin: () => ({
    openAppSettings: mocks.openAppSettings,
    checkPermissions: mocks.checkPermissions
  })
}))

describe('openNativeAppSettings', () => {
  beforeEach(() => {
    mocks.platform = 'web'
    mocks.openAppSettings.mockReset().mockResolvedValue(undefined)
  })

  it('is a no-op that reports false on the web', async () => {
    expect(await openNativeAppSettings()).toBe(false)
    expect(mocks.openAppSettings).not.toHaveBeenCalled()
  })

  it('opens the screen on Android', async () => {
    mocks.platform = 'android'

    expect(await openNativeAppSettings()).toBe(true)
    expect(mocks.openAppSettings).toHaveBeenCalledOnce()
  })

  it('reports false when the screen cannot open or the APK lacks the method', async () => {
    mocks.platform = 'android'
    mocks.openAppSettings.mockRejectedValue(new Error('not implemented'))

    expect(await openNativeAppSettings()).toBe(false)
  })
})

describe('getBankSmsPermission', () => {
  it('reads the native state on Android and says denied on the web', async () => {
    mocks.platform = 'web'
    expect(await getBankSmsPermission()).toBe('denied')

    mocks.platform = 'android'
    mocks.checkPermissions.mockResolvedValueOnce({ sms: 'granted' })
    expect(await getBankSmsPermission()).toBe('granted')
  })
})
