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
      expect(workspaceRedirect(path, 'building')).toBe('/building')
    }
    expect(workspaceRedirect('/wallet', 'building')).toBe('/building')
  })

  it('sends the bank SMS page of a building to its own queue', () => {
    expect(workspaceRedirect('/bank-sms', 'building')).toBe('/building/sms')
    expect(workspaceRedirect('/building/sms', 'building')).toBeNull()
  })

  it('lets the buildings home through inside a building (the drawer switcher opens it)', () => {
    expect(workspaceRedirect('/buildings', 'building')).toBeNull()
    expect(workspaceRedirect('/buildings', 'personal')).toBeNull()
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
      expect(workspaceRedirect(path, 'building')).toBeNull()
    }
    expect(workspaceRedirect('/settings/categories', 'building')).toBeNull()
    expect(workspaceRedirect('/settings/backup', 'building')).toBeNull()
    expect(workspaceRedirect('/settings/close-year/1405', 'building')).toBeNull()
    expect(workspaceRedirect('/building/units/u1', 'building')).toBeNull()
  })

  it('sends the building pages to the personal dashboard', () => {
    for (const path of [
      '/building',
      '/building/units',
      '/building/units/u1',
      '/building/settings/lists'
    ]) {
      expect(workspaceRedirect(path, 'personal')).toBe('/')
    }
  })

  it('keeps the personal pages and the buildings home in the personal workspace', () => {
    for (const path of ['/', '/installments', '/wallet', '/buildings', '/settings']) {
      expect(workspaceRedirect(path, 'personal')).toBeNull()
    }
  })
})

describe('workspace redirect and unknown URLs', () => {
  it('leaves an unknown URL alone so it shows «صفحه پیدا نشد» in both workspaces', () => {
    expect(workspaceRedirect('/nonexistent-page', 'building')).toBeNull()
    expect(workspaceRedirect('/nonexistent-page', 'personal')).toBeNull()
    expect(workspaceRedirect('/records/xyz', 'building')).toBeNull()
  })
})
