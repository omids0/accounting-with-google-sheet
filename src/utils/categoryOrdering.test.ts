import { describe, expect, it } from 'vitest'

import {
  OTHER_CATEGORY,
  isOtherCategory,
  reorderWithOtherLast,
  withOtherLast,
  withoutOtherCategory
} from './categoryOrdering'

describe('withOtherLast', () => {
  it('appends «سایر» when the list does not have it', () => {
    expect(withOtherLast(['خوراک', 'اجاره'])).toEqual(['خوراک', 'اجاره', OTHER_CATEGORY])
  })

  it('moves an existing «سایر» to the end without duplicating it', () => {
    expect(withOtherLast([OTHER_CATEGORY, 'خوراک'])).toEqual(['خوراک', OTHER_CATEGORY])
  })

  it('drops blank entries', () => {
    expect(withOtherLast(['خوراک', '  '])).toEqual(['خوراک', OTHER_CATEGORY])
  })

  it('returns just «سایر» for an empty list', () => {
    expect(withOtherLast([])).toEqual([OTHER_CATEGORY])
  })
})

describe('withoutOtherCategory', () => {
  it('strips «سایر» so it is never stored', () => {
    expect(withoutOtherCategory(['خوراک', OTHER_CATEGORY])).toEqual(['خوراک'])
  })
})

describe('isOtherCategory', () => {
  it('ignores surrounding whitespace', () => {
    expect(isOtherCategory(' سایر ')).toBe(true)
    expect(isOtherCategory('سایر موارد')).toBe(false)
  })
})

describe('reorderWithOtherLast', () => {
  const list = ['خوراک', 'اجاره', 'قبوض', OTHER_CATEGORY]

  it('reorders entries above «سایر»', () => {
    expect(reorderWithOtherLast(list, 2, 0)).toEqual(['قبوض', 'خوراک', 'اجاره', OTHER_CATEGORY])
  })

  it('refuses to move «سایر» off the end', () => {
    expect(reorderWithOtherLast(list, 3, 0)).toBe(list)
  })

  it('refuses to drop another entry after «سایر»', () => {
    expect(reorderWithOtherLast(list, 0, 3)).toBe(list)
  })

  it('reorders the whole list when it has no «سایر»', () => {
    expect(reorderWithOtherLast(['الف', 'ب'], 1, 0)).toEqual(['ب', 'الف'])
  })
})
