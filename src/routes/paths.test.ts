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

describe('line items report paths', () => {
  it('opens the report and an item page by key', () => {
    expect(getTabFromPath('/reports/line-items')).toBe('report-line-items')
    expect(getTabFromPath('/reports/line-items/%D9%85%D9%88%D8%B2')).toBe('report-line-item')
  })

  it('builds the item path from its key, with the type when it is not an expense', () => {
    const key = 'نان سنگک'

    expect(getPathForTab('report-line-item', { lineItemKey: key })).toBe(
      `/reports/line-items/${encodeURIComponent(key)}`
    )
    expect(getPathForTab('report-line-item', { lineItemKey: key, lineItemType: 'income' })).toBe(
      `/reports/line-items/${encodeURIComponent(key)}?type=income`
    )
    expect(getPathForTab('report-line-item')).toBe('/reports/line-items')
  })
})
