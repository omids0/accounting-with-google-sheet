import { describe, expect, it } from 'vitest'

import { createTypeahead, findTypeaheadIndex, isTypeaheadKey, nextIndexForKey } from './keyboardNav'

describe('nextIndexForKey', () => {
  it('moves along the axis and wraps', () => {
    expect(nextIndexForKey('ArrowDown', 1, 3, 'vertical')).toBe(2)
    expect(nextIndexForKey('ArrowDown', 2, 3, 'vertical')).toBe(0)
    expect(nextIndexForKey('ArrowUp', 0, 3, 'vertical')).toBe(2)
    expect(nextIndexForKey('ArrowLeft', 1, 3, 'horizontal')).toBe(0)
    expect(nextIndexForKey('ArrowRight', 1, 3, 'horizontal')).toBe(2)
  })

  it('clamps instead of wrapping when asked', () => {
    expect(nextIndexForKey('ArrowDown', 2, 3, 'vertical', false)).toBe(2)
    expect(nextIndexForKey('ArrowUp', 0, 3, 'vertical', false)).toBe(0)
  })

  it('handles Home/End, entering from outside, and other keys', () => {
    expect(nextIndexForKey('Home', 2, 3, 'vertical')).toBe(0)
    expect(nextIndexForKey('End', 0, 3, 'horizontal')).toBe(2)
    expect(nextIndexForKey('ArrowDown', -1, 3, 'vertical')).toBe(0)
    expect(nextIndexForKey('ArrowLeft', 1, 3, 'vertical')).toBeNull()
    expect(nextIndexForKey('ArrowDown', 0, 0, 'vertical')).toBeNull()
  })
})

describe('findTypeaheadIndex', () => {
  const labels = ['خوراک', 'حمل و نقل', 'خرید', 'قبض', 'كتاب']

  it('finds the next label after the current one', () => {
    expect(findTypeaheadIndex(labels, 'خ', 0)).toBe(2)
    expect(findTypeaheadIndex(labels, 'خ', 2)).toBe(0)
  })

  it('keeps the current item for a longer prefix', () => {
    expect(findTypeaheadIndex(labels, 'خو', 0)).toBe(0)
    expect(findTypeaheadIndex(labels, 'حمل', 3)).toBe(1)
  })

  it('cycles on a repeated letter and normalizes Arabic letter forms', () => {
    expect(findTypeaheadIndex(labels, 'خخ', 0)).toBe(2)
    expect(findTypeaheadIndex(labels, 'ک', 0)).toBe(4)
    expect(findTypeaheadIndex(labels, 'ز', 0)).toBe(-1)
  })
})

describe('createTypeahead', () => {
  it('joins quick keystrokes and resets after a pause', () => {
    const type = createTypeahead()

    expect(type('ق', 1000)).toBe('ق')
    expect(type('ب', 1200)).toBe('قب')
    expect(type('خ', 2000)).toBe('خ')
  })

  it('only treats plain printable keys as type-ahead', () => {
    const plain = { ctrlKey: false, metaKey: false, altKey: false }

    expect(isTypeaheadKey({ key: 'ق', ...plain })).toBe(true)
    expect(isTypeaheadKey({ key: ' ', ...plain })).toBe(false)
    expect(isTypeaheadKey({ key: 'ArrowDown', ...plain })).toBe(false)
    expect(isTypeaheadKey({ key: 'a', ...plain, ctrlKey: true })).toBe(false)
  })
})
