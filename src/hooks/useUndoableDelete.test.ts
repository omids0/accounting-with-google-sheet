import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useNavigate, type NavigateFunction } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { UNDO_WINDOW_MS, useUndoableDelete } from './useUndoableDelete'
import { dismissUndoToast, showUndoToast } from '../components/UndoToast'
import { handleSheetError } from '../utils/sheetError'

vi.mock('../components/UndoToast', () => ({
  showUndoToast: vi.fn(() => 'toast-1'),
  dismissUndoToast: vi.fn()
}))

vi.mock('../utils/sheetError', () => ({ handleSheetError: vi.fn() }))

// `schedule` loads the write queue ahead of time; the real one is not needed here.
vi.mock('../services/sheetSync', () => ({}))

type HookResult = ReturnType<typeof useUndoableDelete>

describe('useUndoableDelete', () => {
  let container: HTMLDivElement

  let root: Root

  let hook: HookResult

  let navigate: NavigateFunction

  function Harness() {
    hook = useUndoableDelete()
    navigate = useNavigate()

    return null
  }

  const entry = (id = 'c1') => ({
    id,
    label: `چک ${id}`,
    commit: vi.fn(() => Promise.resolve()),
    optimisticRemove: vi.fn(),
    restore: vi.fn()
  })

  beforeEach(() => {
    vi.useFakeTimers()
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    root = createRoot(container)
    act(() =>
      root.render(
        createElement(MemoryRouter, { initialEntries: ['/checks'] }, createElement(Harness))
      )
    )
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('hides the row and shows the toast, then undo restores it without writing', async () => {
    const item = entry()

    await act(() => hook.schedule(item))

    expect(item.optimisticRemove).toHaveBeenCalledOnce()
    expect(showUndoToast).toHaveBeenCalledWith(
      'چک c1',
      UNDO_WINDOW_MS,
      expect.any(Function),
      undefined
    )
    expect(hook.pendingId).toBe('c1')
    expect(hook.visible([{ id: 'c1' }, { id: 'c2' }])).toEqual([{ id: 'c2' }])

    act(() => hook.undo())

    expect(item.restore).toHaveBeenCalledOnce()
    expect(dismissUndoToast).toHaveBeenCalledWith('toast-1')
    expect(hook.pendingId).toBeNull()

    await act(() => vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS))

    expect(item.commit).not.toHaveBeenCalled()
  })

  it('writes the delete when the window closes', async () => {
    const item = entry()

    await act(() => hook.schedule(item))
    await act(() => vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS - 1))

    expect(item.commit).not.toHaveBeenCalled()

    await act(() => vi.advanceTimersByTimeAsync(1))

    expect(item.commit).toHaveBeenCalledOnce()
    expect(item.restore).not.toHaveBeenCalled()
    expect(hook.pendingId).toBeNull()
  })

  it('writes at once when the user navigates away', async () => {
    const item = entry()

    await act(() => hook.schedule(item))
    await act(async () => {
      await navigate('/wallet')
    })

    expect(item.commit).toHaveBeenCalledOnce()
  })

  it('writes at once when the app goes to the background', async () => {
    const item = entry()

    await act(() => hook.schedule(item))
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })

    expect(item.commit).toHaveBeenCalledOnce()
  })

  it('starts the commit inside the event that hides or closes the page', async () => {
    const item = entry()

    await act(() => hook.schedule(item))
    // No await between the event and the assertion: nothing may run before the commit starts.
    window.dispatchEvent(new Event('pagehide'))

    expect(item.commit).toHaveBeenCalledOnce()
    expect(item.commit).toHaveBeenCalledWith({ leaving: true })
    expect(dismissUndoToast).toHaveBeenCalledWith('toast-1')
  })

  it('tells the commit it is leaving only when the page is hidden, not on the timer or a route change', async () => {
    const timed = entry('c1')

    await act(() => hook.schedule(timed))
    await act(() => vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS))
    expect(timed.commit).toHaveBeenCalledWith({ leaving: false })

    const routed = entry('c2')

    await act(() => hook.schedule(routed))
    await act(async () => {
      await navigate('/wallet')
    })
    expect(routed.commit).toHaveBeenCalledWith({ leaving: false })
  })

  it('a second delete writes the first one first', async () => {
    const first = entry('c1')
    const second = entry('c2')

    await act(() => hook.schedule(first))
    await act(() => hook.schedule(second))

    expect(first.commit).toHaveBeenCalledOnce()
    expect(second.commit).not.toHaveBeenCalled()
    expect(hook.pendingId).toBe('c2')
  })

  it('restores the row and reports the error when the write fails', async () => {
    const item = entry()
    const failure = new Error('offline')

    item.commit.mockImplementationOnce(() => Promise.reject(failure))

    await act(() => hook.schedule(item))
    await act(() => vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS))

    expect(handleSheetError).toHaveBeenCalledWith(failure, { fallbackMessage: 'خطا در حذف' })
    expect(item.restore).toHaveBeenCalledOnce()
    expect(hook.pendingId).toBeNull()
  })
})
