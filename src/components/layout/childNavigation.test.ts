import { describe, expect, it } from 'vitest'

import {
  CHILD_BOTTOM_NAV_TABS,
  CHILD_NAV_LINKS,
  CHILD_TABS,
  CHILD_TAB_TITLES,
  FAMILY_TABS
} from './childTabs'
import { MENU_MORE_LINKS } from './navMenuGroups'
import { SHARED_TABS } from './sharedTabs'
import { BUILDING_TABS, PERSONAL_ONLY_TABS, TAB_TITLES } from './types'
import { CHILD_TAB_PATHS, childRecordsPath } from '../../routes/childPaths'
import { getPathForTab, getTabFromPath, isKnownPath } from '../../routes/paths'
import { WORKSPACE_HOME, workspaceRedirect } from '../../routes/workspaceRedirect'

describe('child workspace paths', () => {
  it('maps the five tabs to their paths and back', () => {
    expect(getPathForTab('child-home')).toBe('/child')
    expect(getPathForTab('child-records')).toBe('/child/records')
    expect(getPathForTab('child-categories')).toBe('/child/categories')
    expect(getPathForTab('children-home')).toBe('/children')
    expect(getPathForTab('parents-home')).toBe('/parents')
    expect(getTabFromPath('/child/records/')).toBe('child-records')
    expect(getTabFromPath('/Parents')).toBe('parents-home')
    expect(isKnownPath('/child/xyz')).toBe(false)
  })

  it('lists exactly the child and family tabs in its path table', () => {
    expect(Object.keys(CHILD_TAB_PATHS).sort()).toEqual([...CHILD_TABS, ...FAMILY_TABS].sort())
  })

  it('opens the record list on a category through a query', () => {
    expect(childRecordsPath()).toBe('/child/records')
    expect(childRecordsPath('خوراک')).toBe(`/child/records?category=${encodeURIComponent('خوراک')}`)
  })
})

describe('child workspace tabs and menus', () => {
  it('gives the account three read-only tabs on the bottom bar and in the drawer', () => {
    expect(CHILD_TABS).toEqual(['child-home', 'child-records', 'child-categories'])
    expect(CHILD_BOTTOM_NAV_TABS).toEqual(CHILD_TABS)
    expect(CHILD_NAV_LINKS.map(link => link.tab)).toEqual(CHILD_TABS)
    expect(CHILD_TABS.map(tab => TAB_TITLES[tab])).toEqual(['خلاصه', 'تراکنش‌ها', 'دسته‌بندی‌ها'])
  })

  it('shares no tab with the other workspaces and titles every tab', () => {
    for (const tab of [...CHILD_TABS, ...FAMILY_TABS]) {
      expect(SHARED_TABS).not.toContain(tab)
      expect(BUILDING_TABS).not.toContain(tab)
      expect(PERSONAL_ONLY_TABS).not.toContain(tab)
      expect(TAB_TITLES[tab]).toBe(CHILD_TAB_TITLES[tab as keyof typeof CHILD_TAB_TITLES])
    }
  })

  it('puts «فرزندان من» and «والدین من» in the personal menu next to «فضاهای من»', () => {
    const tabs = MENU_MORE_LINKS.map(link => link.tab)

    expect(tabs).toEqual(
      expect.arrayContaining(['buildings-home', 'children-home', 'parents-home'])
    )
    expect(tabs.indexOf('children-home')).toBe(tabs.indexOf('buildings-home') + 1)
  })

  it('has no menu row for a write page inside the child drawer', () => {
    for (const link of CHILD_NAV_LINKS) expect(PERSONAL_ONLY_TABS).not.toContain(link.tab)
    expect(CHILD_NAV_LINKS.map(link => link.tab)).not.toContain('entry')
  })
})

describe('child workspace redirect', () => {
  it('sends every page that is not the child’s own to the child home', () => {
    for (const path of [
      '/',
      '/wallet',
      '/entry',
      '/records',
      '/installments',
      '/bank-sms',
      '/search',
      '/reports/monthly',
      '/building',
      '/shared',
      '/buildings',
      '/children',
      '/parents',
      '/settings',
      '/settings/backup',
      '/settings/categories',
      '/settings/reminders',
      '/settings/activity'
    ]) {
      expect(workspaceRedirect(path, 'child')).toBe('/child')
    }
  })

  it('keeps the three child pages, «درباره» and unknown URLs', () => {
    for (const path of ['/child', '/child/records', '/child/categories', '/about']) {
      expect(workspaceRedirect(path, 'child')).toBeNull()
    }
    expect(workspaceRedirect('/nonexistent-page', 'child')).toBeNull()
  })

  it('opens on the month summary', () => {
    expect(WORKSPACE_HOME.child).toBe('child-home')
  })

  it('sends the child pages of every other workspace to its own home', () => {
    for (const path of ['/child', '/child/records', '/child/categories']) {
      expect(workspaceRedirect(path, 'personal')).toBe('/')
      expect(workspaceRedirect(path, 'building')).toBe('/building')
      expect(workspaceRedirect(path, 'shared')).toBe('/shared')
    }
  })

  it('keeps «فرزندان من» and «والدین من» in the personal books only', () => {
    for (const path of ['/children', '/parents']) {
      expect(workspaceRedirect(path, 'personal')).toBeNull()
      expect(workspaceRedirect(path, 'building')).toBe('/building')
      expect(workspaceRedirect(path, 'shared')).toBe('/shared')
    }
  })
})
