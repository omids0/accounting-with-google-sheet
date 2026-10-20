import { beforeEach, describe, expect, it } from 'vitest'

import {
  BUILDING_CHARGE_CATEGORY,
  isLockedExpenseCategory,
  isSystemCategory,
  withLockedExpenseCategories,
  withLockedIncomeCategories
} from './protectedCategories'
import { getDefaultSettings, saveSettings } from '../services/settings'
import { setWorkspaceType } from '../services/workspace'

function activate(id: string): void {
  saveSettings({
    ...getDefaultSettings(),
    spreadsheetId: id,
    spreadsheets: [
      { id: 'personal-1', name: 'p', createdAt: '' },
      { id: 'building-1', name: 'b', createdAt: '', kind: 'building' }
    ]
  })
}

describe('system categories by workspace', () => {
  beforeEach(() => {
    localStorage.clear()
    setWorkspaceType('building-1', 'building')
  })

  it('force the vehicle, installment and check categories into a personal list only', () => {
    activate('personal-1')

    expect(withLockedExpenseCategories(['خوراک'])).toEqual(
      expect.arrayContaining(['خودرو', 'قسط', 'چک', 'اصلاح موجودی', 'تطبیق'])
    )
    expect(isLockedExpenseCategory('خودرو')).toBe(true)
    expect(withLockedIncomeCategories(['حقوق'])).not.toContain(BUILDING_CHARGE_CATEGORY)
  })

  it('keep the building list free of vehicle and installment categories', () => {
    activate('building-1')

    const expense = withLockedExpenseCategories(['آسانسور'])

    expect(expense).toEqual(expect.arrayContaining(['اصلاح موجودی', 'تطبیق', 'چک']))
    expect(expense).not.toContain('خودرو')
    expect(expense).not.toContain('قسط')
    expect(expense.at(-1)).toBe('سایر')
    expect(isLockedExpenseCategory('خودرو')).toBe(false)
  })

  it('lock the charge category of a building income list', () => {
    activate('building-1')

    expect(withLockedIncomeCategories(['پارکینگ مهمان'])).toContain(BUILDING_CHARGE_CATEGORY)
    expect(isSystemCategory('income', BUILDING_CHARGE_CATEGORY)).toBe(true)
    expect(isSystemCategory('income', 'طلب')).toBe(true)
    expect(isSystemCategory('expense', 'انتقال')).toBe(true)
    expect(isSystemCategory('expense', 'اصلاح موجودی')).toBe(true)
  })
})
