import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import LayoutBuildingMenuNav from './LayoutBuildingMenuNav'
import { buildingMenuGroups } from './navMenuGroups'
import type { SpreadsheetEntry } from '../../types'

const mocks = vi.hoisted(() => ({
  enter: vi.fn(),
  returnToPersonal: vi.fn(),
  activeId: 'b1',
  entries: [] as SpreadsheetEntry[]
}))

vi.mock('../buildings/useEnterBuilding', () => ({
  useEnterBuilding: () => ({ enter: mocks.enter, modalProps: {} })
}))
vi.mock('../buildings/useReturnToPersonal', () => ({
  useReturnToPersonal: () => ({ returnToPersonal: mocks.returnToPersonal, modalProps: {} })
}))
vi.mock('./useBuildingMenuGroups', () => ({ useBuildingMenuGroups: () => buildingMenuGroups }))
vi.mock('./LayoutUpdateItem', () => ({ default: () => null }))
vi.mock('../settings/SheetSwitchConfirmModal', () => ({ default: () => null }))
vi.mock('../../services/settings', () => ({
  getSettings: () => ({ spreadsheetId: mocks.activeId }),
  getSpreadsheets: () => mocks.entries
}))

const building = (id: string, name: string, extra: Partial<SpreadsheetEntry> = {}) =>
  ({ id, name, createdAt: 't', kind: 'building', ...extra } as SpreadsheetEntry)

describe('LayoutBuildingMenuNav', () => {
  let container: HTMLDivElement

  let root: Root

  const render = () =>
    act(() =>
      root.render(
        createElement(
          MemoryRouter,
          null,
          createElement(LayoutBuildingMenuNav, {
            tab: 'building-dashboard',
            showSettings: false,
            onTabChange: vi.fn(),
            onCloseMenu: vi.fn()
          })
        )
      )
    )

  const labels = () =>
    [...container.querySelectorAll('button, a')].map(node => node.textContent?.trim() ?? '')

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    mocks.activeId = 'b1'
    mocks.entries = [
      { id: 'p1', name: 'حسابداری · شخصی', createdAt: 't' },
      building('b1', 'حسابداری · ساختمان برج آبی'),
      building('b2', 'حسابداری · ساختمان نیلوفر'),
      building('b3', 'حسابداری · ساختمان قدیمی', { active: false })
    ]
    mocks.enter.mockReset()
    mocks.returnToPersonal.mockReset()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('puts the return row first, then the switcher, then the building groups', () => {
    render()

    const rows = labels()

    expect(rows[0]).toBe('برگشت به حساب شخصی')
    expect(rows.filter(label => label.includes('برگشت به حساب شخصی'))).toHaveLength(1)
    expect(rows.slice(1, 4)).toEqual([
      expect.stringContaining('ساختمان برج آبی'),
      'ساختمان نیلوفر',
      'همهٔ ساختمان‌ها…'
    ])
    expect(rows.length).toBeGreaterThan(4)
  })

  it('lists the buildings of the registry, archived ones left out, the open one marked', () => {
    render()

    const switcher = container.querySelector('[role="group"]') as HTMLElement

    expect(switcher.textContent).not.toContain('قدیمی')
    expect(switcher.querySelector('[aria-current="true"]')?.textContent).toContain('برج آبی')
    expect(switcher.querySelectorAll('[aria-current="true"]')).toHaveLength(1)
  })

  it('switches to the tapped building and leaves the return row alone', () => {
    render()

    const other = [...container.querySelectorAll('button')].find(node =>
      node.textContent?.includes('نیلوفر')
    )

    act(() => other?.click())

    expect(mocks.enter).toHaveBeenCalledWith('b2')
    expect(mocks.returnToPersonal).not.toHaveBeenCalled()
  })

  it('returns to the personal books from the top row', () => {
    render()

    act(() => container.querySelector('button')?.click())

    expect(mocks.returnToPersonal).toHaveBeenCalledTimes(1)
    expect(mocks.enter).not.toHaveBeenCalled()
  })

  it('opens the buildings home from the last switcher row', () => {
    render()

    const all = [...container.querySelectorAll('a')].find(node =>
      node.textContent?.includes('همهٔ ساختمان‌ها')
    )

    expect(all?.getAttribute('href')).toBe('/buildings')
  })

  it('folds past five buildings and unfolds on tap', () => {
    mocks.entries = Array.from({ length: 7 }, (_, index) =>
      building(`b${index + 1}`, `حسابداری · ساختمان ${index + 1}`)
    )
    render()

    const nameRows = () => labels().filter(label => /^ساختمان \d/.test(label))

    expect(nameRows()).toHaveLength(1)

    act(() =>
      [...container.querySelectorAll('button')]
        .find(node => node.getAttribute('aria-expanded') === 'false')
        ?.click()
    )
    expect(nameRows()).toHaveLength(7)
  })
})
