import { describe, expect, it } from 'vitest'

import { createRunGuard } from './runGuard'

describe('createRunGuard', () => {
  it('ignores a second action while the first runs (double tap)', async () => {
    const clock = 0
    const guard = createRunGuard(700, () => clock)
    let release: () => void = () => undefined
    const first = guard.run(() => new Promise<string>(resolve => (release = () => resolve('a'))))
    const second = await guard.run(async () => 'b')

    release()
    expect(second).toBeUndefined()
    expect(await first).toBe('a')
  })

  it('stays quiet for the cooldown after the action, then accepts again', async () => {
    let clock = 1000
    const guard = createRunGuard(700, () => clock)

    expect(await guard.run(async () => 1)).toBe(1)
    clock += 699
    expect(await guard.run(async () => 2)).toBeUndefined()
    clock += 1
    expect(await guard.run(async () => 3)).toBe(3)
  })

  it('a failing action still ends the run and starts the quiet time', async () => {
    let clock = 0
    const guard = createRunGuard(500, () => clock)

    await expect(guard.run(async () => Promise.reject(new Error('x')))).rejects.toThrow('x')
    expect(await guard.run(async () => 1)).toBeUndefined()
    clock = 500
    expect(await guard.run(async () => 2)).toBe(2)
  })
})
