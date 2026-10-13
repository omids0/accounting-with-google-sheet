import { describe, expect, it } from 'vitest'

import { parseAmountQuery, searchEntries, SEARCH_GROUP_LIMIT } from './globalSearch'
import { buildSearchEntries, recentMonthLabels, type SearchSources } from './globalSearchEntries'
import { pushRecentSearch } from './searchRecent'
import type { Check, Counterparty, Dang, Receivable, VaultHolding } from '../types'

const empty: SearchSources = {
  records: [],
  accounts: [],
  checks: [],
  dangs: [],
  receivables: [],
  installments: [],
  counterparties: [],
  holdings: [],
  goals: [],
  reminders: [],
  vehicles: []
}

function record(id: string, type: 'income' | 'expense', values: Record<string, string>) {
  return { id, type, values, dateField: 'date' }
}

const check = (id: string, counterparty: string, amount: number): Check => ({
  id,
  createdAt: '',
  checkNumber: `12345${id}`,
  counterparty,
  amount,
  creationDate: '2026-10-01',
  dueDate: '2026-11-02',
  paid: false,
  paidAt: ''
})

const person: Counterparty = {
  id: 'cp1',
  createdAt: '',
  firstName: 'علي',
  lastName: 'رضايي',
  birthDate: '',
  address: '',
  location: null,
  phones: [{ number: '09121234567' }],
  accounts: [],
  note: ''
}

const receivable: Receivable = {
  id: 'rc1',
  createdAt: '',
  title: 'قرض',
  debtor: 'علی رضایی',
  category: 'سایر',
  amount: 3_000_000,
  borrowDate: '2026-09-01',
  note: '',
  payments: []
}

const dang: Dang = {
  id: 'dg1',
  createdAt: '',
  title: 'شام کافه',
  category: 'تفریح',
  counterparty: 'مریم',
  amount: 250_000,
  date: '2026-10-05',
  note: '',
  paid: false,
  paidAt: ''
}

const gold = {
  assetType: 'sekeb',
  asset: {
    id: 'sekeb',
    assetClass: 'gold',
    symbol: 'SEKEB',
    name: 'سکه بهار آزادی',
    unit: 'عدد',
    decimals: 0,
    priceSource: 'tgju',
    tgjuKey: '',
    manualPrice: 0,
    manualPriceAt: '',
    active: true
  },
  netQuantity: 2,
  currentUnitPrice: 0,
  totalValue: 0,
  avgUnitCost: 0,
  unrealized: 0,
  unrealizedPct: 0,
  realized: 0,
  sellCount: 0,
  transactions: []
} as VaultHolding

const sources: SearchSources = {
  ...empty,
  records: [
    record('r1', 'expense', {
      date: '2026-10-11',
      title: 'قرض به علی',
      category: 'سایر',
      amount: '500000',
      walletAccount: 'acc1'
    }),
    record('r2', 'income', {
      date: '2026-09-01',
      title: 'حقوق',
      category: 'کار',
      amount: '2000000'
    })
  ],
  accounts: [{ id: 'acc1', title: 'ملت' }],
  checks: [check('2', 'علی رضایی', 2_000_000), check('3', 'علي رضايي', 4_000_000)],
  dangs: [dang],
  receivables: [receivable],
  counterparties: [person],
  holdings: [gold]
}

const entries = buildSearchEntries(sources)

describe('searchEntries', () => {
  it('normalizes Arabic ي/ك, ZWNJ and digits on both sides', () => {
    const results = searchEntries(entries, 'علي')
    const ids = results.groups.map(group => group.id)

    expect(ids).toEqual(['counterparties', 'records', 'checks', 'receivables'])
    expect(results.total).toBe(5)
    expect(searchEntries(entries, 'سکه‌بهار').total).toBe(0)
    expect(searchEntries(entries, 'سکه بهار').groups[0].items[0].id).toBe('sekeb')
    expect(searchEntries(entries, 'چک ۱۲۳۴۵۲').groups[0].items.map(item => item.id)).toEqual(['2'])
    expect(searchEntries(entries, 'كافه').groups[0].id).toBe('dang')
  })

  it('matches every word in any order', () => {
    expect(searchEntries(entries, 'رضایی علی').total).toBe(4)
    expect(searchEntries(entries, 'علی مریم').total).toBe(0)
  })

  it('matches numeric queries to amounts exactly, with or without grouping', () => {
    for (const query of ['2000000', '2,000,000', '۲٬۰۰۰٬۰۰۰', '٢٠٠٠٠٠٠']) {
      const results = searchEntries(entries, query)

      expect(results.groups.map(group => group.id)).toEqual(['records', 'checks'])
    }

    expect(searchEntries(entries, '۵۰۰٬۰۰۰').groups[0].items[0].id).toBe('r1')
    expect(searchEntries(entries, '200').total).toBe(0)
  })

  it('finds records by account and month', () => {
    expect(searchEntries(entries, 'ملت').groups[0].items[0].id).toBe('r1')
    expect(searchEntries(entries, 'مهر ۱۴۰۵').groups[0].items.map(item => item.id)).toEqual(['r1'])
  })

  it('caps each group and lets a group show more', () => {
    const many = buildSearchEntries({
      ...empty,
      checks: Array.from({ length: 45 }, (_, i) => check(String(i), 'بانک', 1000 + i))
    })
    const first = searchEntries(many, 'بانک')

    expect(first.total).toBe(45)
    expect(first.groups[0].items).toHaveLength(SEARCH_GROUP_LIMIT)
    expect(searchEntries(many, 'بانک', { checks: 40 }).groups[0].items).toHaveLength(40)
  })

  it('returns nothing for an empty query', () => {
    expect(searchEntries(entries, '  ‌ ')).toEqual({ total: 0, groups: [] })
  })
})

describe('buildSearchEntries', () => {
  it('summarizes a counterparty with linked checks and receivables', () => {
    const entry = entries.find(item => item.group === 'counterparties')

    expect(entry?.title).toBe('علي رضايي')
    expect(entry?.subtitle).toContain('۲ چک')
    expect(entry?.subtitle).toContain('۱ طلب')
  })

  it('signs expense amounts and sorts records newest first', () => {
    const records = entries.filter(item => item.group === 'records')

    expect(records.map(item => [item.id, item.amount])).toEqual([
      ['r1', -500000],
      ['r2', 2000000]
    ])
    expect(recentMonthLabels(entries)).toEqual(['مهر ۱۴۰۵', 'شهریور ۱۴۰۵'])
  })
})

describe('records with line items and a counterparty', () => {
  const withItems = buildSearchEntries({
    ...empty,
    records: [
      record('r3', 'expense', {
        date: '2026-10-12',
        title: 'میوه',
        category: 'خوراک',
        amount: '550000',
        counterparty: 'میوه‌فروشی رضا',
        lineItems: JSON.stringify([
          { n: 'کیوی', a: 320000 },
          { n: 'خیار', a: 230000 }
        ])
      })
    ]
  })

  it('finds a record by an item name or its counterparty', () => {
    expect(searchEntries(withItems, 'کیوی').groups[0].items.map(item => item.id)).toEqual(['r3'])
    expect(searchEntries(withItems, 'كيوي').total).toBe(1)
    expect(searchEntries(withItems, 'رضا').total).toBe(1)
  })

  it('marks the result with its item count and keeps the raw JSON out of the words', () => {
    expect(withItems[0].subtitle).toContain('☰ ۲')
    expect(searchEntries(withItems, '"n"').total).toBe(0)
    expect(searchEntries(withItems, '320000').total).toBe(0)
  })
})

describe('parseAmountQuery', () => {
  it('reads plain or grouped digits only', () => {
    expect(parseAmountQuery('۱٬۲۵۰')).toBe(1250)
    expect(parseAmountQuery('12a')).toBeNull()
    expect(parseAmountQuery('0')).toBeNull()
  })
})

describe('pushRecentSearch', () => {
  it('keeps the last five distinct queries, newest first', () => {
    let list: string[] = []

    for (const query of ['a', 'b', 'c', 'd', 'e', 'f', 'علي ', 'علی'])
      list = pushRecentSearch(list, query)

    expect(list).toEqual(['علی', 'f', 'e', 'd', 'c'])
    expect(pushRecentSearch(list, '   ')).toBe(list)
  })
})
