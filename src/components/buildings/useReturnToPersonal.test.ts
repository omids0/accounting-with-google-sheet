import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RETURNING_MESSAGE } from './buildingBusyText'
import { useReturnToPersonal } from './useReturnToPersonal'
import { hideBusy, useBusyOverlayStore } from '../../stores/busyOverlayStore'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  switchActive: vi.fn(async (_id: string) => 'ok'),
  moveSync: vi.fn(async () => undefined),
  showError: vi.fn(),
  seen: [] as (string | null)[],
  asks: false,
  pending: null as null | (() => Promise<void>)
}))

vi.mock('react-router', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('../../services/settings', () => ({
  getSettings: () => ({ spreadsheetId: 'b1' }),
  getSpreadsheets: () => [{ id: 'p1', name: 'حسابداری · شخصی', createdAt: '' }]
}))
vi.mock('../../services/workspace', () => ({
  personalSpreadsheet: (entries: { id: string }[]) => entries[0]
}))
vi.mock('../../services/spreadsheetSetup', () => ({ switchActiveSpreadsheet: mocks.switchActive }))
vi.mock('../../services/spreadsheetSwitch', () => ({ moveSyncToSpreadsheet: mocks.moveSync }))
vi.mock('../../stores/appStore', () => ({ bumpSpreadsheetKey: vi.fn() }))
vi.mock('../../utils/toast', () => ({ showError: mocks.showError }))
vi.mock('../settings/useSheetSwitchGuard', () => ({
  useSheetSwitchGuard: (_currentId: string, onAsk?: () => void) => ({
    guard: async (run: () => Promise<void>) => {
      if (mocks.asks) {
        onAsk?.()
        mocks.pending = run
      } else await run()
    },
    modalProps: {}
  })
}))

const message = () => useBusyOverlayStore.getState().message

describe('useReturnToPersonal (busy overlay)', () => {
  let container: HTMLDivElement

  let root: Root

  let back: () => void

  const Probe = () => {
    back = useReturnToPersonal().returnToPersonal

    return null
  }

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    hideBusy()
    mocks.seen = []
    mocks.asks = false
    mocks.pending = null
    mocks.navigate.mockReset()
    mocks.switchActive.mockClear()
    mocks.showError.mockClear()
    mocks.switchActive.mockImplementation(async () => {
      mocks.seen.push(message())

      return 'ok'
    })
    container = document.createElement('div')
    root = createRoot(container)
    act(() => root.render(createElement(Probe)))
  })

  afterEach(() => {
    act(() => root.unmount())
    hideBusy()
  })

  it('says it is going back while the personal sheet opens, and waits for the dashboard', async () => {
    await act(async () => back())

    expect(mocks.seen).toEqual([RETURNING_MESSAGE])
    expect(mocks.navigate).toHaveBeenCalledWith('/')
    expect(message()).toBe(RETURNING_MESSAGE)
    expect(useBusyOverlayStore.getState().awaitingPage).toBe(true)
  })

  it('removes the overlay and shows the error when the switch fails', async () => {
    mocks.switchActive.mockRejectedValueOnce(new Error('network'))
    await act(async () => back())

    expect(message()).toBeNull()
    expect(mocks.showError).toHaveBeenCalledTimes(1)
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('shows the overlay only after the unsent-changes question is confirmed', async () => {
    mocks.asks = true
    await act(async () => back())
    expect(message()).toBeNull()
    expect(mocks.switchActive).not.toHaveBeenCalled()

    await act(() => mocks.pending!())
    expect(mocks.seen).toEqual([RETURNING_MESSAGE])
  })
})
