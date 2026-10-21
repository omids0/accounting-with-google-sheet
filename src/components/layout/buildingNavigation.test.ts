import { describe, expect, it } from 'vitest'

import { MENU_MORE_LINKS, buildingMenuGroups } from './navMenuGroups'
import {
  BUILDING_PARENT_TAB,
  BUILDING_TABS,
  PERSONAL_ONLY_TABS,
  TAB_TITLES,
  type Tab
} from './types'
import { visibleBuildingGroups } from './useBuildingMenuGroups'
import { getPathForTab, getTabFromPath } from '../../routes/paths'
import {
  memberHasPermission,
  parseMembers,
  type BuildingPermission
} from '../../services/buildingRoles'

const ROWS = [
  ['نقش:m@x.com', 'manager', 't'],
  ['نقش:a@x.com', 'accountant', 't'],
  ['نقش:b@x.com', 'board', 't']
]

const tabsFor = (email: string): Tab[] => {
  const members = parseMembers(ROWS)

  return visibleBuildingGroups(buildingMenuGroups, (permission: BuildingPermission) =>
    memberHasPermission(members, email, permission)
  ).flatMap(group => group.links.map(link => link.tab))
}

describe('building drawer', () => {
  it('has the four groups of the spec and no bottom-nav tabs', () => {
    expect(buildingMenuGroups.map(group => group.label)).toEqual([
      'ساختمان',
      'تعهدات',
      'بیشتر',
      'اپ'
    ])
    expect(buildingMenuGroups[0].links.map(link => link.tab)).toEqual([
      'building-dashboard',
      'building-units',
      'building-residents',
      'building-charges',
      'building-expenses',
      'building-fund'
    ])
  })

  it('shows the manager every row', () => {
    expect(tabsFor('m@x.com')).toEqual(
      buildingMenuGroups.flatMap(group => group.links.map(link => link.tab))
    )
  })

  it('drops the settings row for an accountant and settings plus bank SMS for the board', () => {
    expect(tabsFor('a@x.com')).not.toContain('building-settings')
    expect(tabsFor('a@x.com')).toContain('building-sms')
    expect(tabsFor('b@x.com')).not.toContain('building-settings')
    expect(tabsFor('b@x.com')).not.toContain('building-sms')
    expect(tabsFor('b@x.com')).toContain('building-fund')
  })
})

describe('building routes', () => {
  it('gives every building tab a title and a path that resolves back to it', () => {
    for (const tab of BUILDING_TABS) {
      expect(TAB_TITLES[tab]).toBeTruthy()
    }
    for (const tab of BUILDING_TABS.filter(item => item !== 'building-unit')) {
      expect(getTabFromPath(getPathForTab(tab))).toBe(tab)
    }
    expect(getTabFromPath(getPathForTab('buildings-home'))).toBe('buildings-home')
  })

  it('resolves one unit by its id', () => {
    expect(getPathForTab('building-unit', { unitId: 'u 1' })).toBe('/building/units/u%201')
    expect(getTabFromPath('/building/units/u%201')).toBe('building-unit')
    expect(getPathForTab('building-unit')).toBe('/building/units')
    expect(getTabFromPath('/building/units')).toBe('building-units')
  })

  it('keeps the settings sub-pages out of the app settings paths', () => {
    expect(getTabFromPath('/building/settings/members')).toBe('building-members')
    expect(getTabFromPath('/building/settings/lists')).toBe('building-lists')
    expect(getTabFromPath('/building/settings')).toBe('building-settings')
    expect(getTabFromPath('/settings')).toBe('dashboard')
  })

  it('sends sub-pages back to their parent', () => {
    expect(BUILDING_PARENT_TAB['building-unit']).toBe('building-units')
    expect(BUILDING_PARENT_TAB['building-members']).toBe('building-settings')
  })

  it('hides installments, treasury, vehicles and timesheets inside a building', () => {
    for (const tab of ['installments', 'treasury', 'vehicle-service', 'timesheets'] as Tab[]) {
      expect(PERSONAL_ONLY_TABS).toContain(tab)
    }
    for (const tab of ['entry', 'records', 'about', 'search'] as Tab[]) {
      expect(PERSONAL_ONLY_TABS).not.toContain(tab)
    }
    expect(BUILDING_TABS.some(tab => PERSONAL_ONLY_TABS.includes(tab))).toBe(false)
  })
})

describe('personal drawer', () => {
  it('links the building manager home from the more group', () => {
    expect(MENU_MORE_LINKS.map(link => link.tab)).toContain('buildings-home')
  })
})
