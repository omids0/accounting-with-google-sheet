import { beforeEach, describe, expect, it } from 'vitest'

import {
  appendMissingDefaults,
  closeDefaultsOffer,
  isDefaultsOfferClosed,
  missingDefaultCategories
} from './categoryDefaults'
import { DEFAULT_SUBCATEGORIES, seedDefaultSubcategories } from './categorySubcategories'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from './settingsCategoryLists'

// The lists of a spreadsheet created before round 6.
const OLD_EXPENSE = ['خوراک', 'حمل‌ونقل', 'اجاره', 'قبوض', 'تفریح', 'پوشاک', 'قسط', 'چک', 'سایر']
const OLD_INCOME = ['حقوق', 'فروش', 'سرمایه‌گذاری', 'هدیه', 'طلب', 'سایر']

describe('default lists', () => {
  it('ship the approved expense and income categories with «سایر» last', () => {
    expect(DEFAULT_EXPENSE_CATEGORIES).toHaveLength(15)
    expect(DEFAULT_EXPENSE_CATEGORIES.at(-1)).toBe('سایر')
    expect(DEFAULT_INCOME_CATEGORIES).toEqual([
      'حقوق',
      'کار آزاد',
      'سود و سرمایه',
      'هدیه و یارانه',
      'طلب',
      'سایر'
    ])
  })

  it('give every default subcategory owner a place in the default list', () => {
    for (const name of Object.keys(DEFAULT_SUBCATEGORIES.expense)) {
      expect(DEFAULT_EXPENSE_CATEGORIES).toContain(name)
    }
    for (const name of Object.keys(DEFAULT_SUBCATEGORIES.income)) {
      expect(DEFAULT_INCOME_CATEGORIES).toContain(name)
    }
  })

  it('seed subcategories only for the seeded types, under what the sheet has', () => {
    const map = seedDefaultSubcategories({ expense: { خوراک: ['نان'] } }, ['income'])

    expect(map.expense).toEqual({ خوراک: ['نان'] })
    expect(map.income?.['حقوق']).toEqual(['حقوق', 'اضافه‌کار', 'عیدی و پاداش'])
  })
})

describe('missing-defaults offer', () => {
  it('lists only the defaults an older list lacks, in default order', () => {
    expect(missingDefaultCategories('expense', OLD_EXPENSE)).toEqual([
      'خانه',
      'خودرو',
      'سلامت',
      'آموزش',
      'پوشاک و زیبایی',
      'تفریح و سفر',
      'هدیه و مناسبت',
      'خانواده و فرزند',
      'انتقال'
    ])
    expect(missingDefaultCategories('income', DEFAULT_INCOME_CATEGORIES)).toEqual([])
  })

  it('appends before «سایر», never renames, and adds subcategories to added ones only', () => {
    const map = { expense: { خوراک: ['بقالی'] } }
    const result = appendMissingDefaults('expense', OLD_EXPENSE, map)

    expect(result.categories.slice(0, OLD_EXPENSE.length - 1)).toEqual(OLD_EXPENSE.slice(0, -1))
    expect(result.categories.at(-1)).toBe('سایر')
    expect(result.categories).toContain('خانه')
    expect(result.subcategories.expense?.['خوراک']).toEqual(['بقالی'])
    expect(result.subcategories.expense?.['خانه']).toEqual([
      'اجاره',
      'شارژ',
      'تعمیر و لوازم',
      'خدمتکار'
    ])
    expect(result.subcategories.expense?.['قبوض']).toBeUndefined()
  })

  it('appends the income defaults next to the old names', () => {
    const result = appendMissingDefaults('income', OLD_INCOME, {})

    expect(result.added).toEqual(['کار آزاد', 'سود و سرمایه', 'هدیه و یارانه'])
    expect(result.categories).toEqual([
      'حقوق',
      'فروش',
      'سرمایه‌گذاری',
      'هدیه',
      'طلب',
      'کار آزاد',
      'سود و سرمایه',
      'هدیه و یارانه',
      'سایر'
    ])
  })

  describe('dismissal', () => {
    beforeEach(() => localStorage.clear())

    it('is stored per spreadsheet', () => {
      expect(isDefaultsOfferClosed('sheet-a')).toBe(false)
      closeDefaultsOffer('sheet-a')
      expect(isDefaultsOfferClosed('sheet-a')).toBe(true)
      expect(isDefaultsOfferClosed('sheet-b')).toBe(false)
    })
  })
})
