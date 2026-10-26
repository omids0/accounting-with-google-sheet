import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SharedMembersPage from './SharedMembersPage'
import { getDefaultSettings, saveSettings } from '../../services/settings'
import { setSheetAllRows } from '../../services/spreadsheetStore'
import { setWorkspaceType } from '../../services/workspace'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

Element.prototype.scrollIntoView = () => undefined

const user = vi.hoisted(() => ({ email: 'owner@x.com' }))

vi.mock('../../services/auth', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserEmail: () => user.email,
  getUserName: () => 'امید'
}))

const HEADER = ['کلید', 'مقدار', 'زمان ثبت']

function mount(props: Record<string, unknown> = {}) {
  const el = document.createElement('div')

  document.body.appendChild(el)
  act(() => {
    createRoot(el).render(createElement(SharedMembersPage, props))
  })

  return el
}

beforeEach(() => {
  document.body.innerHTML = ''
  saveSettings({ ...getDefaultSettings(), spreadsheetId: 's1' })
  setWorkspaceType('s1', 'shared')
  setSheetAllRows('s1', 'تنظیمات دوره', [
    HEADER,
    ['نقش:owner@x.com', 'owner', 't'],
    ['نقش:partner@x.com', 'partner', 't'],
    ['نقش:viewer@x.com', 'viewer', 't']
  ])
})

describe('SharedMembersPage', () => {
  it('shows the owner their role, every member, «+ دعوت» and no «ترک این فضا»', () => {
    user.email = 'owner@x.com'

    const text = mount().textContent ?? ''

    expect(text).toContain('نقش شما: مالک')
    expect(text).toContain('partner@x.com')
    expect(text).toContain('viewer@x.com')
    expect(text).toContain('+ دعوت')
    expect(text).not.toContain('ترک این فضا')
  })

  it('shows a partner the list read-only with «ترک این فضا» and the safety slot', () => {
    user.email = 'partner@x.com'

    const el = mount({ safety: createElement('p', null, 'ایمنی داده') })

    const text = el.textContent ?? ''

    expect(text).toContain('نقش شما: شریک')
    expect(text).toContain('owner@x.com')
    expect(text).not.toContain('+ دعوت')
    expect(text).not.toContain('قطع دسترسی')
    expect(text).toContain('ایمنی داده')
    expect(text).toContain('ترک این فضا')
  })

  it('asks before leaving and hands the confirmed leave to the caller', () => {
    user.email = 'viewer@x.com'

    const onLeave = vi.fn()

    const el = mount({ onLeave })

    const click = (label: string, scope: ParentNode = document) =>
      act(() => {
        ;[...scope.querySelectorAll('button')]
          .find(button => button.textContent?.trim() === label)
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })

    click('ترک این فضا', el)
    expect(onLeave).not.toHaveBeenCalled()
    click('ترک فضا')
    expect(onLeave).toHaveBeenCalledTimes(1)
  })
})
