import { describe, expect, it } from 'vitest'

import { SHARED_BOTTOM_NAV_TABS, SHARED_NAV_LINKS, SHARED_TABS } from './sharedTabs'
import { BUILDING_TABS, PERSONAL_ONLY_TABS, TAB_TITLES } from './types'
import { getPathForTab, getTabFromPath, isKnownPath } from '../../routes/paths'
import { SHARED_TAB_PATHS } from '../../routes/sharedPaths'
import { WORKSPACE_HOME, workspaceRedirect } from '../../routes/workspaceRedirect'

describe('shared workspace paths', () => {
  it('maps the four shared tabs to their paths and back', () => {
    expect(getPathForTab('shared-home')).toBe('/shared')
    expect(getPathForTab('shared-records')).toBe('/shared/records')
    expect(getPathForTab('shared-settle')).toBe('/shared/settle')
    expect(getPathForTab('shared-members')).toBe('/shared/members')
    expect(getTabFromPath('/shared')).toBe('shared-home')
    expect(getTabFromPath('/shared/records')).toBe('shared-records')
    expect(getTabFromPath('/shared/settle/')).toBe('shared-settle')
    expect(getTabFromPath('/shared/members')).toBe('shared-members')
    expect(isKnownPath('/shared/xyz')).toBe(false)
  })

  it('lists exactly the shared tabs in its path table', () => {
    expect(Object.keys(SHARED_TAB_PATHS).sort()).toEqual([...SHARED_TABS].sort())
  })
})

describe('shared workspace tabs', () => {
  it('has the four tabs of the prototype, in order, on the bottom nav and in the drawer', () => {
    expect(SHARED_TABS).toEqual([
      'shared-home',
      'shared-records',
      'shared-settle',
      'shared-members'
    ])
    expect(SHARED_BOTTOM_NAV_TABS).toEqual(SHARED_TABS)
    expect(SHARED_NAV_LINKS.map(link => link.tab)).toEqual(SHARED_TABS)
    expect(SHARED_TABS.map(tab => TAB_TITLES[tab])).toEqual(['خانه', 'ثبت‌ها', 'تسویه', 'اعضا'])
  })

  it('shares no tab with the personal-only or the building sets', () => {
    for (const tab of SHARED_TABS) {
      expect(PERSONAL_ONLY_TABS).not.toContain(tab)
      expect(BUILDING_TABS).not.toContain(tab)
    }
  })

  it('gives every tab a title', () => {
    for (const tab of Object.keys(TAB_TITLES) as (keyof typeof TAB_TITLES)[]) {
      expect(TAB_TITLES[tab]).toBeTruthy()
    }
    for (const tab of SHARED_TABS) expect(TAB_TITLES[tab]).toBeTruthy()
  })
})

describe('shared workspace redirect', () => {
  it('sends the personal-only pages of a shared account to its home', () => {
    for (const path of ['/', '/wallet', '/installments', '/vehicles/v1', '/bank-sms']) {
      expect(workspaceRedirect(path, 'shared')).toBe('/shared')
    }
  })

  it('sends the building pages of a shared account to its home', () => {
    for (const path of ['/building', '/building/units/u1', '/building/settings/members']) {
      expect(workspaceRedirect(path, 'shared')).toBe('/shared')
    }
  })

  it('keeps the shared pages, settings and unknown URLs inside a shared account', () => {
    for (const path of [
      '/shared',
      '/shared/records',
      '/shared/settle',
      '/shared/members',
      '/settings',
      '/about',
      '/nonexistent-page'
    ]) {
      expect(workspaceRedirect(path, 'shared')).toBeNull()
    }
  })

  it('sends the shared pages to the home of a personal sheet or a building', () => {
    expect(workspaceRedirect('/shared/settle', 'personal')).toBe('/')
    expect(workspaceRedirect('/shared', 'personal')).toBe('/')
    expect(workspaceRedirect('/shared/members', 'building')).toBe('/building')
  })

  it('names the home of each workspace kind', () => {
    expect(WORKSPACE_HOME).toEqual({
      personal: 'dashboard',
      building: 'building-dashboard',
      shared: 'shared-home'
    })
  })
})
