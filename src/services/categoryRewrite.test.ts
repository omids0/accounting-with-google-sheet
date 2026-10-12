import { describe, expect, it, vi } from 'vitest'

import { isAuthError } from './auth'
import {
  CategoryRewriteAbortedError,
  runRewriteTasks,
  type RewriteProgress
} from './categoryRewrite'

function tasks(count: number, log: number[]) {
  return Array.from({ length: count }, (_, index) => async () => {
    log.push(index)
  })
}

describe('runRewriteTasks', () => {
  it('runs every task in batches, flushing and reporting after each', async () => {
    const log: number[] = []
    const progress: RewriteProgress[] = []
    const flush = vi.fn(async () => true)

    await runRewriteTasks(tasks(7, log), {
      batchSize: 3,
      flush,
      onProgress: item => progress.push(item)
    })

    expect(log).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(flush).toHaveBeenCalledTimes(3)
    expect(progress.map(item => item.done)).toEqual([0, 3, 6, 7])
  })

  it('keeps going when writes only wait in the outbox (offline)', async () => {
    const log: number[] = []

    await runRewriteTasks(tasks(4, log), { batchSize: 2, flush: async () => false })

    expect(log).toHaveLength(4)
  })

  it('stops between batches when the session is gone', async () => {
    const log: number[] = []
    let calls = 0

    const run = runRewriteTasks(tasks(6, log), {
      batchSize: 2,
      hasSession: () => ++calls < 3
    })

    await expect(run).rejects.toBeInstanceOf(CategoryRewriteAbortedError)
    expect(log).toEqual([0, 1, 2, 3])
  })

  it('stops after a batch whose writes failed on auth, with an auth-shaped error', async () => {
    const log: number[] = []
    const error = await runRewriteTasks(tasks(6, log), {
      batchSize: 2,
      flush: async () => false,
      authFailed: () => true
    }).catch(err => err)

    expect(error).toBeInstanceOf(CategoryRewriteAbortedError)
    expect((error as CategoryRewriteAbortedError).done).toBe(2)
    expect(isAuthError(error)).toBe(true)
    expect(log).toEqual([0, 1])
  })
})
