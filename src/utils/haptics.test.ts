import { beforeEach, describe, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({ value: false }))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => native.value }
}))

import { haptic, hapticsPlugin, installSelectionHaptics } from './haptics'

const plugin = {
  impact: vi.fn(() => Promise.resolve()),
  notification: vi.fn(() => Promise.resolve()),
  selectionStart: vi.fn(() => Promise.resolve()),
  selectionChanged: vi.fn(() => Promise.resolve()),
  selectionEnd: vi.fn(() => Promise.resolve())
}

const fakeModule = {
  Haptics: plugin,
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM' },
  NotificationType: { Error: 'ERROR', Success: 'SUCCESS' }
}

describe('haptic', () => {
  const load = vi.spyOn(hapticsPlugin, 'load')

  beforeEach(() => {
    vi.clearAllMocks()
    load.mockResolvedValue(fakeModule as never)
  })

  it('does nothing on the web and never loads the plugin', async () => {
    native.value = false
    haptic('light')
    haptic('selection')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(load).not.toHaveBeenCalled()
    expect(plugin.impact).not.toHaveBeenCalled()

    const addListener = vi.spyOn(document, 'addEventListener')

    installSelectionHaptics()()
    expect(addListener).not.toHaveBeenCalled()
  })

  it('maps each kind to the plugin in the APK', async () => {
    native.value = true
    haptic('light')
    haptic('medium')
    haptic('error')
    haptic('success')
    haptic('selection')
    await vi.waitFor(() => expect(plugin.selectionEnd).toHaveBeenCalled())
    expect(plugin.impact).toHaveBeenCalledWith({ style: 'LIGHT' })
    expect(plugin.impact).toHaveBeenCalledWith({ style: 'MEDIUM' })
    expect(plugin.notification).toHaveBeenCalledWith({ type: 'ERROR' })
    expect(plugin.notification).toHaveBeenCalledWith({ type: 'SUCCESS' })
    expect(plugin.selectionStart).toHaveBeenCalled()
    expect(plugin.selectionChanged).toHaveBeenCalled()
  })

  it('stays silent in the APK when «صدای ثبت و لرزش» is off', async () => {
    native.value = true
    localStorage.setItem('accounting_haptics_off', '1')
    haptic('light')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(load).not.toHaveBeenCalled()
    localStorage.removeItem('accounting_haptics_off')
  })

  it('ticks on checkbox changes once installed in the APK', async () => {
    native.value = true

    const cleanup = installSelectionHaptics()
    const box = document.createElement('input')

    box.type = 'checkbox'
    document.body.append(box)
    box.click()
    await vi.waitFor(() => expect(plugin.selectionChanged).toHaveBeenCalledTimes(1))
    cleanup()
    box.remove()
  })

  it('swallows plugin failures', async () => {
    native.value = true
    load.mockRejectedValueOnce(new Error('no vibrator'))
    expect(() => haptic('light')).not.toThrow()
    await new Promise(resolve => setTimeout(resolve, 0))
  })
})
