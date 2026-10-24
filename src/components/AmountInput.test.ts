import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import AmountInput from './AmountInput'
import { AMOUNT_INTEGER_ONLY_HINT, AMOUNT_MAX_MESSAGE } from '../utils/amountInput'

const setNativeValue = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value)
}

describe('AmountInput typed key by key', () => {
  let container: HTMLDivElement

  let root: Root

  let latest: number | ''

  const Harness = ({ start }: { start: number | '' }) => {
    const [value, setValue] = useState<number | ''>(start)

    latest = value

    return createElement(AmountInput, { value, onChange: setValue })
  }

  const input = () => container.querySelector('input') as HTMLInputElement

  const notice = () => container.querySelector('p[role]')?.textContent ?? ''

  /** One change event whose text is the shown value after \`edit\`, as the browser sends it. */
  const edit = (change: (shown: string) => string) => {
    act(() => {
      setNativeValue(input(), change(input().value))
      input().dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  const type = (text: string) => {
    for (const char of text) edit(shown => shown + char)
  }

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const mount = (start: number | '' = '') =>
    act(() => root.render(createElement(Harness, { start })))

  it('keeps every digit of 12345678 while the field adds separators', () => {
    mount()
    type('12345678')

    expect(latest).toBe(12345678)
    expect(input().value).toBe('۱۲٬۳۴۵٬۶۷۸')
    expect(notice()).toBe('')
  })

  it('takes Persian digits typed one by one', () => {
    mount()
    type('۱۲۳۴۵')

    expect(latest).toBe(12345)
  })

  it('stops at the cap and says so', () => {
    mount()
    type('99999999999999')

    expect(latest).toBe(9999999999999)
    expect(notice()).toBe(AMOUNT_MAX_MESSAGE)

    edit(shown => shown.slice(0, -1))
    expect(latest).toBe(999999999999)
    expect(notice()).toBe('')
  })

  it('accepts exactly the cap', () => {
    mount()
    type('10000000000000')
    expect(latest).toBe(10_000_000_000_000)
    expect(notice()).toBe('')

    type('0')
    expect(latest).toBe(10_000_000_000_000)
    expect(notice()).toBe(AMOUNT_MAX_MESSAGE)
  })

  it('deletes a digit in the middle', () => {
    mount(12345678)
    edit(shown => shown.replace('۴', ''))

    expect(latest).toBe(1235678)
  })

  it('ignores digits after a typed decimal point and keeps the hint', () => {
    mount()
    type('12.5')

    expect(latest).toBe(12)
    expect(input().value).toBe('۱۲')
    expect(notice()).toBe(AMOUNT_INTEGER_ONLY_HINT)

    type('٣٣')
    expect(latest).toBe(12)
    expect(notice()).toBe(AMOUNT_INTEGER_ONLY_HINT)
  })

  it.each(['٫', ','])('treats a typed %s as a decimal point too', mark => {
    mount()
    type(`12${mark}5`)

    expect(latest).toBe(12)
    expect(notice()).toBe(AMOUNT_INTEGER_ONLY_HINT)
  })

  it('takes digits again after a delete', () => {
    mount()
    type('12.5')
    edit(shown => shown.slice(0, -1))
    expect(latest).toBe(1)
    expect(notice()).toBe('')

    type('34')
    expect(latest).toBe(134)
  })

  it('takes digits again after the field is cleared or left', () => {
    mount()
    type('12.5')
    edit(() => '')
    type('7')
    expect(latest).toBe(7)

    type('.9')
    act(() => {
      input().dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(notice()).toBe('')
    type('5')
    expect(latest).toBe(75)
  })

  it('reads a pasted 1,234,567 as grouping and a pasted 12.5 as 12 with the hint', () => {
    mount()
    edit(() => '1,234,567')
    expect(latest).toBe(1234567)
    expect(notice()).toBe('')

    edit(() => '12.5')
    expect(latest).toBe(12)
    expect(notice()).toBe(AMOUNT_INTEGER_ONLY_HINT)
  })
})
