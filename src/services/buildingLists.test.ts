import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addManagedItem,
  DEFAULT_MANAGED_LISTS,
  FUND_PAYER,
  getManagedList,
  labelOfItem,
  moveManagedItem,
  parseManagedList,
  saveManagedList,
  setManagedItemHidden,
  updateManagedItem,
  visibleItems
} from './buildingLists'
import { getDefaultSettings, saveSettings } from './settings'
import { setSheetAllRows } from './spreadsheetStore'

const setPeriodSetting = vi.fn()

vi.mock('./periodSettings', () => ({
  setPeriodSetting: (...args: unknown[]) => setPeriodSetting(...args)
}))

const kinds = () => DEFAULT_MANAGED_LISTS.EXPENSE_KINDS.map(item => ({ ...item }))

describe('managed lists', () => {
  it('ship the spec defaults: kinds charge the resident or the owner, the fund pays first', () => {
    expect(DEFAULT_MANAGED_LISTS.EXPENSE_KINDS).toEqual([
      { value: 'current', label: 'جاری', chargeTo: 'resident' },
      { value: 'capital', label: 'عمرانی', chargeTo: 'owner' }
    ])
    expect(DEFAULT_MANAGED_LISTS.EXPENSE_PAYERS.map(item => item.label)).toEqual(['صندوق', 'مدیر'])
    expect(DEFAULT_MANAGED_LISTS.EXPENSE_PAYERS[0].value).toBe(FUND_PAYER)
  })

  it('fall back to the defaults for an empty or broken cell', () => {
    expect(parseManagedList('', 'EXPENSE_KINDS')).toEqual(kinds())
    expect(parseManagedList('not json', 'EXPENSE_KINDS')).toEqual(kinds())
    expect(parseManagedList('[]', 'EXPENSE_PAYERS')).toEqual(DEFAULT_MANAGED_LISTS.EXPENSE_PAYERS)
    expect(parseManagedList('[{"label":"x"}]', 'EXPENSE_KINDS')).toEqual(kinds())
  })

  it('add a value with a generated key, once per label', () => {
    const added = addManagedItem(kinds(), ' تعمیرات اساسی ', { chargeTo: 'owner' }, () => 'k1')

    expect(added.at(-1)).toEqual({ value: 'k1', label: 'تعمیرات اساسی', chargeTo: 'owner' })
    expect(addManagedItem(added, 'تعمیرات اساسی')).toBe(added)
    expect(addManagedItem(added, '   ')).toBe(added)
  })

  it('rename keeps the key, so old records still resolve', () => {
    const renamed = updateManagedItem(kinds(), 'capital', { label: 'سرمایه‌ای' })

    expect(renamed.find(item => item.value === 'capital')).toMatchObject({
      label: 'سرمایه‌ای',
      chargeTo: 'owner'
    })
    expect(labelOfItem(renamed, 'capital')).toBe('سرمایه‌ای')
    expect(updateManagedItem(renamed, 'current', { label: 'سرمایه‌ای' })).toBe(renamed)
  })

  it('re-target the share of a kind without touching its label', () => {
    const next = updateManagedItem(kinds(), 'current', { chargeTo: 'owner' })

    expect(next[0]).toMatchObject({ label: 'جاری', chargeTo: 'owner' })
  })

  it('hide a value instead of deleting it, and show it again', () => {
    const hidden = setManagedItemHidden(kinds(), 'current', true)

    expect(hidden).toHaveLength(2)
    expect(visibleItems(hidden).map(item => item.value)).toEqual(['capital'])
    // A record that already uses the hidden value still shows it.
    expect(visibleItems(hidden, 'current').map(item => item.value)).toEqual(['current', 'capital'])
    expect(visibleItems(setManagedItemHidden(hidden, 'current', false))).toHaveLength(2)
  })

  it('never hide the last visible value', () => {
    const one = setManagedItemHidden(kinds(), 'current', true)

    expect(setManagedItemHidden(one, 'capital', true)).toBe(one)
  })

  it('reorder', () => {
    const list = addManagedItem(kinds(), 'سوم', {}, () => 'k3')

    expect(moveManagedItem(list, 2, 0).map(item => item.value)).toEqual([
      'k3',
      'current',
      'capital'
    ])
    expect(moveManagedItem(list, 0, 5)).toBe(list)
    expect(moveManagedItem(list, 1, 1)).toBe(list)
  })
})

describe('managed lists in «تنظیمات دوره»', () => {
  beforeEach(() => {
    localStorage.clear()
    setPeriodSetting.mockReset()
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'b1',
      spreadsheets: [{ id: 'b1', name: 'ساختمان', createdAt: '' }]
    })
  })

  it('reads the row of the list from the mirror', () => {
    const stored = [{ value: 'current', label: 'عادی', chargeTo: 'resident' }]

    setSheetAllRows('b1', 'تنظیمات دوره', [
      ['کلید', 'مقدار', 'زمان ثبت'],
      ['فهرست:EXPENSE_KINDS', JSON.stringify(stored), 't']
    ])

    expect(getManagedList('EXPENSE_KINDS')).toEqual(stored)
    // No row for the payers: the defaults apply.
    expect(getManagedList('EXPENSE_PAYERS')).toEqual(DEFAULT_MANAGED_LISTS.EXPENSE_PAYERS)
  })

  it('writes the list as JSON under its row key', async () => {
    const items = setManagedItemHidden(kinds(), 'current', true)

    await saveManagedList('b1', 'EXPENSE_KINDS', items)

    expect(setPeriodSetting).toHaveBeenCalledWith(
      'b1',
      'فهرست:EXPENSE_KINDS',
      JSON.stringify(items)
    )
  })
})
