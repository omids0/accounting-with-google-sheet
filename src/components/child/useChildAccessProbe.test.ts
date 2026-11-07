import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const probe = vi.hoisted(() => vi.fn(async () => 'ok'))

vi.mock('../../services/childAccessLost', () => ({ probeChildAccess: probe }))

import { CHILD_PROBE_INTERVAL_MS, useChildAccessProbe } from './useChildAccessProbe'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root

function Probe({ id }: { id: string }) {
  useChildAccessProbe(id)

  return null
}

beforeEach(async () => {
  vi.useFakeTimers()
  probe.mockClear()
  root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Probe, { id: 'CH' })))
})

afterEach(() => {
  act(() => root.unmount())
  vi.useRealTimers()
})

describe('useChildAccessProbe', () => {
  it('probes on opening, every minute and when the app comes back to the front', async () => {
    expect(probe).toHaveBeenCalledTimes(1)
    expect(probe).toHaveBeenCalledWith('CH')

    await act(async () => void vi.advanceTimersByTime(CHILD_PROBE_INTERVAL_MS))
    expect(probe).toHaveBeenCalledTimes(2)

    await act(async () => void window.dispatchEvent(new Event('focus')))
    expect(probe).toHaveBeenCalledTimes(3)

    await act(async () => void document.dispatchEvent(new Event('visibilitychange')))
    expect(probe).toHaveBeenCalledTimes(4)
  })

  it('stops when the page is left', async () => {
    act(() => root.unmount())
    await act(async () => void vi.advanceTimersByTime(CHILD_PROBE_INTERVAL_MS * 3))
    window.dispatchEvent(new Event('focus'))
    expect(probe).toHaveBeenCalledTimes(1)
    root = createRoot(document.createElement('div'))
  })
})
