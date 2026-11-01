// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SmsPermissionHelp from './SmsPermissionHelp'

const mocks = vi.hoisted(() => ({
  permission: 'denied',
  open: vi.fn(async () => true),
  showError: vi.fn(),
  resume: null as null | (() => void),
  removed: vi.fn()
}))

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: (_event: string, handler: () => void) => {
      mocks.resume = handler

      return Promise.resolve({ remove: mocks.removed })
    }
  }
}))
vi.mock('../../services/bankSmsNative', () => ({
  getBankSmsPermission: async () => mocks.permission,
  openNativeAppSettings: mocks.open
}))
vi.mock('../../utils/toast', () => ({ showError: mocks.showError }))

let host: HTMLDivElement
let root: Root

const flush = () => act(async () => void (await Promise.resolve()))
const render = async (props: Parameters<typeof SmsPermissionHelp>[0] = {}) => {
  await act(async () => root.render(createElement(SmsPermissionHelp, props)))
}
const buttonLabelled = (text: string) =>
  [...host.querySelectorAll('button')].find(b => b.textContent?.includes(text))

describe('SmsPermissionHelp', () => {
  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    mocks.permission = 'denied'
    mocks.resume = null
    mocks.open.mockReset().mockResolvedValue(true)
    mocks.showError.mockReset()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  it('explains the store restriction and offers the settings button', async () => {
    await render()

    expect(host.textContent).toContain('خارج از فروشگاه')
    expect(host.textContent).toContain('مجاز کردن تنظیمات محدودشده')
    expect(host.querySelectorAll('ol li')).toHaveLength(4)
    expect(buttonLabelled('باز کردن تنظیمات برنامه')).toBeTruthy()
  })

  it('opens the app settings, and tells the user when it cannot', async () => {
    await render()
    await act(async () => buttonLabelled('باز کردن تنظیمات برنامه')?.click())

    expect(mocks.open).toHaveBeenCalledOnce()
    expect(mocks.showError).not.toHaveBeenCalled()

    mocks.open.mockResolvedValue(false)
    await act(async () => buttonLabelled('باز کردن تنظیمات برنامه')?.click())

    expect(mocks.showError).toHaveBeenCalledOnce()
  })

  it('stays put on resume while the permission is still denied', async () => {
    const onGranted = vi.fn()

    await render({ onGranted })
    await act(async () => mocks.resume?.())
    await flush()

    expect(onGranted).not.toHaveBeenCalled()
    expect(host.textContent).toContain('خارج از فروشگاه')
  })

  it('flips to granted on resume and offers the follow-up action', async () => {
    const onGranted = vi.fn()
    const onClick = vi.fn()

    await render({ onGranted, grantedAction: { label: 'فعال‌سازی', onClick } })
    mocks.permission = 'granted'
    await act(async () => mocks.resume?.())
    await flush()

    expect(onGranted).toHaveBeenCalledOnce()
    expect(host.querySelector('[role="status"]')?.textContent).toContain('اجازهٔ پیامک داده شد')
    expect(host.textContent).not.toContain('خارج از فروشگاه')

    await act(async () => buttonLabelled('فعال‌سازی')?.click())
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('also re-checks when the page becomes visible again', async () => {
    const onGranted = vi.fn()

    await render({ onGranted })
    mocks.permission = 'granted'
    await act(async () => void document.dispatchEvent(new Event('visibilitychange')))
    await flush()

    expect(onGranted).toHaveBeenCalledOnce()
  })
})
