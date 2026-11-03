import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SharedSpaceCard from './SharedSpaceCard'
import { getDefaultSettings, saveSettings } from '../../services/settings'
import { SHARED_NO_ACCESS_MESSAGE } from '../../services/sharedAccessLost'
import type { SpreadsheetEntry } from '../../types'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../services/auth', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserEmail: () => 'partner@x.com'
}))

const account: SpreadsheetEntry = {
  id: 's1',
  name: 'حسابداری · مشترک خانه',
  createdAt: '',
  kind: 'shared'
}

const handlers = {
  onStart: vi.fn(),
  onConnect: vi.fn(),
  onOpen: vi.fn(),
  onOff: vi.fn(),
  onShowAgain: vi.fn(),
  onReconnect: vi.fn(),
  onForget: vi.fn()
}

function mount(props: Record<string, unknown>) {
  const el = document.createElement('div')

  document.body.appendChild(el)
  act(() => {
    createRoot(el).render(
      createElement(SharedSpaceCard, { account, members: null, ...handlers, ...props })
    )
  })

  return el
}

const buttons = (el: HTMLElement) =>
  [...el.querySelectorAll('button')].map(button => button.textContent?.trim())

beforeEach(() => {
  document.body.innerHTML = ''
  Object.values(handlers).forEach(handler => handler.mockClear())
  saveSettings({ ...getDefaultSettings(), spreadsheetId: 'p1' })
})

describe('SharedSpaceCard', () => {
  it('shows only «باز کردن» to a partner of a reachable account', () => {
    const el = mount({ members: [{ email: 'partner@x.com', role: 'partner' }] })

    expect(buttons(el)).toEqual(['باز کردن'])
    expect(el.textContent).not.toContain(SHARED_NO_ACCESS_MESSAGE)
  })

  it('says it plainly and offers «اتصال دوباره» and «پاک کردن از این دستگاه» when access is lost', () => {
    const el = mount({ state: 'denied' })

    expect(buttons(el)).toEqual(['اتصال دوباره', 'پاک کردن از این دستگاه'])
    expect(el.textContent).toContain(SHARED_NO_ACCESS_MESSAGE)
    expect(el.textContent).toContain('دسترسی ندارید')
    expect(el.textContent).not.toContain('نقش شما')
  })

  it('wires the two actions', () => {
    const el = mount({ state: 'denied' })

    const [reconnect, forget] = [...el.querySelectorAll('button')]

    act(() => reconnect.click())
    act(() => forget.click())

    expect(handlers.onReconnect).toHaveBeenCalledTimes(1)
    expect(handlers.onForget).toHaveBeenCalledTimes(1)
    expect(handlers.onOpen).not.toHaveBeenCalled()
  })

  it('offers «راه‌اندازی» again once the account is gone from this device', () => {
    const el = mount({ account: null })

    expect(buttons(el)).toEqual(['راه‌اندازی', 'اتصال به حساب مشترک'])
  })
})
