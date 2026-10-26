// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { BankSmsDuplicateHint, BankSmsSameButton, type SingleSmsItem } from './BankSmsDuplicate'

const payment = { kind: 'dang', noun: 'بدهی', title: 'وام' }
const item = (patch: Partial<SingleSmsItem>) =>
  ({ duplicateMovedBalance: false, duplicatePayment: null, ...patch } as SingleSmsItem)
const hint = (patch: Partial<SingleSmsItem>) =>
  renderToStaticMarkup(createElement(BankSmsDuplicateHint, { item: item(patch) }))

describe('BankSmsSameButton', () => {
  it('closes the SMS on click and is disabled while busy', async () => {
    const onClick = vi.fn()
    const host = document.createElement('div')
    const root = createRoot(host)

    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    await act(async () => root.render(createElement(BankSmsSameButton, { busy: false, onClick })))

    const button = host.querySelector('button')

    expect(button?.textContent).toContain('همان است، پیامک را ببند')
    act(() => button?.click())
    expect(onClick).toHaveBeenCalledTimes(1)

    await act(async () => root.render(createElement(BankSmsSameButton, { busy: true, onClick })))
    expect(host.querySelector('button')?.disabled).toBe(true)
    act(() => root.unmount())
  })
})

describe('BankSmsDuplicateHint', () => {
  it('tells what closing does to the balance of a payment record', () => {
    expect(hint({ duplicatePayment: payment, duplicateMovedBalance: true })).toContain(
      'دوباره عوض نمی‌شود'
    )
    expect(hint({ duplicatePayment: payment })).toContain('«فقط موجودی»')
  })

  it('keeps the old hint for an ordinary duplicate and none without a balance effect', () => {
    expect(hint({ duplicateMovedBalance: true })).toContain('⋯ ← قبلاً ثبت شده')
    expect(hint({})).toBe('')
  })
})
