import { describe, expect, it } from 'vitest'

import {
  DEFAULT_MANAGED_LISTS,
  FUND_PAYER,
  labelOfItem,
  moveManagedItem,
  setManagedItemHidden,
  updateManagedItem,
  visibleItems,
  type ManagedItem
} from './buildingLists'
import { canHideItem, countListUsage, listRowMeta } from './buildingListUsage'

const records = [
  { values: { expenseKind: 'current', payer: 'fund' } },
  { values: { expenseKind: 'current', payer: 'manager' } },
  { values: { expenseKind: 'capital', payer: '' } },
  { values: { payer: 'manager' } },
  { values: {} }
]

describe('list usage', () => {
  it('counts the records of each kind; a record without a kind counts for none', () => {
    expect(countListUsage(records, 'EXPENSE_KINDS')).toEqual({ current: 2, capital: 1 })
  })

  it('counts payers, a record without one was paid by the fund', () => {
    expect(countListUsage(records, 'EXPENSE_PAYERS')).toEqual({ fund: 3, manager: 2 })
  })

  it('words the row: the share rule and the count, or hidden with the old records', () => {
    const [current, capital] = DEFAULT_MANAGED_LISTS.EXPENSE_KINDS

    expect(listRowMeta('EXPENSE_KINDS', current, 0)).toBe('سهم به نام: ساکن')
    expect(listRowMeta('EXPENSE_KINDS', capital, 2)).toBe('سهم به نام: مالک · ۲ هزینه')
    expect(listRowMeta('EXPENSE_KINDS', { ...current, hidden: true }, 1)).toBe(
      'پنهان · ۱ هزینهٔ قدیمی'
    )
    expect(listRowMeta('EXPENSE_PAYERS', { value: 'm', label: 'مدیر' }, 3)).toBe('۳ هزینه')
  })

  it('never lets the fund payer be hidden', () => {
    const [fund, manager] = DEFAULT_MANAGED_LISTS.EXPENSE_PAYERS

    expect(fund.value).toBe(FUND_PAYER)
    expect(canHideItem('EXPENSE_PAYERS', fund)).toBe(false)
    expect(canHideItem('EXPENSE_PAYERS', manager)).toBe(true)
    expect(canHideItem('EXPENSE_KINDS', DEFAULT_MANAGED_LISTS.EXPENSE_KINDS[0])).toBe(true)
  })
})

describe('list mutations on a value in use', () => {
  const kinds = (): ManagedItem[] => DEFAULT_MANAGED_LISTS.EXPENSE_KINDS.map(i => ({ ...i }))

  it('hiding a used value keeps it: old records resolve, pickers stop offering it', () => {
    const hidden = setManagedItemHidden(kinds(), 'capital', true)

    expect(hidden).toHaveLength(2)
    expect(labelOfItem(hidden, 'capital')).toBe('عمرانی')
    expect(visibleItems(hidden).map(item => item.value)).toEqual(['current'])
    expect(visibleItems(hidden, 'capital').map(item => item.value)).toEqual(['current', 'capital'])
    expect(countListUsage(records, 'EXPENSE_KINDS').capital).toBe(1)
  })

  it('renaming keeps the key, so the usage count still belongs to the value', () => {
    const renamed = updateManagedItem(kinds(), 'capital', { label: 'سرمایه‌ای' })

    expect(renamed[1]).toMatchObject({ value: 'capital', label: 'سرمایه‌ای', chargeTo: 'owner' })
    expect(countListUsage(records, 'EXPENSE_KINDS').capital).toBe(1)
  })

  it('reordering moves the value, with its flags', () => {
    const hidden = setManagedItemHidden(kinds(), 'current', true)

    expect(moveManagedItem(hidden, 0, 1).map(item => [item.value, !!item.hidden])).toEqual([
      ['capital', false],
      ['current', true]
    ])
  })
})
