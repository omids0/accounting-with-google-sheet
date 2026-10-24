import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  BUSY_MAX_MS,
  BUSY_RELEASE_FALLBACK_MS,
  BUSY_TIMEOUT_MESSAGE,
  hideBusy,
  releaseBusyWhenReady,
  showBusy,
  updateBusy,
  useBusyOverlayStore
} from './busyOverlayStore'

const toast = vi.hoisted(() => ({ showError: vi.fn() }))

vi.mock('../utils/toast', () => toast)

const state = () => useBusyOverlayStore.getState()

describe('busyOverlayStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    toast.showError.mockClear()
    hideBusy()
  })

  afterEach(() => {
    hideBusy()
    vi.useRealTimers()
  })

  it('shows and hides the message', () => {
    showBusy('در حال ورود…')
    expect(state().message).toBe('در حال ورود…')
    expect(state().progress).toBeNull()
    hideBusy()
    expect(state().message).toBeNull()
  })

  it('keeps the bar when the message changes and ignores updates while hidden', () => {
    updateBusy({ message: 'نباید بیاید', progress: 50 })
    expect(state().message).toBeNull()

    showBusy('اول', 10)
    showBusy('دوم')
    expect(state()).toMatchObject({ message: 'دوم', progress: 10 })
    updateBusy({ progress: 40 })
    expect(state()).toMatchObject({ message: 'دوم', progress: 40 })
  })

  it('gives up after 30 seconds: hides itself and shows the error toast', () => {
    showBusy('در حال ورود…')
    vi.advanceTimersByTime(BUSY_MAX_MS - 1)
    expect(state().message).not.toBeNull()
    expect(toast.showError).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(state().message).toBeNull()
    expect(toast.showError).toHaveBeenCalledWith(BUSY_TIMEOUT_MESSAGE)
  })

  it('does not time out once it was hidden in time', () => {
    showBusy('در حال ورود…')
    hideBusy()
    vi.advanceTimersByTime(BUSY_MAX_MS * 2)
    expect(toast.showError).not.toHaveBeenCalled()
  })

  it('waits for the page after the switch, then falls back to a short timer', () => {
    showBusy('در حال ورود…')
    releaseBusyWhenReady()
    expect(state()).toMatchObject({ message: 'در حال ورود…', awaitingPage: true })

    vi.advanceTimersByTime(BUSY_RELEASE_FALLBACK_MS)
    expect(state().message).toBeNull()
    expect(state().awaitingPage).toBe(false)
    expect(toast.showError).not.toHaveBeenCalled()
  })

  it('releases nothing when no overlay is up', () => {
    releaseBusyWhenReady()
    expect(state().awaitingPage).toBe(false)
  })

  it('a new switch after a release starts waiting again from the switch', () => {
    showBusy('اول')
    releaseBusyWhenReady()
    showBusy('دوم')
    expect(state()).toMatchObject({ message: 'دوم', awaitingPage: false })
  })
})
