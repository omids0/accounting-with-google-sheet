import { describe, expect, it, vi } from 'vitest'

import { createSubmitLock } from './useSubmitLock'

describe('submit lock', () => {
  it('runs the first call now and ignores calls made while it is pending', async () => {
    const run = createSubmitLock()
    let finish: () => void = () => undefined
    const task = vi.fn(() => new Promise<void>(resolve => (finish = resolve)))

    const first = run(task)

    void run(task)
    void run(task)
    expect(task).toHaveBeenCalledTimes(1)

    finish()
    await first
    await run(async () => undefined)
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('starts the task synchronously so preventDefault still works', () => {
    const run = createSubmitLock()
    let started = false

    void run(() => {
      started = true
    })
    expect(started).toBe(true)
  })

  it('unlocks after a failed save so the user can retry', async () => {
    const run = createSubmitLock()

    await expect(
      run(() => {
        throw new Error('offline')
      })
    ).rejects.toThrow('offline')

    const retry = vi.fn()

    await run(retry)
    expect(retry).toHaveBeenCalledTimes(1)
  })
})
