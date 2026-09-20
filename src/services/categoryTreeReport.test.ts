import { describe, expect, it } from 'vitest'

import { buildCategoryTree, sumCategoryTree, type CategoryTreeEntry } from './categoryTreeReport'

const entries: CategoryTreeEntry[] = [
  { type: 'expense', category: 'خوراک', subCategory: 'رستوران', amount: 300 },
  { type: 'expense', category: 'خوراک', subCategory: 'رستوران', amount: 200 },
  { type: 'expense', category: 'خوراک', subCategory: 'سایر', amount: 700 },
  { type: 'expense', category: 'قبوض', subCategory: 'برق', amount: 100 },
  { type: 'income', category: 'حقوق', subCategory: '', amount: 5000 }
]

describe('buildCategoryTree', () => {
  const foodNode = () => buildCategoryTree(entries).find(node => node.category === 'خوراک')!

  it('groups by category and then by subcategory', () => {
    const food = foodNode()

    expect(food.total).toBe(1200)
    expect(food.count).toBe(3)
    expect(food.children).toEqual([
      { name: 'رستوران', total: 500, count: 2 },
      { name: 'سایر', total: 700, count: 1 }
    ])
  })

  it('keeps «سایر» last even when it has the biggest total', () => {
    expect(foodNode().children.at(-1)?.name).toBe('سایر')
  })

  it('files a record without a subcategory under «سایر»', () => {
    const salary = buildCategoryTree(entries).find(node => node.category === 'حقوق')

    expect(salary?.children).toEqual([{ name: 'سایر', total: 5000, count: 1 }])
  })

  it('sorts categories by descending total', () => {
    const expenses = buildCategoryTree(entries).filter(node => node.type === 'expense')

    expect(expenses.map(node => node.category)).toEqual(['خوراک', 'قبوض'])
  })

  it('keeps income and expense branches apart', () => {
    const nodes = buildCategoryTree([
      { type: 'income', category: 'مشترک', subCategory: 'الف', amount: 10 },
      { type: 'expense', category: 'مشترک', subCategory: 'الف', amount: 4 }
    ])

    expect(nodes).toHaveLength(2)
    expect(sumCategoryTree(nodes, 'income')).toBe(10)
    expect(sumCategoryTree(nodes, 'expense')).toBe(4)
  })
})
