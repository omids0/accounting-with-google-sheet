import { beforeEach, describe, expect, it } from 'vitest'

import { readLastSettleAccount, writeLastSettleAccount } from './settleOptions'

describe('last settle account', () => {
  beforeEach(() => localStorage.clear())

  it('is empty until one was chosen', () => {
    expect(readLastSettleAccount('sheet-a', 'expense')).toBe('')
  })

  it('remembers one account per direction and per spreadsheet', () => {
    writeLastSettleAccount('sheet-a', 'expense', 'acc-1')
    writeLastSettleAccount('sheet-a', 'income', 'acc-2')
    writeLastSettleAccount('sheet-b', 'expense', 'acc-3')

    expect(readLastSettleAccount('sheet-a', 'expense')).toBe('acc-1')
    expect(readLastSettleAccount('sheet-a', 'income')).toBe('acc-2')
    expect(readLastSettleAccount('sheet-b', 'expense')).toBe('acc-3')
    expect(readLastSettleAccount('sheet-b', 'income')).toBe('')
  })

  it('remembers «بدون حساب» as an empty choice that replaces the old account', () => {
    writeLastSettleAccount('sheet-a', 'expense', 'acc-1')
    writeLastSettleAccount('sheet-a', 'expense', '')

    expect(readLastSettleAccount('sheet-a', 'expense')).toBe('')
  })
})
