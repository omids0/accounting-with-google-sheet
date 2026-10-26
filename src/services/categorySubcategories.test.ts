import { beforeEach, describe, expect, it } from 'vitest'

import {
  computedSubcategoriesOf,
  getSubcategoriesOf,
  setSubcategoriesOf
} from './categorySubcategories'
import { getDefaultSettings, saveSettings } from './settings'
import { setWorkspaceType } from './workspace'

function open(id: string, dangCategories?: string[]) {
  saveSettings({ ...getDefaultSettings(), spreadsheetId: id, dangCategories })
}

describe('subcategories of expense «بدهی»', () => {
  beforeEach(() => {
    localStorage.clear()
    setWorkspaceType('building-1', 'building')
  })

  it('are the debt categories, computed on every read', () => {
    open('personal-1', ['دنگ', 'قرض', 'سایر'])
    expect(getSubcategoriesOf({}, 'expense', 'بدهی')).toEqual(['دنگ', 'قرض', 'سایر'])

    open('personal-1', ['دنگ', 'وام', 'سایر'])
    expect(getSubcategoriesOf({}, 'expense', 'بدهی')).toEqual(['دنگ', 'وام', 'سایر'])
  })

  it('keep what the user stored first and do not repeat a name', () => {
    open('personal-1', ['دنگ', 'قرض', 'سایر'])
    expect(
      getSubcategoriesOf({ expense: { بدهی: ['خانواده', 'قرض'] } }, 'expense', 'بدهی')
    ).toEqual(['خانواده', 'قرض', 'دنگ', 'سایر'])
  })

  it('are never written back: saving the list stores only the user own names', () => {
    open('personal-1', ['دنگ', 'قرض', 'سایر'])

    const saved = setSubcategoriesOf({}, 'expense', 'بدهی', ['دنگ', 'قرض', 'خانواده', 'سایر'])

    expect(saved.expense?.['بدهی']).toEqual(['خانواده'])

    const onlyDebts = setSubcategoriesOf({}, 'expense', 'بدهی', ['دنگ', 'قرض', 'سایر'])

    expect(onlyDebts.expense?.['بدهی']).toBeUndefined()
  })

  it('leave every other category and the income «بدهی» alone', () => {
    open('personal-1', ['دنگ', 'سایر'])
    expect(getSubcategoriesOf({}, 'expense', 'خوراک')).toEqual(['سایر'])
    expect(getSubcategoriesOf({}, 'income', 'بدهی')).toEqual(['سایر'])
    expect(setSubcategoriesOf({}, 'expense', 'خوراک', ['دنگ']).expense?.['خوراک']).toEqual(['دنگ'])
  })

  it('are reported as fixed so the category page does not offer to rename or delete them', () => {
    open('personal-1', ['دنگ', 'قرض', 'سایر'])
    expect(computedSubcategoriesOf('expense', 'بدهی')).toEqual(['دنگ', 'قرض'])
    expect(computedSubcategoriesOf('expense', 'خوراک')).toEqual([])
    expect(computedSubcategoriesOf('income', 'بدهی')).toEqual([])
  })

  it('are not computed in a building', () => {
    open('building-1', ['دنگ', 'سایر'])
    expect(getSubcategoriesOf({ expense: { بدهی: ['اسناد'] } }, 'expense', 'بدهی')).toEqual([
      'اسناد',
      'سایر'
    ])
  })
})
