import { beforeEach, describe, expect, it } from 'vitest'

import { BOTTOM_NAV_KEY, readBottomNavIds, useBottomNavStore } from './bottomNavStore'
import { QUICK_ACTIONS_KEY, readQuickActionIds, useQuickActionsStore } from './quickActionsStore'
import {
  BOTTOM_NAV_ACTIONS,
  DEFAULT_BOTTOM_NAV_IDS,
  DEFAULT_QUICK_ACTION_IDS,
  placeQuickAction,
  getQuickAction,
  QUICK_ACTIONS,
  sanitizeBottomNavIds,
  sanitizeQuickActionIds
} from '../components/dashboard/quickActionCatalog'
import { TAB_TITLES } from '../components/layout/types'

describe('quick action catalog', () => {
  it('shows «اسکن فاکتور» and «کیف پول» after the two entry forms by default', () => {
    expect(DEFAULT_QUICK_ACTION_IDS).toEqual(['income', 'expense', 'scan-invoice', 'wallet'])
  })

  it('has unique ids and a path for each, except the invoice scan which opens the camera', () => {
    expect(new Set(QUICK_ACTIONS.map(action => action.id)).size).toBe(QUICK_ACTIONS.length)
    for (const action of QUICK_ACTIONS) {
      if (action.kind === 'scan-invoice') expect(action.to).toBeUndefined()
      else expect(action.to.startsWith('/')).toBe(true)
    }
  })

  it('still offers «انتقال» for a slot of the user’s choice', () => {
    expect(sanitizeQuickActionIds(['income', 'expense', 'transfer', 'wallet'])).toEqual([
      'income',
      'expense',
      'transfer',
      'wallet'
    ])
  })

  it('falls back to the default for a bad stored list', () => {
    expect(sanitizeQuickActionIds(['income', 'expense', 'transfer'])).toEqual(
      DEFAULT_QUICK_ACTION_IDS
    )
    expect(sanitizeQuickActionIds(['income', 'income', 'transfer', 'wallet'])).toEqual(
      DEFAULT_QUICK_ACTION_IDS
    )
    expect(sanitizeQuickActionIds(['income', 'expense', 'transfer', 'gone'])).toEqual(
      DEFAULT_QUICK_ACTION_IDS
    )
    expect(sanitizeQuickActionIds('x')).toEqual(DEFAULT_QUICK_ACTION_IDS)
  })

  it('swaps instead of showing one shortcut twice', () => {
    expect(placeQuickAction(['income', 'expense', 'transfer', 'wallet'], 0, 'wallet')).toEqual([
      'wallet',
      'expense',
      'transfer',
      'income'
    ])
    expect(placeQuickAction(['income', 'expense', 'transfer', 'wallet'], 3, 'checks')).toEqual([
      'income',
      'expense',
      'transfer',
      'checks'
    ])
  })
})

describe('quick actions store', () => {
  beforeEach(() => {
    localStorage.clear()
    useQuickActionsStore.setState({ ids: readQuickActionIds() })
  })

  it('saves a pick per device and drops the key at the default', () => {
    useQuickActionsStore.getState().setSlot(3, 'checks')
    expect(JSON.parse(localStorage.getItem(QUICK_ACTIONS_KEY) ?? 'null')).toEqual([
      'income',
      'expense',
      'scan-invoice',
      'checks'
    ])
    expect(readQuickActionIds()[3]).toBe('checks')

    useQuickActionsStore.getState().reset()
    expect(localStorage.getItem(QUICK_ACTIONS_KEY)).toBeNull()
    expect(useQuickActionsStore.getState().ids).toEqual(DEFAULT_QUICK_ACTION_IDS)
  })

  it('ignores corrupt storage', () => {
    localStorage.setItem(QUICK_ACTIONS_KEY, '{not json')
    expect(readQuickActionIds()).toEqual(DEFAULT_QUICK_ACTION_IDS)
  })
})

describe('bottom nav', () => {
  beforeEach(() => {
    localStorage.clear()
    useBottomNavStore.setState({ ids: readBottomNavIds() })
  })

  it('defaults to the current bar: three pages each side of «داشبورد»', () => {
    expect(DEFAULT_BOTTOM_NAV_IDS.map(id => getQuickAction(id)?.tab)).toEqual([
      'installments',
      'dang',
      'checks',
      'receivables',
      'treasury',
      'wallet'
    ])
  })

  it('offers pages only, never the entry forms or «داشبورد»', () => {
    const ids = BOTTOM_NAV_ACTIONS.map(action => action.id)

    expect(ids).not.toContain('income')
    expect(ids).not.toContain('expense')
    expect(ids).not.toContain('scan-invoice')
    expect(BOTTOM_NAV_ACTIONS.some(action => action.tab === 'dashboard')).toBe(false)
  })

  it('has an icon, a title and one page per bar entry', () => {
    for (const action of BOTTOM_NAV_ACTIONS) {
      expect(action.icon).toBeTruthy()
      expect(action.tab && TAB_TITLES[action.tab]).toBeTruthy()
    }
    expect(new Set(BOTTOM_NAV_ACTIONS.map(action => action.tab)).size).toBe(
      BOTTOM_NAV_ACTIONS.length
    )
  })

  it('rejects a stored list with an entry form or a wrong length', () => {
    expect(
      sanitizeBottomNavIds(['income', 'dang', 'checks', 'receivables', 'treasury', 'wallet'])
    ).toEqual(DEFAULT_BOTTOM_NAV_IDS)
    expect(sanitizeBottomNavIds(['wallet'])).toEqual(DEFAULT_BOTTOM_NAV_IDS)
  })

  it('saves under its own key and leaves the dashboard shortcuts alone', () => {
    useBottomNavStore.getState().setSlot(0, 'charts')
    expect(JSON.parse(localStorage.getItem(BOTTOM_NAV_KEY) ?? 'null')[0]).toBe('charts')
    expect(localStorage.getItem(QUICK_ACTIONS_KEY)).toBeNull()

    useBottomNavStore.getState().reset()
    expect(localStorage.getItem(BOTTOM_NAV_KEY)).toBeNull()
  })
})
