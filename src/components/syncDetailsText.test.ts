import { describe, expect, it } from 'vitest'

import { describeRetryOutcome } from './syncDetailsText'

describe('the toast after «دوباره بفرست»', () => {
  it('says everything arrived', () => {
    expect(describeRetryOutcome({ retried: 0, pending: 0, failed: 0 }, false)).toEqual({
      kind: 'success',
      message: 'همهٔ تغییرها به شیت رسید.'
    })
    expect(describeRetryOutcome({ retried: 2, pending: 0, failed: 0 }, false).message).toMatch(
      /۲ عملیات ناموفق دوباره فرستاده شد/
    )
  })

  it('names what still fails, ahead of what is queued', () => {
    const toast = describeRetryOutcome({ retried: 1, pending: 3, failed: 1 }, false)

    expect(toast.kind).toBe('error')
    expect(toast.message).toMatch(/۱ عملیات هنوز به شیت نمی‌رسد/)
  })

  it('tells the user when the rest waits for the connection', () => {
    expect(describeRetryOutcome({ retried: 0, pending: 2, failed: 0 }, true)).toMatchObject({
      kind: 'info',
      message: expect.stringContaining('آفلاین')
    })
    expect(describeRetryOutcome({ retried: 0, pending: 2, failed: 0 }, false).kind).toBe('info')
  })
})
