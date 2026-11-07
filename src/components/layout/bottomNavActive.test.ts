import { describe, expect, it } from 'vitest'

import { resolveActiveBarTab } from './bottomNavActive'
import type { Tab } from './types'

const DEFAULT_BAR: Tab[] = ['installments', 'dang', 'checks', 'receivables', 'treasury', 'wallet']

describe('resolveActiveBarTab', () => {
  it('lights the exact page', () => {
    expect(resolveActiveBarTab(DEFAULT_BAR, 'checks')).toBe('checks')
  })

  it('keeps «کیف پول» lit on its sub-pages', () => {
    expect(resolveActiveBarTab(DEFAULT_BAR, 'wallet-account-detail')).toBe('wallet')
    expect(resolveActiveBarTab(DEFAULT_BAR, 'wallet-transfers')).toBe('wallet')
  })

  it('lights «انتقال» alone on the transfers page when both are on the bar', () => {
    expect(
      resolveActiveBarTab([...DEFAULT_BAR.slice(0, 5), 'wallet-transfers'], 'wallet-transfers')
    ).toBe('wallet-transfers')
    expect(resolveActiveBarTab(['wallet', 'wallet-transfers'], 'wallet-transfers')).toBe(
      'wallet-transfers'
    )
  })

  it('keeps «خودرو» lit on the vehicle profile', () => {
    expect(resolveActiveBarTab(['vehicle-service'], 'vehicle-detail')).toBe('vehicle-service')
  })

  it('lights nothing for a page that is not on the bar', () => {
    expect(resolveActiveBarTab(DEFAULT_BAR, 'charts')).toBeUndefined()
  })
})
