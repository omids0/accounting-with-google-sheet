import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useEnterWorkspace } from './useEnterWorkspace'
import { useEnterBuilding } from '../components/buildings/useEnterBuilding'

const mocks = vi.hoisted(() => ({
  activeId: 'p1',
  types: { b1: 'building', s1: 'shared' } as Record<string, string>,
  navigate: vi.fn(),
  switchActive: vi.fn(async () => 'ok'),
  moveSync: vi.fn(async () => undefined),
  remember: vi.fn()
}))

vi.mock('react-router', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('../services/settings', () => ({
  getSettings: () => ({ spreadsheetId: mocks.activeId })
}))
vi.mock('../services/spreadsheetSetup', () => ({ switchActiveSpreadsheet: mocks.switchActive }))
vi.mock('../services/spreadsheetSwitch', () => ({ moveSyncToSpreadsheet: mocks.moveSync }))
vi.mock('../services/buildingJourney', () => ({
  isJourneyUnfinished: () => false,
  readJourney: () => null
}))
vi.mock('../services/workspace', () => ({
  getWorkspaceType: (id: string) => mocks.types[id] ?? 'personal',
  rememberPersonalSheet: mocks.remember
}))
vi.mock('../stores/appStore', () => ({ bumpSpreadsheetKey: vi.fn() }))
vi.mock('../components/settings/useSheetSwitchGuard', () => ({
  useSheetSwitchGuard: () => ({
    guard: async (run: () => Promise<void>) => run(),
    modalProps: {}
  })
}))

type Enter = (id: string) => Promise<boolean>

describe('useEnterWorkspace', () => {
  let container: HTMLDivElement

  let root: Root

  const done = vi.fn()

  const enters: { shared?: Enter; building?: Enter } = {}

  const Probe = () => {
    enters.shared = useEnterWorkspace(done).enter
    enters.building = useEnterBuilding(done).enter

    return null
  }

  const mount = () => act(() => root.render(createElement(Probe)))

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    mocks.activeId = 'p1'
    for (const mock of [mocks.navigate, mocks.switchActive, mocks.moveSync, mocks.remember, done]) {
      mock.mockClear()
    }
    container = document.createElement('div')
    root = createRoot(container)
    mount()
  })

  afterEach(() => {
    act(() => root.unmount())
  })

  it('enters the shared account from the personal sheet and opens its home', async () => {
    await act(() => enters.shared?.('s1'))

    expect(mocks.remember).toHaveBeenCalledWith('p1')
    expect(mocks.switchActive).toHaveBeenCalledWith('s1')
    expect(mocks.moveSync).toHaveBeenCalledWith('p1', 's1')
    expect(mocks.navigate).toHaveBeenCalledTimes(1)
    expect(mocks.navigate).toHaveBeenCalledWith('/shared')
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('does not remember a building as the personal sheet when entering the shared account', async () => {
    mocks.activeId = 'b1'
    mount()
    await act(() => enters.shared?.('s1'))

    expect(mocks.remember).not.toHaveBeenCalled()
    // A building page is left to the route guard: no step through another workspace's home.
    expect(mocks.navigate).toHaveBeenCalledTimes(1)
    expect(mocks.navigate).toHaveBeenCalledWith('/shared')
  })

  it('does not remember the shared account as the personal sheet when entering a building', async () => {
    mocks.activeId = 's1'
    mount()
    await act(() => enters.building?.('b1'))

    expect(mocks.remember).not.toHaveBeenCalled()
    expect(mocks.switchActive).toHaveBeenCalledWith('b1')
    expect(mocks.navigate).toHaveBeenCalledTimes(1)
    expect(mocks.navigate).toHaveBeenCalledWith('/building')
  })

  it('only opens the home when the shared account is already the open sheet', async () => {
    mocks.activeId = 's1'
    mount()
    await act(() => enters.shared?.('s1'))

    expect(mocks.switchActive).not.toHaveBeenCalled()
    expect(mocks.navigate).toHaveBeenCalledWith('/shared')
    expect(done).toHaveBeenCalledTimes(1)
  })
})
