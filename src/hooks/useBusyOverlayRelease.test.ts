import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useBusyOverlayRelease } from './useBusyOverlayRelease'
import {
  BUSY_RELEASE_FALLBACK_MS,
  hideBusy,
  releaseBusyWhenReady,
  showBusy,
  useBusyOverlayStore
} from '../stores/busyOverlayStore'

vi.mock('../utils/toast', () => ({ showError: vi.fn() }))

describe('useBusyOverlayRelease', () => {
  let container: HTMLDivElement

  let root: Root

  const Page = ({ ready }: { ready: boolean }) => {
    useBusyOverlayRelease(ready)

    return null
  }

  const message = () => useBusyOverlayStore.getState().message

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    hideBusy()
    container = document.createElement('div')
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    hideBusy()
  })

  it('leaves the overlay while the switch has not finished, even for a ready page', () => {
    showBusy('در حال ورود…')
    act(() => root.render(createElement(Page, { ready: true })))

    expect(message()).toBe('در حال ورود…')
  })

  it('hides it when a page that was already ready sees the switch finish', () => {
    showBusy('در حال ورود…')
    act(() => root.render(createElement(Page, { ready: true })))
    act(() => releaseBusyWhenReady())

    expect(message()).toBeNull()
  })

  it('keeps it until the page has its data', () => {
    showBusy('در حال ورود…')
    act(() => releaseBusyWhenReady())
    act(() => root.render(createElement(Page, { ready: false })))
    expect(message()).toBe('در حال ورود…')

    act(() => root.render(createElement(Page, { ready: true })))
    expect(message()).toBeNull()
  })

  it('does not give up on a page that is still loading at the fallback', () => {
    vi.useFakeTimers()
    try {
      showBusy('در حال ورود…')
      act(() => root.render(createElement(Page, { ready: false })))
      act(() => releaseBusyWhenReady())
      act(() => void vi.advanceTimersByTime(BUSY_RELEASE_FALLBACK_MS * 3))
      expect(message()).toBe('در حال ورود…')

      act(() => root.render(createElement(Page, { ready: true })))
      expect(message()).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('falls back after the page that was loading goes away', () => {
    vi.useFakeTimers()
    try {
      showBusy('در حال ورود…')
      act(() => root.render(createElement(Page, { ready: false })))
      act(() => releaseBusyWhenReady())
      act(() => root.render(createElement('div')))
      act(() => void vi.advanceTimersByTime(BUSY_RELEASE_FALLBACK_MS))
      expect(message()).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})
