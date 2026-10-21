import { describe, expect, it } from 'vitest'

import {
  BUILDING_ALL_LINK,
  buildingSwitchRows,
  isSwitcherCollapsible,
  SWITCHER_COLLAPSE_AFTER
} from './buildingSwitcher'
import { BUILDING_TABS, PERSONAL_ONLY_TABS } from './types'
import type { SpreadsheetEntry } from '../../types'

const entry = (
  id: string,
  name: string,
  extra: Partial<SpreadsheetEntry> = {}
): SpreadsheetEntry => ({ id, name, createdAt: '2026-01-01', ...extra })

const REGISTRY: SpreadsheetEntry[] = [
  entry('p1', 'حسابداری · شخصی'),
  entry('b1', 'حسابداری · ساختمان برج آبی', { kind: 'building' }),
  entry('b2', 'حسابداری · ساختمان نیلوفر', { kind: 'building' }),
  entry('b3', 'حسابداری · ساختمان قدیمی', { kind: 'building', active: false })
]

const many = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    entry(`b${index}`, `حسابداری · ساختمان ${index}`, { kind: 'building' })
  )

describe('buildingSwitchRows', () => {
  it('lists the registered buildings without the personal sheet and without archived ones', () => {
    expect(buildingSwitchRows(REGISTRY, 'b1').map(row => row.id)).toEqual(['b1', 'b2'])
  })

  it('drops the file prefix from the label', () => {
    expect(buildingSwitchRows(REGISTRY, 'b1').map(row => row.label)).toEqual([
      'ساختمان برج آبی',
      'ساختمان نیلوفر'
    ])
  })

  it('marks only the open building as current', () => {
    expect(buildingSwitchRows(REGISTRY, 'b2').map(row => row.current)).toEqual([false, true])
  })

  it('still shows a single building, so the manager sees where they are', () => {
    expect(buildingSwitchRows(REGISTRY.slice(0, 2), 'b1')).toEqual([
      { id: 'b1', label: 'ساختمان برج آبی', current: true }
    ])
  })

  it('folds only past five buildings', () => {
    const at = (count: number) => buildingSwitchRows(many(count), 'b0')

    expect(isSwitcherCollapsible(at(SWITCHER_COLLAPSE_AFTER))).toBe(false)
    expect(isSwitcherCollapsible(at(SWITCHER_COLLAPSE_AFTER + 1))).toBe(true)
  })
})

describe('the building list page inside a building', () => {
  it('is reachable from the switcher and is not a personal-only page', () => {
    expect(BUILDING_ALL_LINK.tab).toBe('buildings-home')
    expect(PERSONAL_ONLY_TABS).not.toContain('buildings-home')
    expect(BUILDING_TABS).not.toContain('buildings-home')
  })
})
