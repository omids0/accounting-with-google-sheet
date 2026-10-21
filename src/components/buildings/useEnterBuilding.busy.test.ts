import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useEnterBuilding } from './useEnterBuilding'
import { hideBusy, useBusyOverlayStore } from '../../stores/busyOverlayStore'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  switchActive: vi.fn(async (_id: string) => 'ok'),
  moveSync: vi.fn(async () => undefined),
  showError: vi.fn(),
  /** The messages the overlay had while the switch ran. */
  seen: [] as (string | null)[],
  /** When set, the sheet-switch guard asks first and runs the switch once `confirm()` is called. */
  asks: false,
  pending: null as null | (() => Promise<void>)
}))

vi.mock('react-router', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('../../services/settings', () => ({
  getSettings: () => ({
    spreadsheetId: 'b1',
    spreadsheets: [{ id: 'b2', name: 'حسابداری · ساختمان برج آبی' }]
  })
}))
vi.mock('../../services/spreadsheetSetup', () => ({ switchActiveSpreadsheet: mocks.switchActive }))
vi.mock('../../services/spreadsheetSwitch', () => ({ moveSyncToSpreadsheet: mocks.moveSync }))
vi.mock('../../services/buildingJourney', () => ({
  isJourneyUnfinished: () => false,
  readJourney: () => null
}))
vi.mock('../../services/workspace', () => ({
  getWorkspaceType: () => 'building',
  rememberPersonalSheet: vi.fn()
}))
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

describe('useEnterBuilding (busy overlay)', () => {
  let container: HTMLDivElement

  let root: Root

  let enter: ReturnType<typeof useEnterBuilding>['enter']

  const Probe = () => {
    enter = useEnterBuilding().enter

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
    mocks.moveSync.mockImplementation(async () => {
      mocks.seen.push(message())
    })
    container = document.createElement('div')
    root = createRoot(container)
    act(() => root.render(createElement(Probe)))
  })

  afterEach(() => {
    act(() => root.unmount())
    hideBusy()
  })

  it('says which building is opening while the switch and the first download run', async () => {
    await act(() => enter('b2'))

    expect(mocks.seen).toEqual([
      'در حال ورود به «ساختمان برج آبی»…',
      'در حال ورود به «ساختمان برج آبی»…'
    ])
  })

  it('keeps the overlay up after the page opened, until the page reports it is ready', async () => {
    await act(() => enter('b2'))

    expect(mocks.navigate).toHaveBeenCalledWith('/building')
    expect(message()).not.toBeNull()
    expect(useBusyOverlayStore.getState().awaitingPage).toBe(true)
  })

  it('takes the text of the caller (the creation journey has its own)', async () => {
    await act(() => enter('b2', 'building-setup', 'در حال آماده‌سازی…'))

    expect(mocks.seen[0]).toBe('در حال آماده‌سازی…')
  })

  it('removes the overlay and shows the error when the switch fails', async () => {
    mocks.switchActive.mockRejectedValueOnce(new Error('network'))

    let opened = true

    await act(async () => {
      opened = await enter('b2')
    })

    expect(opened).toBe(false)
    expect(message()).toBeNull()
    expect(mocks.showError).toHaveBeenCalledTimes(1)
  })

  it('shows no overlay while the unsent-changes question is open, only after the confirm', async () => {
    mocks.asks = true
    await act(() => enter('b2'))

    expect(message()).toBeNull()
    expect(mocks.switchActive).not.toHaveBeenCalled()

    await act(() => mocks.pending!())
    expect(mocks.seen[0]).toBe('در حال ورود به «ساختمان برج آبی»…')
  })

  it('makes room for the question when the overlay of the journey is already up', async () => {
    useBusyOverlayStore.setState({ message: 'در حال ساخت فایل…' })
    mocks.asks = true
    await act(() => enter('b2', 'building-setup'))

    expect(message()).toBeNull()
  })

  it('does nothing to the overlay when the building is already the open one', async () => {
    await act(() => enter('b1'))

    expect(message()).toBeNull()
    expect(mocks.switchActive).not.toHaveBeenCalled()
  })
})
