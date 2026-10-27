import { beforeEach, describe, expect, it } from 'vitest'

import {
  isLockedExpenseCategory,
  isSystemCategory,
  lockedCategoriesFor,
  LOCKED_EXPENSE_CATEGORIES,
  withLockedExpenseCategories
} from './protectedCategories'
import { categoryRowMeta } from '../components/categories/categoryRowMeta'
import type { CategoryItem } from '../components/categories/useCategoriesPage'
import { applyGroupsToSettings, type CategoryGroups } from '../services/categoryGroups'
import { isFixedCategory } from '../services/categoryManagePlan'
import { DANG_EXPENSE_CATEGORY } from '../services/dangConstants'
import { getDefaultSettings, getSettings, saveSettings } from '../services/settings'
import { setWorkspaceType } from '../services/workspace'

function open(id: string) {
  saveSettings({ ...getDefaultSettings(), spreadsheetId: id })
}

const emptyGroups: CategoryGroups = {
  income: [],
  expense: [],
  dang: [],
  receivable: [],
  personalReminder: [],
  vehiclePeriodic: [],
  vehicleDeadline: [],
  vehicleMechanic: [],
  vehicleExpense: [],
  walletBank: [],
  walletAccountKind: []
}

describe('the locked expense category «بدهی»', () => {
  beforeEach(() => {
    localStorage.clear()
    setWorkspaceType('building-1', 'building')
    setWorkspaceType('shared-1', 'shared')
  })

  it('is locked in a personal account like «قسط» and «چک»: no rename, no delete', () => {
    open('personal-1')
    expect(LOCKED_EXPENSE_CATEGORIES.has(DANG_EXPENSE_CATEGORY)).toBe(true)
    expect(isLockedExpenseCategory('بدهی')).toBe(true)
    expect(isSystemCategory('expense', 'بدهی')).toBe(true)
    expect(isFixedCategory('expense', 'بدهی')).toBe(true)
    expect(lockedCategoriesFor('expense')).toContain('بدهی')
  })

  it('is not an income category and not a name of the debt list itself', () => {
    open('personal-1')
    expect(isSystemCategory('income', 'بدهی')).toBe(false)
    expect(isFixedCategory('dang', 'بدهی')).toBe(false)
  })

  it('is not locked in a building or a shared account', () => {
    open('building-1')
    expect(isLockedExpenseCategory('بدهی')).toBe(false)
    expect(isSystemCategory('expense', 'بدهی')).toBe(false)
    expect(withLockedExpenseCategories(['آسانسور'])).not.toContain('بدهی')
    open('shared-1')
    expect(isSystemCategory('expense', 'بدهی')).toBe(false)
    expect(withLockedExpenseCategories(['خوراک'])).toEqual(['خوراک', 'سایر'])
  })

  it('is added to a list that lacks it, before «سایر»', () => {
    open('personal-1')
    expect(withLockedExpenseCategories(['خوراک', 'سایر'])).toContain('بدهی')
    expect(withLockedExpenseCategories(['خوراک', 'سایر']).at(-1)).toBe('سایر')
  })

  it('keeps a category the user already had where it is, with nothing deleted or reordered', () => {
    open('personal-1')

    const own = ['خوراک', 'بدهی', 'اجاره', 'قسط', 'چک', 'سایر']
    const next = withLockedExpenseCategories(own)

    expect(next.indexOf('خوراک')).toBeLessThan(next.indexOf('بدهی'))
    expect(next.indexOf('بدهی')).toBeLessThan(next.indexOf('اجاره'))
    expect(next.filter(name => name === 'بدهی')).toHaveLength(1)
    expect(next.slice(0, 3)).toEqual(['خوراک', 'بدهی', 'اجاره'])
    expect(next).toEqual(expect.arrayContaining(own))
  })

  it('is forced into the local expense form options when groups are applied', () => {
    open('personal-1')
    applyGroupsToSettings({ ...emptyGroups, expense: ['خوراک', 'سایر'] })

    const expense = getSettings()?.forms.find(form => form.type === 'expense')
    const options = expense?.fields.find(field => field.id === 'category')?.options

    expect(options).toContain('بدهی')
    expect(options?.at(-1)).toBe('سایر')
  })

  it('has a note on the category page that says what it is for', () => {
    const item = {
      name: 'بدهی',
      system: true,
      subcategories: [],
      usage: { total: 2, thisMonth: 1 },
      budget: 0,
      dormant: false
    } as unknown as CategoryItem

    expect(categoryRowMeta(item, 'expense')).toContain('پرداخت بدهی‌ها')
  })

  it('leaves «طلب» as it was: an income name nobody can rename, not forced into lists', () => {
    open('personal-1')
    expect(isSystemCategory('income', 'طلب')).toBe(true)
    expect(isSystemCategory('expense', 'طلب')).toBe(false)
    expect(isLockedExpenseCategory('طلب')).toBe(false)
  })
})
