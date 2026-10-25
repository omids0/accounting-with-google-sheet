import { describe, expect, it } from 'vitest'

import {
  getCategoriesPath,
  getPathForTab,
  getSettingsSubpageTitle,
  getTabFromPath,
  isCloseYearPath,
  isKnownPath,
  recordFocusPath,
  recordOpenPath,
  recordsCounterpartyPath
} from './paths'

describe('wallet account detail path', () => {
  it('opens the account history for /wallet/<id>', () => {
    expect(getTabFromPath('/wallet/abc')).toBe('wallet-account-detail')
  })

  it('keeps the opening balances page on its own path', () => {
    expect(getTabFromPath('/wallet/opening-balances')).toBe('opening-balances')
    expect(getTabFromPath('/wallet')).toBe('wallet')
  })

  it('keeps the discrepancy tracer on its own path', () => {
    expect(getTabFromPath('/wallet/trace')).toBe('wallet-trace')
    expect(getPathForTab('wallet-trace')).toBe('/wallet/trace')
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
    expect(recordOpenPath('income', 'r1')).toBe('/records?type=income&record=r1&open=1')
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

describe('records counterparty link', () => {
  it('filters the records page to a counterparty over a range', () => {
    const path = recordsCounterpartyPath('رضا', 'expense', {
      start: '2026-10-01',
      end: '2026-10-31'
    })

    const params = new URLSearchParams(path.split('?')[1])

    expect(path.startsWith('/records?')).toBe(true)
    expect(params.get('type')).toBe('expense')
    expect(params.get('counterparty')).toBe('رضا')
    expect(params.get('from')).toBe('2026-10-01')
    expect(params.get('to')).toBe('2026-10-31')
  })

  it('leaves the type out for both forms', () => {
    const path = recordsCounterpartyPath('رضا', 'all', { start: 'a', end: 'b' })

    expect(new URLSearchParams(path.split('?')[1]).has('type')).toBe(false)
  })
})

describe('known paths', () => {
  it('recognises every page and detail route', () => {
    for (const path of [
      '/',
      '/records',
      '/wallet/acc1',
      '/wallet/reconcile/acc1',
      '/vehicles/v1',
      '/building/units/u1',
      '/reports/line-items/x',
      '/settings/backup',
      '/settings/close-year/1405'
    ]) {
      expect(isKnownPath(path), path).toBe(true)
    }
  })

  it('rejects URLs no page answers to', () => {
    for (const path of ['/nonexistent-page', '/records/xyz', '/vehicles/a/b', '/wallet/a/b/c']) {
      expect(isKnownPath(path), path).toBe(false)
    }
  })
})

describe('known paths match the router', () => {
  it('knows only the settings pages the router has', () => {
    for (const path of [
      '/settings',
      '/settings/backup',
      '/settings/close-year',
      '/settings/close-year/1405'
    ]) {
      expect(isKnownPath(path), path).toBe(true)
    }
    for (const path of ['/settings/xyz', '/settings/backup/extra']) {
      expect(isKnownPath(path), path).toBe(false)
    }
  })

  it('ignores case like the router does', () => {
    expect(isKnownPath('/Wallet')).toBe(true)
    expect(getTabFromPath('/WALLET')).toBe('wallet')
    expect(isKnownPath('/Nonexistent')).toBe(false)
  })
})

describe('invite page path', () => {
  it('uses a path that no static file in public/ (invite.html) can answer for', () => {
    expect(getPathForTab('invite')).toBe('/invite-friends')
    expect(getTabFromPath('/invite-friends')).toBe('invite')
    expect(isKnownPath('/invite-friends')).toBe(true)
    expect(getTabFromPath('/invite')).not.toBe('invite')
  })
})
