import { beforeEach, describe, expect, it } from 'vitest'

import { launchTarget } from './launchAction'
import { repairLegacyRows } from './legacyRowRepair'
import { assertSharedCan, sharedCan, sharedCanFor } from './sharedCan'
import { setItem, STORAGE_KEYS } from './storage'
import { setWorkspaceType } from './workspace'
import { workspaceRedirect } from '../routes/workspaceRedirect'

describe('sharedCanFor: the role table of a shared account', () => {
  it('lets the owner do everything', () => {
    for (const permission of [
      'record',
      'editOthers',
      'settle',
      'budget',
      'members',
      'export'
    ] as const) {
      expect(sharedCanFor('shared', 'owner', permission)).toBe(true)
    }
  })

  it('lets the partner write but not edit others or manage members', () => {
    expect(sharedCanFor('shared', 'partner', 'record')).toBe(true)
    expect(sharedCanFor('shared', 'partner', 'settle')).toBe(true)
    expect(sharedCanFor('shared', 'partner', 'budget')).toBe(true)
    expect(sharedCanFor('shared', 'partner', 'export')).toBe(true)
    expect(sharedCanFor('shared', 'partner', 'editOthers')).toBe(false)
    expect(sharedCanFor('shared', 'partner', 'members')).toBe(false)
  })

  it('never lets a viewer, or someone without a role, write', () => {
    for (const permission of [
      'record',
      'editOthers',
      'settle',
      'budget',
      'members',
      'export'
    ] as const) {
      expect(sharedCanFor('shared', 'viewer', permission)).toBe(false)
      expect(sharedCanFor('shared', null, permission)).toBe(false)
    }
  })

  it('applies a member override over the role default', () => {
    expect(sharedCanFor('shared', 'partner', 'budget', { budget: false })).toBe(false)
    expect(sharedCanFor('shared', 'viewer', 'export', { export: true })).toBe(true)
  })

  it('allows everything outside a shared account (personal and building untouched)', () => {
    expect(sharedCanFor('personal', null, 'record')).toBe(true)
    expect(sharedCanFor('building', 'viewer', 'export')).toBe(true)
  })
})

describe('sharedCan on the active sheet', () => {
  beforeEach(() => {
    localStorage.clear()
    setItem(STORAGE_KEYS.SETTINGS, { spreadsheetId: 'S9', spreadsheets: [{ id: 'S9' }], forms: [] })
  })

  it('allows a personal sheet and a building', () => {
    expect(sharedCan('record')).toBe(true)
    setWorkspaceType('S9', 'building')
    expect(sharedCan('budget')).toBe(true)
    expect(() => assertSharedCan('budget')).not.toThrow()
  })

  it('refuses a shared sheet with no role row for the signed-in user (a viewer)', () => {
    setWorkspaceType('S9', 'shared')

    expect(sharedCan('record')).toBe(false)
    expect(() => assertSharedCan('budget')).toThrow('دسترسی ندارید')
    setWorkspaceType('S9', 'personal')
  })

  it('refuses the column repair (it rewrites everyone’s rows) without editOthers', async () => {
    setWorkspaceType('S9', 'shared')

    await expect(repairLegacyRows('S9', [])).rejects.toThrow('دسترسی ندارید')
    setWorkspaceType('S9', 'personal')
    await expect(repairLegacyRows('S9', [])).resolves.toBeTruthy()
  })
})

describe('launch actions inside a shared account', () => {
  it('never opens the entry form or the SMS queue, only the shared home', () => {
    for (const action of [
      { kind: 'entry', formType: 'expense' },
      { kind: 'entry' },
      { kind: 'sms' },
      { kind: 'share', text: 'خرید ۱۲۰٬۰۰۰' },
      { kind: 'dashboard' }
    ] as const) {
      expect(launchTarget(action, 'shared')).toEqual({ tab: 'shared-home' })
    }
  })

  it('keeps the personal and building targets', () => {
    for (const type of ['personal', 'building'] as const) {
      expect(launchTarget({ kind: 'entry', formType: 'income' }, type)).toEqual({
        tab: 'entry',
        formType: 'income'
      })
      expect(launchTarget({ kind: 'dashboard' }, type)).toEqual({ tab: 'dashboard' })
      expect(launchTarget({ kind: 'sms' }, type)).toEqual({ tab: 'bank-sms' })
      expect(launchTarget({ kind: 'share', text: 'x' }, type)).toEqual({
        tab: 'bank-sms',
        smsText: 'x'
      })
    }
  })
})

describe('generic write pages inside a shared account', () => {
  it('sends the entry form and the personal record list to the shared pages', () => {
    expect(workspaceRedirect('/entry', 'shared')).toBe('/shared')
    expect(workspaceRedirect('/records', 'shared')).toBe('/shared/records')
  })

  it('sends the personal-book pages that write their own tabs to the shared home', () => {
    for (const path of [
      '/wallet/opening-balances',
      '/wallet/acc-1',
      '/wallet/reconcile/acc-1',
      '/net-available-settings',
      '/dang-split',
      '/dang-split/g1'
    ]) {
      expect(workspaceRedirect(path, 'shared')).toBe('/shared')
    }
  })

  it('sends the reminder and close-year settings back to settings', () => {
    expect(workspaceRedirect('/settings/reminders', 'shared')).toBe('/settings')
    expect(workspaceRedirect('/settings/close-year/1404', 'shared')).toBe('/settings')
    expect(workspaceRedirect('/settings/categories', 'shared')).toBeNull()
  })

  it('leaves personal and building routing as it was', () => {
    for (const path of ['/entry', '/records', '/settings/reminders', '/settings/close-year/1404']) {
      expect(workspaceRedirect(path, 'personal')).toBeNull()
      expect(workspaceRedirect(path, 'building')).toBeNull()
    }
    expect(workspaceRedirect('/net-available-settings', 'personal')).toBeNull()
  })
})
