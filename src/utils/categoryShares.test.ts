import { describe, expect, it } from 'vitest'

import { toCategoryShares, topCategoryShares } from './categoryShares'

const categories = [
  { name: 'خودرو', total: 300 },
  { name: 'خوراک', total: 890 },
  { name: 'قبوض', total: 30 },
  { name: 'اجاره', total: 480 },
  { name: 'صفر', total: 0 }
]

describe('topCategoryShares', () => {
  it('keeps the three largest categories, largest first', () => {
    expect(topCategoryShares(categories).map(item => item.name)).toEqual([
      'خوراک',
      'اجاره',
      'خودرو'
    ])
  })

  it('measures each share against every category, not just the top three', () => {
    const [first] = topCategoryShares(categories)

    expect(first.share).toBeCloseTo(890 / 1700)
  })

  it('drops empty categories and handles an empty list', () => {
    expect(toCategoryShares(categories).some(item => item.name === 'صفر')).toBe(false)
    expect(topCategoryShares([])).toEqual([])
  })

  it('returns fewer rows when fewer categories exist', () => {
    expect(topCategoryShares([{ name: 'حقوق', total: 10 }])).toEqual([
      { name: 'حقوق', total: 10, share: 1 }
    ])
  })
})
