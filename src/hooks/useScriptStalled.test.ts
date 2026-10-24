import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SCRIPT_STALL_MS, useScriptStalled } from './useScriptStalled'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root

let stalled = false

function Probe({ ready, retryKey }: { ready: boolean; retryKey: number }) {
  stalled = useScriptStalled(ready, retryKey)

  return null
}

const show = (ready: boolean, retryKey = 0) =>
  act(async () => root.render(createElement(Probe, { ready, retryKey })))

describe('useScriptStalled', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    root = createRoot(document.createElement('div'))
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('turns true only after the script has been missing for eight seconds', async () => {
    await show(false)
    expect(stalled).toBe(false)

    await act(async () => void (await vi.advanceTimersByTimeAsync(SCRIPT_STALL_MS - 1)))
    expect(stalled).toBe(false)
    await act(async () => void (await vi.advanceTimersByTimeAsync(1)))
    expect(stalled).toBe(true)
  })

  it('is true at once when the browser is offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    await show(false)

    expect(stalled).toBe(true)
  })

  it('never stalls when the script is ready, and starts waiting again after a retry', async () => {
    await show(true)
    await act(async () => void (await vi.advanceTimersByTimeAsync(SCRIPT_STALL_MS * 2)))
    expect(stalled).toBe(false)

    await show(false, 0)
    await act(async () => void (await vi.advanceTimersByTimeAsync(SCRIPT_STALL_MS)))
    expect(stalled).toBe(true)

    await show(false, 1)
    expect(stalled).toBe(false)
  })
})
