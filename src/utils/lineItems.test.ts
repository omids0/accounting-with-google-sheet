import { describe, expect, it } from 'vitest'

import { formatPersianNumber } from './formatMoney'
import {
  describeLineItems,
  normalizeItemName,
  parseItemQuantity,
  parseLineItems,
  serializeLineItems,
  sumLineItems
} from './lineItems'

describe('parseLineItems', () => {
  it('reads the compact stored shape', () => {
    expect(
      parseLineItems('[{"n":"کیوی","a":320000,"q":"۲ کیلو"},{"n":"خیار","a":230000}]')
    ).toEqual([
      { name: 'کیوی', amount: 320000, note: '۲ کیلو' },
      { name: 'خیار', amount: 230000 }
    ])
  })

  it('returns no items for empty, missing or broken input', () => {
    expect(parseLineItems('')).toEqual([])
    expect(parseLineItems(undefined)).toEqual([])
    expect(parseLineItems('{not json')).toEqual([])
    expect(parseLineItems('{"n":"x","a":1}')).toEqual([])
  })

  it('drops entries without a name or a numeric amount', () => {
    expect(parseLineItems('[{"n":"","a":5},{"n":"موز"},{"n":"سیب","a":10},null]')).toEqual([
      { name: 'سیب', amount: 10 }
    ])
  })
})

describe('serializeLineItems', () => {
  it('gives an empty cell for no items', () => {
    expect(serializeLineItems([])).toBe('')
  })

  it('round-trips and omits an empty note', () => {
    const items = [
      { name: 'کیوی', amount: 320000, note: '۲ کیلو' },
      { name: 'خیار', amount: 230000, note: '  ' }
    ]

    const raw = serializeLineItems(items)

    expect(raw).toBe('[{"n":"کیوی","a":320000,"q":"۲ کیلو"},{"n":"خیار","a":230000}]')
    expect(parseLineItems(raw)).toEqual([
      { name: 'کیوی', amount: 320000, note: '۲ کیلو' },
      { name: 'خیار', amount: 230000 }
    ])
  })
})

describe('sumLineItems', () => {
  it('adds the amounts', () => {
    expect(sumLineItems([])).toBe(0)
    expect(
      sumLineItems([
        { name: 'a', amount: 320000 },
        { name: 'b', amount: 230000 }
      ])
    ).toBe(550000)
  })
})

describe('normalizeItemName', () => {
  it('folds Arabic letters, ZWNJ and extra spaces', () => {
    expect(normalizeItemName('  موز  ')).toBe('موز')
    expect(normalizeItemName('كيوي')).toBe(normalizeItemName('کیوی'))
    expect(normalizeItemName('نان  سنگک')).toBe('نان سنگک')
    expect(normalizeItemName('می‌وه')).toBe(normalizeItemName('میوه'))
  })
})

describe('parseItemQuantity', () => {
  it('reads Persian and Latin digits with a unit', () => {
    expect(parseItemQuantity('۲ کیلو')).toEqual({ value: 2, unit: 'کیلو' })
    expect(parseItemQuantity('1.5 kg')).toEqual({ value: 1.5, unit: 'kg' })
    expect(parseItemQuantity('۳ عدد')).toEqual({ value: 3, unit: 'عدد' })
    expect(parseItemQuantity('۲ لیتر')).toEqual({ value: 2, unit: 'لیتر' })
    expect(parseItemQuantity('۱٫۵ کیلو')).toEqual({ value: 1.5, unit: 'کیلو' })
  })

  it('accepts a bare number and rejects notes without a leading number', () => {
    expect(parseItemQuantity('۴')).toEqual({ value: 4, unit: '' })
    expect(parseItemQuantity('تازه')).toBeNull()
    expect(parseItemQuantity('')).toBeNull()
    expect(parseItemQuantity(undefined)).toBeNull()
  })
})

describe('describeLineItems', () => {
  it('joins name, note and amount with a dot between items', () => {
    const text = describeLineItems([
      { name: 'کیوی', amount: 320000, note: '۲ کیلو' },
      { name: 'موز', amount: 450000 }
    ])

    expect(text).toBe(
      `کیوی ۲ کیلو ${formatPersianNumber(320000)} · موز ${formatPersianNumber(450000)}`
    )
  })

  it('is empty for no items', () => {
    expect(describeLineItems([])).toBe('')
  })
})
