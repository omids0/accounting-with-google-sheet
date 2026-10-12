import { describe, expect, it, vi } from 'vitest'

import {
  closeTopOverlay,
  decideBackAction,
  EXIT_CONFIRM_WINDOW_MS,
  getOverlayCount,
  pushOverlay
} from './overlayStack'

describe('overlay stack', () => {
  it('closes only the most recently opened overlay', () => {
    const first = vi.fn(() => true)
    const second = vi.fn(() => true)
    const removeFirst = pushOverlay(first)
    const removeSecond = pushOverlay(second)

    expect(closeTopOverlay()).toBe(true)
    expect(second).toHaveBeenCalledOnce()
    expect(first).not.toHaveBeenCalled()

    removeSecond()
    removeFirst()
    expect(getOverlayCount()).toBe(0)
    expect(closeTopOverlay()).toBe(false)
  })

  it('consumes the press when the overlay refuses to close', () => {
    const remove = pushOverlay(() => false)

    expect(closeTopOverlay()).toBe(true)
    expect(getOverlayCount()).toBe(1)
    remove()
  })
})

describe('Escape through the overlay stack', () => {
  const pressEscape = () => {
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })

    document.dispatchEvent(event)

    return event
  }

  it('closes only the top overlay on one press', () => {
    const lower = vi.fn(() => true)
    const upper = vi.fn(() => true)
    const removeLower = pushOverlay(lower)
    const removeUpper = pushOverlay(upper)

    expect(pressEscape().defaultPrevented).toBe(true)
    expect(upper).toHaveBeenCalledOnce()
    expect(lower).not.toHaveBeenCalled()

    removeUpper()
    pressEscape()
    expect(lower).toHaveBeenCalledOnce()
    removeLower()
  })

  it('keeps a blocked overlay open and does not reach the one below', () => {
    const lower = vi.fn(() => true)
    const blocked = vi.fn(() => false)
    const removeLower = pushOverlay(lower)
    const removeBlocked = pushOverlay(blocked)

    expect(pressEscape().defaultPrevented).toBe(true)
    expect(blocked).toHaveBeenCalledOnce()
    expect(lower).not.toHaveBeenCalled()
    expect(getOverlayCount()).toBe(2)

    removeBlocked()
    removeLower()
  })

  it('ignores other keys, handled Escapes and an empty stack', () => {
    const close = vi.fn(() => true)
    const remove = pushOverlay(close)
    const handled = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })

    handled.preventDefault()
    document.dispatchEvent(handled)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(close).not.toHaveBeenCalled()

    remove()
    expect(pressEscape().defaultPrevented).toBe(false)
    expect(close).not.toHaveBeenCalled()
  })
})

describe('decideBackAction', () => {
  const base = {
    overlayOpen: false,
    pathname: '/',
    canGoBack: true,
    lastRootPressAt: null,
    now: 10_000
  }

  it('closes an overlay before anything else', () => {
    expect(decideBackAction({ ...base, overlayOpen: true, pathname: '/checks' })).toBe('overlay')
  })

  it('goes back from an inner page, or home without history', () => {
    expect(decideBackAction({ ...base, pathname: '/checks' })).toBe('back')
    expect(decideBackAction({ ...base, pathname: '/checks', canGoBack: false })).toBe('home')
  })

  it('asks for a second press at the root and exits only within the window', () => {
    expect(decideBackAction(base)).toBe('confirm-exit')
    expect(decideBackAction({ ...base, lastRootPressAt: base.now - 500 })).toBe('exit')
    expect(
      decideBackAction({ ...base, lastRootPressAt: base.now - EXIT_CONFIRM_WINDOW_MS - 1 })
    ).toBe('confirm-exit')
  })
})
