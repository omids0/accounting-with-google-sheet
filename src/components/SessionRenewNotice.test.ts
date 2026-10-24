import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SessionRenewNotice from './SessionRenewNotice'
import { recordRefreshOutcome, resetRefreshStatus } from '../services/refreshStatus'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root

let host: HTMLElement

const failThreeTimes = () =>
  act(() => {
    for (let i = 0; i < 3; i++) recordRefreshOutcome('transient')
  })

describe('SessionRenewNotice', () => {
  beforeEach(async () => {
    resetRefreshStatus()
    host = document.createElement('div')
    root = createRoot(host)
    await act(async () => root.render(createElement(SessionRenewNotice)))
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.restoreAllMocks()
  })

  it('stays out of the way until renewal has failed three times in a row', () => {
    expect(host.textContent).toBe('')

    act(() => {
      recordRefreshOutcome('transient')
      recordRefreshOutcome('transient')
    })
    expect(host.textContent).toBe('')
  })

  it('says «نشست تمدید نشد؛ آفلاین» when the browser is offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    failThreeTimes()

    expect(host.textContent).toContain('نشست تمدید نشد؛ آفلاین')
    expect(host.querySelector('[role="status"]')).not.toBeNull()
  })

  it('says Google did not answer when online, and goes away with the next success', () => {
    failThreeTimes()
    expect(host.textContent).toContain('نشست تمدید نشد')
    expect(host.textContent).not.toContain('آفلاین')

    act(() => recordRefreshOutcome('ok'))
    expect(host.textContent).toBe('')
  })
})
