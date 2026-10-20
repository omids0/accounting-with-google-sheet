import { describe, expect, it } from 'vitest'

import { workspaceRedirect } from './workspaceRedirect'

describe('workspace redirect', () => {
  it('sends the personal-only pages of a building to its dashboard', () => {
    for (const path of [
      '/',
      '/installments',
      '/treasury',
      '/vehicles',
      '/vehicles/v1',
      '/timesheets'
    ]) {
      expect(workspaceRedirect(path, true)).toBe('/building')
    }
    expect(workspaceRedirect('/wallet', true)).toBe('/building')
    expect(workspaceRedirect('/buildings', true)).toBe('/building')
  })

  it('lets the shared pages through inside a building', () => {
    for (const path of [
      '/entry',
      '/records',
      '/about',
      '/search',
      '/reports/monthly',
      '/settings'
    ]) {
      expect(workspaceRedirect(path, true)).toBeNull()
    }
    expect(workspaceRedirect('/settings/categories', true)).toBeNull()
    expect(workspaceRedirect('/settings/backup', true)).toBeNull()
    expect(workspaceRedirect('/settings/close-year/1405', true)).toBeNull()
    expect(workspaceRedirect('/building/units/u1', true)).toBeNull()
  })

  it('sends the building pages to the personal dashboard', () => {
    for (const path of [
      '/building',
      '/building/units',
      '/building/units/u1',
      '/building/settings/lists'
    ]) {
      expect(workspaceRedirect(path, false)).toBe('/')
    }
  })

  it('keeps the personal pages and the buildings home in the personal workspace', () => {
    for (const path of ['/', '/installments', '/wallet', '/buildings', '/settings']) {
      expect(workspaceRedirect(path, false)).toBeNull()
    }
  })
})
