import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AMOUNTS_HIDDEN_KEY, readAmountsHidden, useAmountsHiddenStore } from './amountsHiddenStore'

describe('amountsHiddenStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAmountsHiddenStore.setState({ hidden: false })
  })

  it('uses the per-device key', () => {
    expect(AMOUNTS_HIDDEN_KEY).toBe('accounting_amounts_hidden')
  })

  it('starts visible when nothing is stored', () => {
    expect(readAmountsHidden()).toBe(false)
  })

  it('persists the switch and removes the key when turned off', () => {
    useAmountsHiddenStore.getState().setHidden(true)

    expect(useAmountsHiddenStore.getState().hidden).toBe(true)
    expect(localStorage.getItem(AMOUNTS_HIDDEN_KEY)).toBe('true')
    expect(readAmountsHidden()).toBe(true)

    useAmountsHiddenStore.getState().setHidden(false)

    expect(localStorage.getItem(AMOUNTS_HIDDEN_KEY)).toBeNull()
    expect(readAmountsHidden()).toBe(false)
  })

  it('toggles between the two states', () => {
    useAmountsHiddenStore.getState().toggle()
    expect(useAmountsHiddenStore.getState().hidden).toBe(true)

    useAmountsHiddenStore.getState().toggle()
    expect(useAmountsHiddenStore.getState().hidden).toBe(false)
  })

  it('restores the stored state on the next launch', async () => {
    localStorage.setItem(AMOUNTS_HIDDEN_KEY, 'true')
    vi.resetModules()

    const fresh = await import('./amountsHiddenStore')

    expect(fresh.useAmountsHiddenStore.getState().hidden).toBe(true)
  })

  it('ignores a corrupted value', () => {
    localStorage.setItem(AMOUNTS_HIDDEN_KEY, '{oops')

    expect(readAmountsHidden()).toBe(false)
  })

  it('keeps working when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })

    expect(() => useAmountsHiddenStore.getState().setHidden(true)).not.toThrow()
    expect(useAmountsHiddenStore.getState().hidden).toBe(true)

    spy.mockRestore()
  })
})
