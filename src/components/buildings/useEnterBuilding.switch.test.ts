import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useEnterBuilding } from './useEnterBuilding'

const mocks = vi.hoisted(() => ({
  activeId: 'b1',
  buildings: ['b1', 'b2'],
  navigate: vi.fn(),
  switchActive: vi.fn(async () => 'ok'),
  moveSync: vi.fn(async () => undefined),
  remember: vi.fn(),
  bump: vi.fn(),
  guarded: [] as string[]
}))

vi.mock('react-router', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('../../services/settings', () => ({
  getSettings: () => ({ spreadsheetId: mocks.activeId })
}))
vi.mock('../../services/spreadsheetSetup', () => ({ switchActiveSpreadsheet: mocks.switchActive }))
vi.mock('../../services/spreadsheetSwitch', () => ({ moveSyncToSpreadsheet: mocks.moveSync }))
vi.mock('../../services/buildingJourney', () => ({
  isJourneyUnfinished: () => false,
  readJourney: () => null
}))
vi.mock('../../services/workspace', () => ({
  getWorkspaceType: (id: string) => (mocks.buildings.includes(id) ? 'building' : 'personal'),
  rememberPersonalSheet: mocks.remember
}))
vi.mock('../../stores/appStore', () => ({ bumpSpreadsheetKey: mocks.bump }))
vi.mock('../settings/useSheetSwitchGuard', () => ({
  useSheetSwitchGuard: (currentId: string) => ({
    guard: async (run: () => Promise<void>) => {
      mocks.guarded.push(currentId)
      await run()
    },
    modalProps: {}
  })
}))

describe('useEnterBuilding (switching between buildings)', () => {
  let container: HTMLDivElement

  let root: Root

  const done = vi.fn()

  let enter: ReturnType<typeof useEnterBuilding>['enter']

  const Probe = () => {
    enter = useEnterBuilding(done).enter

    return null
  }

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    mocks.activeId = 'b1'
    mocks.guarded = []
    for (const mock of [mocks.navigate, mocks.switchActive, mocks.moveSync, mocks.remember, done]) {
      mock.mockClear()
    }
    container = document.createElement('div')
    root = createRoot(container)
    act(() => root.render(createElement(Probe)))
  })

  afterEach(() => {
    act(() => root.unmount())
  })

  it('switches from one building to another by id and opens its dashboard', async () => {
    await act(() => enter('b2'))

    expect(mocks.guarded).toEqual(['b1'])
    expect(mocks.switchActive).toHaveBeenCalledWith('b2')
    expect(mocks.moveSync).toHaveBeenCalledWith('b1', 'b2')
    expect(mocks.navigate).toHaveBeenCalledWith('/building')
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('keeps the remembered personal sheet when leaving a building', async () => {
    await act(() => enter('b2'))

    expect(mocks.remember).not.toHaveBeenCalled()
  })

  it('remembers the personal sheet when entering from the personal workspace', async () => {
    mocks.activeId = 'p1'
    act(() => root.render(createElement(Probe)))
    await act(() => enter('b2'))

    expect(mocks.remember).toHaveBeenCalledWith('p1')
    expect(mocks.switchActive).toHaveBeenCalledWith('b2')
  })

  it('only opens the dashboard when the building is already the open one', async () => {
    await act(() => enter('b1'))

    expect(mocks.switchActive).not.toHaveBeenCalled()
    expect(mocks.guarded).toEqual([])
    expect(mocks.navigate).toHaveBeenCalledWith('/building')
    expect(done).toHaveBeenCalledTimes(1)
  })
})
