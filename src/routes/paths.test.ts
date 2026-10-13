import { describe, expect, it } from 'vitest'

import {
  getCategoriesPath,
  getPathForTab,
  getSettingsSubpageTitle,
  getTabFromPath,
  isCloseYearPath,
  recordFocusPath
} from './paths'

describe('wallet account detail path', () => {
  it('opens the account history for /wallet/<id>', () => {
    expect(getTabFromPath('/wallet/abc')).toBe('wallet-account-detail')
  })

  it('keeps the opening balances page on its own path', () => {
    expect(getTabFromPath('/wallet/opening-balances')).toBe('opening-balances')
    expect(getTabFromPath('/wallet')).toBe('wallet')
  })

  it('builds the path from the account id', () => {
    expect(getPathForTab('wallet-account-detail', { walletAccountId: 'a b' })).toBe('/wallet/a%20b')
    expect(getPathForTab('wallet-account-detail')).toBe('/wallet')
  })
})

describe('wallet reconciliation wizard path', () => {
  it('opens /wallet/reconcile/<id> and builds it from the account id', () => {
    expect(getTabFromPath('/wallet/reconcile/abc')).toBe('wallet-reconcile')
    expect(getPathForTab('wallet-reconcile', { walletAccountId: 'a b' })).toBe(
      '/wallet/reconcile/a%20b'
    )
  })

  it('links a record with its edit form open', () => {
    expect(recordFocusPath('expense', 'r1', true)).toBe('/records?type=expense&record=r1&edit=1')
    expect(recordFocusPath('expense', 'r1')).toBe('/records?type=expense&record=r1')
  })
})

describe('settings sub-pages', () => {
  it('titles the reminders and category pages and nothing else', () => {
    expect(getSettingsSubpageTitle('/settings/categories/')).toBe('دسته‌ها')
    expect(getSettingsSubpageTitle('/settings/reminders')).toBe('یادآوری‌ها')
    expect(getSettingsSubpageTitle('/settings/backup')).toBe('پشتیبان')
    expect(getSettingsSubpageTitle('/settings')).toBeNull()
  })

  it('titles the close-year wizard with its year', () => {
    expect(getSettingsSubpageTitle('/settings/close-year/1404')).toBe('بستن سال ۱۴۰۴')
    expect(isCloseYearPath('/settings/close-year/1404/')).toBe(true)
    expect(isCloseYearPath('/settings/categories')).toBe(false)
  })

  it('opens the category page on a form type', () => {
    expect(getCategoriesPath('income')).toBe('/settings/categories?type=income')
    expect(getCategoriesPath()).toBe('/settings/categories')
  })
})
