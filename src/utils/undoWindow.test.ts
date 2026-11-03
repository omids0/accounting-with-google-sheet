import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { holdUndoWindow, startUndoWindow } from './undoWindow'

describe('undo window', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('fires after the window', () => {
    const done = vi.fn()

    startUndoWindow('a', 5000, done)
    vi.advanceTimersByTime(4999)
    expect(done).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(done).toHaveBeenCalledOnce()
  })

  it('stops while held and resumes with the time that was left', () => {
    const done = vi.fn()

    startUndoWindow('b', 5000, done)
    vi.advanceTimersByTime(3000)
    holdUndoWindow('b', true)
    vi.advanceTimersByTime(60_000)
    expect(done).not.toHaveBeenCalled()
    holdUndoWindow('b', false)
    vi.advanceTimersByTime(1999)
    expect(done).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(done).toHaveBeenCalledOnce()
  })

  it('never fires once cancelled', () => {
    const done = vi.fn()
    const cancel = startUndoWindow('c', 5000, done)

    cancel()
    holdUndoWindow('c', false)
    vi.advanceTimersByTime(10_000)
    expect(done).not.toHaveBeenCalled()
  })
})
