import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'

import MemberCard from './MemberCard'
import type { MemberKind } from '../../services/memberRegistry'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

Element.prototype.scrollIntoView = () => undefined

const noop = () => undefined

function card(kind: MemberKind, props: Record<string, unknown>) {
  const el = document.createElement('div')

  document.body.appendChild(el)

  const root = createRoot(el)

  act(() => {
    root.render(
      createElement(MemberCard, {
        kind,
        isMe: false,
        status: 'active',
        lastManager: false,
        busy: false,
        onRole: noop,
        onToggle: noop,
        onReset: noop,
        onMarkActive: noop,
        onRemove: noop,
        ...props
      } as never)
    )
  })

  const open = () =>
    act(() => {
      ;[...el.querySelectorAll('button')]
        .find(button => button.textContent?.startsWith('تنظیم دقیق'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

  return { el, open, text: () => el.textContent ?? '' }
}

const member = (role: string, overrides: Record<string, boolean> = {}) => ({
  email: 'a@b.c',
  role,
  overrides
})

describe('MemberCard of a shared account', () => {
  it('shows a partner with a role select, the shared switches and the Drive line', () => {
    const view = card('shared', { member: member('partner') })

    view.open()
    expect(view.text()).toContain('شریک · فعال · دسترسی ویرایش در گوگل‌درایو')
    expect(view.el.querySelector('[aria-label="نقش"]')).not.toBeNull()
    for (const label of ['ثبت هزینه و درآمد', 'ثبت تسویه', 'بودجه و دسته‌ها', 'خروجی و پشتیبان'])
      expect(view.text()).toContain(label)
    expect(view.text()).not.toContain('صدور دستی شارژ')
    expect(view.text()).toContain('دسترسی واقعی همان اشتراک گوگل‌درایو است')
    expect(view.text()).toContain('قطع دسترسی')
  })

  it('fixes the owner: no role select, no removal', () => {
    const view = card('shared', { member: member('owner'), lastManager: true })

    expect(view.el.querySelector('[aria-label="نقش"]')).toBeNull()
    expect(view.text()).toContain('مالک فایل است')
    expect(view.text()).not.toContain('قطع دسترسی')
    view.open()
    expect(view.el.querySelectorAll('button[role="switch"][disabled]').length).toBe(6)
  })

  it('offers «ارسال دوبارهٔ دعوت» only to a pending member when asked to', () => {
    expect(card('shared', { member: member('viewer'), status: 'invited' }).text()).not.toContain(
      'ارسال دوبارهٔ دعوت'
    )
    expect(
      card('shared', { member: member('viewer'), status: 'invited', onResend: noop }).text()
    ).toContain('ارسال دوبارهٔ دعوت')
    expect(card('shared', { member: member('viewer'), onResend: noop }).text()).not.toContain(
      'ارسال دوبارهٔ دعوت'
    )
  })

  it('says a viewer given a writing switch writes in Drive too', () => {
    const view = card('shared', { member: member('viewer', { settle: true }) })

    expect(view.text()).toContain('دسترسی تغییر داده‌شده')
    expect(view.text()).toContain('دسترسی ویرایش در گوگل‌درایو')
    view.open()
    expect(view.text()).toContain('دسترسی او در گوگل‌درایو هم به «ویرایش» بالا می‌رود')
  })

  it('is read-only for a partner or viewer looking at the list', () => {
    const view = card('shared', { member: member('viewer'), status: 'invited', readOnly: true })

    expect(view.el.querySelector('[aria-label="نقش"]')).toBeNull()
    expect(view.text()).not.toContain('قطع دسترسی')
    expect(view.text()).not.toContain('این عضو وارد شده است')
    view.open()
    expect(view.el.querySelectorAll('button[role="switch"]:not([disabled])').length).toBe(0)
  })
})

describe('MemberCard of a building', () => {
  it('keeps the building roles, switches and Drive line', () => {
    const view = card('building', { member: member('board', { record: true }) })

    view.open()
    expect(view.text()).toContain('عضو هیئت مدیره')
    expect(view.text()).toContain('صدور دستی شارژ')
    expect(view.text()).toContain('فقط مشاهده در گوگل‌درایو')
    expect(view.text()).toContain('فقط می‌تواند ببیند')
    expect(view.text()).not.toContain('دسترسی واقعی همان اشتراک')
  })
})
