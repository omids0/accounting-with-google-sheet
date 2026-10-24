import { afterEach, describe, expect, it, vi } from 'vitest'

import { requestPersistentStorage } from './persistentStorage'

function stubStorage(storage: unknown) {
  vi.stubGlobal('navigator', { storage })
}

describe('requestPersistentStorage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('asks the browser and reports a grant', async () => {
    const persist = vi.fn(async () => true)

    stubStorage({ persisted: async () => false, persist })

    await expect(requestPersistentStorage()).resolves.toBe(true)
    expect(persist).toHaveBeenCalledOnce()
  })

  it('does not ask again when storage is already persistent', async () => {
    const persist = vi.fn(async () => true)

    stubStorage({ persisted: async () => true, persist })

    await expect(requestPersistentStorage()).resolves.toBe(true)
    expect(persist).not.toHaveBeenCalled()
  })

  it('reports a refusal without throwing', async () => {
    stubStorage({ persisted: async () => false, persist: async () => false })

    await expect(requestPersistentStorage()).resolves.toBe(false)
  })

  it('survives a browser that throws or has no storage API', async () => {
    stubStorage({
      persisted: async () => {
        throw new Error('blocked')
      },
      persist: async () => true
    })
    await expect(requestPersistentStorage()).resolves.toBe(false)

    stubStorage(undefined)
    await expect(requestPersistentStorage()).resolves.toBe(false)
  })
})
