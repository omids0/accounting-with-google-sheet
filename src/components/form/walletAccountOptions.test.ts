import { describe, expect, it } from 'vitest'

import { NO_ACCOUNT_LABEL, walletAccountOptions } from './walletAccountOptions'

const accounts = [
  { id: 'a', title: 'ملی' },
  { id: 'b', title: 'نقد' }
]

describe('walletAccountOptions', () => {
  it('keeps «بدون حساب» first by default', () => {
    expect(walletAccountOptions({ accounts, value: '' })).toEqual([
      { value: '', label: NO_ACCOUNT_LABEL },
      { value: 'a', label: 'ملی' },
      { value: 'b', label: 'نقد' }
    ])
  })

  it('drops «بدون حساب» when allowNone is false', () => {
    expect(
      walletAccountOptions({ accounts, value: 'a', allowNone: false }).map(o => o.value)
    ).toEqual(['a', 'b'])
  })

  it('hides the excluded account', () => {
    expect(
      walletAccountOptions({ accounts, value: '', allowNone: false, excludeId: 'a' }).map(
        o => o.value
      )
    ).toEqual(['b'])
  })

  it('adds a stand-in for a deleted chosen account', () => {
    expect(walletAccountOptions({ accounts, value: 'gone' }).at(-1)).toEqual({
      value: 'gone',
      label: 'حساب حذف‌شده'
    })
  })
})
