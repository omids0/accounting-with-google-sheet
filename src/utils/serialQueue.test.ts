import { describe, expect, it } from 'vitest'

import { runSerial } from './serialQueue'

const pause = () => new Promise<void>(resolve => setTimeout(resolve, 5))

describe('runSerial', () => {
  it('runs tasks of one key one after another, in call order', async () => {
    const log: string[] = []
    const task = (name: string) => async () => {
      log.push(`start ${name}`)
      await pause()
      log.push(`end ${name}`)
    }

    await Promise.all([runSerial('k', task('a')), runSerial('k', task('b'))])

    expect(log).toEqual(['start a', 'end a', 'start b', 'end b'])
  })

  it('lets different keys run side by side', async () => {
    const log: string[] = []
    const task = (name: string) => async () => {
      log.push(`start ${name}`)
      await pause()
    }

    await Promise.all([runSerial('x', task('a')), runSerial('y', task('b'))])

    expect(log).toEqual(['start a', 'start b'])
  })

  it('a rejected task reaches only its caller and releases the queue', async () => {
    const failed = runSerial('r', async () => {
      throw new Error('boom')
    })
    const next = runSerial('r', async () => 'ok')

    await expect(failed).rejects.toThrow('boom')
    await expect(next).resolves.toBe('ok')
  })
})
