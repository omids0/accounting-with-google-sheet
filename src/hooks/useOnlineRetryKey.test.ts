import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useOnlineRetryKey } from './useOnlineRetryKey'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root

let key = -1

function Probe() {
  key = useOnlineRetryKey()

  return null
}

describe('useOnlineRetryKey', () => {
  beforeEach(async () => {
    root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Probe)))
  })

  afterEach(() => act(() => root.unmount()))

  it('goes up each time the browser comes back online, so a failed download is tried again', async () => {
    expect(key).toBe(0)

    await act(async () => void window.dispatchEvent(new Event('online')))
    await act(async () => void window.dispatchEvent(new Event('online')))

    expect(key).toBe(2)
  })

  it('stops listening when the page unmounts', async () => {
    act(() => root.unmount())
    root = createRoot(document.createElement('div'))

    window.dispatchEvent(new Event('online'))

    expect(key).toBe(0)
  })
})
