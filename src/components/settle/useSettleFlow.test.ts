import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'

import { unpayMessage, useSettleFlow, type SettleFlow } from './useSettleFlow'

function mountFlow() {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const holder: { flow?: SettleFlow } = {}
  const Probe = () => {
    holder.flow = useSettleFlow()

    return null
  }

  act(() => createRoot(document.createElement('div')).render(createElement(Probe)))

  return holder as { flow: SettleFlow }
}

describe('unpay question', () => {
  it('says the linked record is deleted only when there is one', () => {
    expect(unpayMessage(true)).toBe(
      'پرداخت این مورد برگردانده می‌شود و رکورد مالی مرتبط حذف می‌شود.'
    )
    expect(unpayMessage(false)).toBe('پرداخت این مورد برگردانده می‌شود.')
  })

  it('resolves true on confirm and false on cancel', async () => {
    const holder = mountFlow()
    let answer: Promise<boolean> | undefined

    act(() => {
      answer = holder.flow.askUnpay(true)
    })
    expect(holder.flow.unpay?.message).toContain('رکورد مالی مرتبط')
    act(() => holder.flow.answerUnpay(true))
    await expect(answer).resolves.toBe(true)

    act(() => {
      answer = holder.flow.askUnpay(false)
    })
    act(() => holder.flow.answerUnpay(false))
    await expect(answer).resolves.toBe(false)
    expect(holder.flow.unpay).toBeUndefined()
  })

  it('refuses a second question while one is open', async () => {
    const holder = mountFlow()

    act(() => {
      void holder.flow.askUnpay(true)
    })
    await expect(holder.flow.askUnpay(true)).resolves.toBe(false)
  })
})
