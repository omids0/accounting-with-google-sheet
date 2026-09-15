import { describe, expect, it, vi } from 'vitest'

import { hasPendingAppUpdate, syncPendingAppUpdate } from './appUpdateStatus'

describe('appUpdateStatus', () => {
  it('returns false when service workers are unavailable', async () => {
    const original = navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: undefined
    })

    await expect(hasPendingAppUpdate()).resolves.toBe(false)

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: original
    })
  })

  it('notifies when a waiting worker exists', async () => {
    const getRegistration = vi.fn(async () => ({ waiting: {} }))
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistration }
    })

    const onAvailable = vi.fn()

    await syncPendingAppUpdate(onAvailable)

    expect(onAvailable).toHaveBeenCalledTimes(1)
  })
})
