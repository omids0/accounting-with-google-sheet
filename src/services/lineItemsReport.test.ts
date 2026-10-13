import { describe, expect, it } from 'vitest'

import {
  aggregateLineItems,
  itemHistory,
  itemOccurrences,
  priceChanges,
  similarItemNames,
  topOccurrenceCounterparty,
  type ItemStat
} from './lineItemsReport'
import { fakeRecord } from './recordInputs.fake'

const RANGE = { start: '2026-10-01', end: '2026-10-31' }

const PREVIOUS = { start: '2026-09-01', end: '2026-09-30' }

const records = [
  fakeRecord({
    date: '2026-10-05',
    category: 'خوراک',
    amount: 650000,
    items: [
      { name: 'موز', amount: 450000, note: '۱٫۵ کیلو' },
      { name: 'كيوي', amount: 200000, note: '۱ کیلو' }
    ]
  }),
  fakeRecord({
    date: '2026-10-09',
    category: 'خوراک',
    amount: 300000,
    items: [{ name: 'موز ', amount: 300000, note: '1 kg' }]
  }),
  fakeRecord({ date: '2026-10-10', category: 'خوراک', amount: 50000 }),
  fakeRecord({
    date: '2026-10-11',
    type: 'income',
    category: 'فروش',
    amount: 900000,
    items: [{ name: 'موز', amount: 900000 }]
  }),
  fakeRecord({
    date: '2026-09-15',
    category: 'خوراک',
    amount: 200000,
    items: [{ name: 'موز', amount: 200000, note: '۲ کیلو' }]
  })
]

describe('explicit unit price', () => {
  it('wins over amount ÷ quantity for the item stat', () => {
    const result = aggregateLineItems(
      [
        fakeRecord({
          date: '2026-10-05',
          category: 'خوراک',
          amount: 700000,
          // amount ÷ quantity would say 350 000; the user typed فی 300 000.
          items: [{ name: 'موز', amount: 700000, note: '۲ کیلو', unitPrice: 300000, quantity: 2 }]
        })
      ],
      RANGE,
      'expense'
    )

    expect(result.items[0].unitPrice).toEqual({ value: 300000, unit: 'کیلو' })
  })

  it('feeds priceChanges with the typed prices', () => {
    const stat = (value: number): ItemStat => ({
      key: 'موز',
      name: 'موز',
      count: 1,
      total: value,
      average: value,
      topCategory: '',
      unitPrice: { value, unit: 'کیلو' }
    })

    expect(priceChanges([stat(330000)], [stat(300000)])[0]).toMatchObject({
      from: 300000,
      to: 330000
    })
  })
})

describe('aggregateLineItems', () => {
  it('groups spellings and totals the expense items of the range', () => {
    const result = aggregateLineItems(records, RANGE, 'expense')

    expect(result.recordCount).toBe(2)
    expect(result.itemCount).toBe(3)
    expect(result.withItemsTotal).toBe(950000)
    expect(result.withoutItemsTotal).toBe(50000)
    expect(result.items.map(item => [item.name, item.count, item.total, item.topCategory])).toEqual(
      [
        ['موز', 2, 750000, 'خوراک'],
        ['كيوي', 1, 200000, 'خوراک']
      ]
    )
    expect(result.items[0].average).toBe(375000)
  })

  it('prices per unit from the most used unit of the notes', () => {
    const [banana, kiwi] = aggregateLineItems(records, RANGE, 'expense').items

    // «۱٫۵ کیلو» and «1 kg» use different units: the first one counted wins a tie.
    expect(banana.unitPrice).toEqual({ value: 300000, unit: 'کیلو' })
    expect(kiwi.unitPrice).toEqual({ value: 200000, unit: 'کیلو' })
  })

  it('has no unit price when no note carries a quantity', () => {
    const [item] = aggregateLineItems(records, RANGE, 'income').items

    expect(item.unitPrice).toBeUndefined()
  })

  it('honours the type filter and the date range', () => {
    expect(aggregateLineItems(records, RANGE, 'income').items.map(i => i.total)).toEqual([900000])
    expect(aggregateLineItems(records, RANGE, 'all').items[0].total).toBe(1650000)
    expect(aggregateLineItems(records, PREVIOUS, 'expense').items).toHaveLength(1)
  })

  it('is empty when no record in range has items', () => {
    const result = aggregateLineItems([records[2]], RANGE, 'expense')

    expect(result.items).toEqual([])
    expect(result.recordCount).toBe(0)
    expect(result.withoutItemsTotal).toBe(50000)
  })
})

describe('priceChanges', () => {
  const stat = (key: string, value: number, unit = 'کیلو'): ItemStat => ({
    key,
    name: key,
    count: 1,
    total: value,
    average: value,
    topCategory: '',
    unitPrice: { value, unit }
  })

  it('keeps items priced in both periods that moved 5% or more, largest first', () => {
    const changes = priceChanges(
      [stat('موز', 330), stat('سیب', 102), stat('کیوی', 150), stat('نو', 10)],
      [stat('موز', 300), stat('سیب', 100), stat('کیوی', 200), stat('قدیمی', 10)]
    )

    expect(changes.map(change => [change.key, Math.round(change.pct)])).toEqual([
      ['کیوی', -25],
      ['موز', 10]
    ])
    expect(changes[1]).toMatchObject({ from: 300, to: 330, unit: 'کیلو' })
  })

  it('skips items whose unit changed or that have no unit price', () => {
    const noPrice: ItemStat = { ...stat('الف', 1), unitPrice: undefined }

    expect(priceChanges([stat('موز', 330, 'عدد'), noPrice], [stat('موز', 300), noPrice])).toEqual(
      []
    )
  })
})

describe('itemHistory', () => {
  it('lists twelve months, oldest first, with zeros for quiet months', () => {
    const history = itemHistory(records, 'موز', 12, '2026-10-13')

    expect(history).toHaveLength(12)
    expect(history[11]).toMatchObject({ total: 450000 + 300000 + 900000, count: 3 })
    expect(history[10]).toMatchObject({ total: 200000, count: 1 })
    expect(history[0]).toMatchObject({ total: 0, count: 0 })
    expect(history.map(entry => entry.month)).toEqual([...history.map(entry => entry.month)].sort())
  })

  it('ignores other items and records outside the window', () => {
    const history = itemHistory(
      [...records, fakeRecord({ date: '2020-01-01', items: [{ name: 'موز', amount: 1 }] })],
      'کیوی',
      12,
      '2026-10-13'
    )

    expect(history.reduce((sum, entry) => sum + entry.total, 0)).toBe(200000)
  })
})

describe('similarItemNames', () => {
  const keys = ['نان سنگک', 'نانسنگک', 'نان', 'سنگک تازه', 'موز', 'مو']

  it('finds spellings equal without spaces and names that contain each other', () => {
    expect(similarItemNames(keys, 'نان سنگک')).toEqual(['نانسنگک', 'نان'])
  })

  it('needs three letters for a containment match and never lists the item itself', () => {
    expect(similarItemNames(keys, 'موز')).toEqual([])
    expect(similarItemNames(keys, 'مو')).toEqual([])
    expect(similarItemNames(keys, 'نان')).toEqual(['نان سنگک', 'نانسنگک'])
  })
})

describe('itemOccurrences', () => {
  const rows = [
    fakeRecord({
      date: '2026-10-05',
      title: 'میوه',
      amount: 650000,
      counterparty: 'رضا',
      items: [
        { name: 'موز', amount: 300000, note: '۱ کیلو' },
        { name: 'موز', amount: 150000, note: '۰٫۵ کیلو' },
        { name: 'کیوی', amount: 200000 }
      ]
    }),
    fakeRecord({
      date: '2026-10-09',
      title: 'بازار',
      amount: 300000,
      counterparty: 'رضا',
      items: [{ name: 'موز ', amount: 300000 }]
    }),
    fakeRecord({
      date: '2026-09-01',
      title: 'قدیمی',
      amount: 5,
      counterparty: 'علی',
      items: [{ name: 'موز', amount: 5 }]
    }),
    fakeRecord({ date: '2026-10-10', amount: 50000 })
  ]

  it('lists the records with the item, newest first, summing repeated lines', () => {
    const found = itemOccurrences(rows, 'موز')

    expect(found.map(entry => entry.title)).toEqual(['بازار', 'میوه', 'قدیمی'])
    expect(found[1]).toMatchObject({
      amount: 450000,
      recordAmount: 650000,
      quantity: '۱ کیلو + ۰٫۵ کیلو'
    })
    expect(itemOccurrences(rows, 'ناموجود')).toEqual([])
  })

  it('names the counterparty that appears most', () => {
    expect(topOccurrenceCounterparty(itemOccurrences(rows, 'موز'))).toBe('رضا')
    expect(topOccurrenceCounterparty([])).toBe('')
  })
})
