import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ParentGrantCard from './ParentGrantCard'
import ParentRows from './ParentRows'
import type { ParentAccess } from '../../services/parentAccess'

const parents: ParentAccess[] = [
  { email: 'dad@example.com', since: '2026-11-01', status: 'active' },
  { email: 'mom@example.com', since: null, status: 'revoked' }
]

describe('the child’s «والدین من» screens', () => {
  let container: HTMLDivElement
  let root: Root

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

  const render = (node: ReturnType<typeof createElement>) => act(() => root.render(node))

  it('lists each parent with a status and offers no way to remove one', () => {
    render(createElement(ParentRows, { parents, checking: false }))

    const text = container.textContent ?? ''

    expect(text).toContain('یک والد همین حالا حساب شما را می‌بیند')
    expect(text).toContain('dad@example.com')
    expect(text).toContain('فعال')
    expect(text).toContain('دسترسی قطع شد')
    expect(text).toContain('قطع دسترسی فقط از گوگل‌درایو ممکن است')
    expect(container.querySelectorAll('button')).toHaveLength(0)
  })

  it('says so even when nobody has access yet', () => {
    render(createElement(ParentRows, { parents: [], checking: false }))

    expect(container.textContent).toContain('هیچ والدی حساب شما را نمی‌بیند')
  })

  it('explains what the parent sees and keeps «اجازه دسترسی» locked until the child agrees', () => {
    const onGrant = vi.fn()

    render(
      createElement(ParentGrantCard, {
        email: 'dad@example.com',
        onEmailChange: () => undefined,
        consent: false,
        onConsentChange: () => undefined,
        error: null,
        granting: false,
        canGrant: false,
        onGrant
      })
    )

    const text = container.textContent ?? ''
    const submit = Array.from(container.querySelectorAll('button')).find(
      item => item.textContent === 'اجازه دسترسی'
    )

    expect(text).toContain('والد می‌بیند')
    expect(text).toContain('گوگل‌درایو')
    expect(submit?.disabled).toBe(true)
    expect(container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(false)
    expect(onGrant).not.toHaveBeenCalled()
  })

  it('unlocks the button once the child consents and shows the answer under the field', () => {
    render(
      createElement(ParentGrantCard, {
        email: 'x',
        onEmailChange: () => undefined,
        consent: true,
        onConsentChange: () => undefined,
        error: 'ایمیل والد درست نیست؛ ایمیل یک حساب گوگل را وارد کنید',
        granting: false,
        canGrant: true,
        onGrant: () => undefined
      })
    )

    const submit = Array.from(container.querySelectorAll('button')).find(
      item => item.textContent === 'اجازه دسترسی'
    )

    expect(submit?.disabled).toBe(false)
    expect(container.textContent).toContain('ایمیل والد درست نیست')
  })
})
