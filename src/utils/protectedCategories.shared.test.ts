import { beforeEach, describe, expect, it } from 'vitest'

import {
  isLockedExpenseCategory,
  isSystemCategory,
  lockedCategoriesFor,
  LOCKED_EXPENSE_CATEGORIES,
  LOCKED_INCOME_CATEGORIES,
  withLockedExpenseCategories,
  withLockedIncomeCategories
} from './protectedCategories'
import { getDefaultSettings, saveSettings } from '../services/settings'
import { setWorkspaceType } from '../services/workspace'

function open(id: string) {
  saveSettings({ ...getDefaultSettings(), spreadsheetId: id })
}

describe('locked categories by workspace', () => {
  beforeEach(() => {
    localStorage.clear()
    setWorkspaceType('building-1', 'building')
    setWorkspaceType('shared-1', 'shared')
  })

  it('force the personal vehicle, installment and check categories into a personal list', () => {
    open('personal-1')
    expect(withLockedExpenseCategories(['خوراک'])).toEqual(
      expect.arrayContaining([...LOCKED_EXPENSE_CATEGORIES])
    )
    expect(withLockedIncomeCategories([])).toEqual(
      expect.arrayContaining([...LOCKED_INCOME_CATEGORIES])
    )
  })

  it('force nothing into a shared account, whose lists hold only its own categories and «سایر»', () => {
    open('shared-1')
    expect(withLockedExpenseCategories(['خوراک'])).toEqual(['خوراک', 'سایر'])
    expect(withLockedIncomeCategories(['حقوق'])).toEqual(['حقوق', 'سایر'])
    expect(isLockedExpenseCategory('خودرو')).toBe(false)
    expect(isLockedExpenseCategory('چک')).toBe(false)
  })

  it('keep the building sets as they were', () => {
    open('building-1')
    expect(isLockedExpenseCategory('خودرو')).toBe(false)
    expect(isLockedExpenseCategory('چک')).toBe(true)
    expect(lockedCategoriesFor('income')).toContain('شارژ ساختمان')
  })

  it('reserve «تسویه» as a system expense category inside a shared account only', () => {
    open('shared-1')
    expect(isSystemCategory('expense', 'تسویه')).toBe(true)
    expect(isSystemCategory('income', 'تسویه')).toBe(false)
    expect(withLockedExpenseCategories(['خوراک'])).not.toContain('تسویه')
    open('personal-1')
    expect(isSystemCategory('expense', 'تسویه')).toBe(false)
    open('building-1')
    expect(isSystemCategory('expense', 'تسویه')).toBe(false)
  })
})
