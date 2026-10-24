import { describe, expect, it } from 'vitest'

import {
  categoryNameError,
  isDormantCategory,
  isFixedCategory,
  planBudgetChange,
  planCategoryDelete,
  planCategoryMerge,
  planCategoryRename,
  rewriteCategoryValues,
  summarizeCategoryUsage,
  usageOf
} from './categoryManagePlan'
import { jalaliToIso } from '../utils/jalaliDate'

// 1405-07-20: the window of six months starts on 1405-02-01.
const TODAY = jalaliToIso(1405, 7, 20)
const thisMonth = jalaliToIso(1405, 7, 3)
const inWindow = jalaliToIso(1405, 3, 10)
const beforeWindow = jalaliToIso(1405, 1, 15)

describe('summarizeCategoryUsage', () => {
  it('counts this month, the six-month window and the total per category', () => {
    const summary = summarizeCategoryUsage(
      [
        { category: 'خوراک', date: thisMonth },
        { category: 'خوراک', date: inWindow },
        { category: 'خوراک', date: beforeWindow },
        { category: ' قبوض ', date: thisMonth },
        { category: '', date: thisMonth }
      ],
      TODAY
    )

    expect(usageOf(summary, 'خوراک')).toEqual({ thisMonth: 1, recent: 2, total: 3 })
    expect(usageOf(summary, 'قبوض')).toEqual({ thisMonth: 1, recent: 1, total: 1 })
    expect(usageOf(summary, 'سایر').total).toBe(1)
    expect(usageOf(summary, 'سفر')).toEqual({ thisMonth: 0, recent: 0, total: 0 })
    expect(summary.hasOlderHistory).toBe(true)
  })

  it('counts undated rows toward the total only', () => {
    const summary = summarizeCategoryUsage([{ category: 'شخصی' }], TODAY)

    expect(usageOf(summary, 'شخصی')).toEqual({ thisMonth: 0, recent: 0, total: 1 })
    expect(summary.hasOlderHistory).toBe(false)
  })
})

describe('dimming rule', () => {
  const summary = summarizeCategoryUsage(
    [
      { category: 'خوراک', date: thisMonth },
      { category: 'پوشاک', date: beforeWindow }
    ],
    TODAY
  )

  it('dims an income/expense category with no row in six months', () => {
    expect(isDormantCategory('expense', 'پوشاک', summary)).toBe(true)
    expect(isDormantCategory('expense', 'سفر', summary)).toBe(true)
    expect(isDormantCategory('expense', 'خوراک', summary)).toBe(false)
  })

  it('never dims system categories, «سایر» or the other lists', () => {
    expect(isDormantCategory('expense', 'چک', summary)).toBe(false)
    expect(isDormantCategory('expense', 'سایر', summary)).toBe(false)
    expect(isDormantCategory('dang', 'پوشاک', summary)).toBe(false)
  })

  it('waits for six months of history before dimming anything', () => {
    const fresh = summarizeCategoryUsage([{ category: 'خوراک', date: thisMonth }], TODAY)

    expect(isDormantCategory('expense', 'پوشاک', fresh)).toBe(false)
  })
})

describe('protected rules', () => {
  it('locks system categories and «سایر» per list type', () => {
    for (const name of ['خودرو', 'قسط', 'چک', 'انتقال', 'سایر']) {
      expect(isFixedCategory('expense', name)).toBe(true)
    }
    expect(isFixedCategory('income', 'طلب')).toBe(true)
    expect(isFixedCategory('expense', 'طلب')).toBe(false)
    expect(isFixedCategory('expense', 'خوراک')).toBe(false)
    expect(isFixedCategory('receivable', 'طلب')).toBe(false)
  })

  it('rejects empty and duplicate names', () => {
    const list = ['خوراک', 'خانه']

    expect(categoryNameError(list, 'خوراک', '  ')).toBe('نام دسته را بنویس')
    expect(categoryNameError(list, 'خوراک', 'خانه')).toBeTruthy()
    expect(categoryNameError(list, 'خوراک', 'خوراک')).toBeNull()
    expect(categoryNameError(list, 'خوراک', 'غذا')).toBeNull()
  })
})

describe('rename and merge plans', () => {
  const map = { expense: { خوراک: ['نان', 'میوه'], خانه: ['اجاره', 'نان'] } }
  const list = ['خوراک', 'خانه', 'پوشاک', 'سایر']

  it('renames in place and moves the subcategories', () => {
    const plan = planCategoryRename('expense', list, map, 'خوراک', ' غذا ')

    expect(plan.categories).toEqual(['غذا', 'خانه', 'پوشاک', 'سایر'])
    expect(plan.subcategories.expense).toEqual({ غذا: ['نان', 'میوه'], خانه: ['اجاره', 'نان'] })
  })

  it('merges: drops the source and unions its subcategories into the target', () => {
    const plan = planCategoryMerge('expense', list, map, 'خوراک', 'خانه')

    expect(plan.categories).toEqual(['خانه', 'پوشاک', 'سایر'])
    expect(plan.subcategories.expense).toEqual({ خانه: ['اجاره', 'نان', 'میوه'] })
  })

  it('deletes the category and its subcategories', () => {
    const plan = planCategoryDelete('expense', list, map, 'خوراک')

    expect(plan.categories).toEqual(['خانه', 'پوشاک', 'سایر'])
    expect(plan.subcategories.expense).toEqual({ خانه: ['اجاره', 'نان'] })
  })

  it('carries a budget over on rename and drops it on merge or delete', () => {
    const budgets = new Map([
      ['خوراک', 800_000],
      ['خانه', 2_000_000]
    ])

    expect(planBudgetChange('rename', budgets, 'خوراک', 'غذا')).toEqual({
      kind: 'move',
      from: 'خوراک',
      to: 'غذا',
      amount: 800_000
    })
    expect(planBudgetChange('rename', budgets, 'خوراک', 'خانه')).toEqual({
      kind: 'delete',
      category: 'خوراک'
    })
    expect(planBudgetChange('merge', budgets, 'خوراک', 'خانه').kind).toBe('delete')
    expect(planBudgetChange('delete', budgets, 'پوشاک').kind).toBe('none')
  })
})

describe('rewriteCategoryValues', () => {
  it('rewrites the category and keeps the subcategory', () => {
    expect(
      rewriteCategoryValues(
        { category: 'خوراک ', subCategory: 'نان' },
        { category: 'خوراک' },
        { category: 'خانه' }
      )
    ).toEqual({ category: 'خانه', subCategory: 'نان' })
    expect(
      rewriteCategoryValues({ category: 'قبوض' }, { category: 'خوراک' }, { category: 'خانه' })
    ).toBeNull()
  })

  it('rewrites only the matching subcategory on a subcategory rename', () => {
    const from = { category: 'خوراک', subCategory: 'نان' }
    const to = { category: 'خوراک', subCategory: 'نان و لبنیات' }

    expect(rewriteCategoryValues({ category: 'خوراک', subCategory: 'نان' }, from, to)).toEqual({
      category: 'خوراک',
      subCategory: 'نان و لبنیات'
    })
    expect(rewriteCategoryValues({ category: 'خوراک', subCategory: 'میوه' }, from, to)).toBeNull()
  })
})
