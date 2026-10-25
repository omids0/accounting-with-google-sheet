import { describe, expect, it } from 'vitest'

import { createSearchTextBuilder, searchText, type SearchEntry } from './globalSearch'
import {
  buildSearchEntries,
  recentMonthLabels,
  type SearchRecordInput,
  type SearchSources
} from './globalSearchEntries'
import { monthLabelOf } from './globalSearchRecords'
import { parseLineItems } from '../utils/lineItems'
import { toPersianDigits } from '../utils/normalizeDigits'
import { parseNumeric } from '../utils/parseNumeric'
import { normalizeSheetDate } from '../utils/sheetValues'

const noSources: SearchSources = {
  records: [],
  accounts: [{ id: 'acc1', title: 'ملت' }],
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

const SKIPPED = new Set(['amount', 'walletAccount', 'walletApply', 'lineItems'])

/** The record part of the index as it was built before the per-row work was trimmed. */
function legacyRecordEntries(sources: SearchSources): SearchEntry[] {
  const accounts = new Map(sources.accounts.map(account => [account.id, account.title]))

  return sources.records
    .map(record => {
      const values = record.values
      const date = normalizeSheetDate(values[record.dateField])
      const amount = Math.abs(parseNumeric(values.amount))
      const typeLabel = record.type === 'income' ? 'درآمد' : 'هزینه'
      const category = [values.category, values.subCategory].filter(Boolean).join(' / ')
      const month = monthLabelOf(date)
      const itemNames = parseLineItems(values.lineItems).map(item => item.name)
      const words = Object.entries(values)
        .filter(([key]) => key !== record.dateField && !SKIPPED.has(key))
        .map(([, value]) => value)

      return {
        group: 'records' as const,
        id: record.id,
        recordType: record.type,
        title: values.title || values.category || '—',
        subtitle: [
          typeLabel,
          category,
          month,
          itemNames.length ? `☰ ${toPersianDigits(String(itemNames.length))}` : ''
        ]
          .filter(Boolean)
          .join(' · '),
        amount: record.type === 'expense' ? -amount : amount,
        date,
        text: searchText(
          ...words,
          ...itemNames,
          typeLabel,
          accounts.get(values.walletAccount ?? ''),
          month
        ),
        amounts: [amount],
        writer: record.writer
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

function rng(seed: number) {
  let state = seed

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296

    return state / 4294967296
  }
}

function randomRecords(count: number, seed: number): SearchRecordInput[] {
  const next = rng(seed)
  const pick = <T>(items: T[]) => items[Math.floor(next() * items.length)]
  const dates = [
    '2026-10-24',
    '2026-10-23',
    '2026-09-30',
    '2026-03-21',
    '2026-03-20',
    '2025-12-31',
    '2026-10-24T08:00:00.000Z',
    '',
    undefined
  ]
  const titles = [
    'قرض به علی',
    'علي رضايي',
    'سوپر ۲۴',
    'Cafe  Nader',
    ' ',
    '',
    'خرید میوه',
    '1,500,000'
  ]
  const categories = ['خوراک', 'سایر', 'کار', 'حمل و نقل', '']

  return Array.from({ length: count }, (_, index) => {
    const values: Record<string, string> = {
      title: pick(titles),
      category: pick(categories),
      subCategory: pick(['', 'میوه', 'تاکسی']),
      amount: pick(['500000', '۲٬۰۰۰٬۰۰۰', '', '12.5']),
      walletAccount: pick(['acc1', 'unknown', '']),
      counterparty: pick(['', 'مریم', 'ك ي'])
    }
    const date = pick(dates)

    if (date !== undefined) values.date = date

    if (next() > 0.8) {
      values.lineItems = JSON.stringify([
        { n: 'نان', a: 10 },
        { n: 'شیر', a: 20 }
      ])
    }

    return {
      id: `r${index}`,
      type: pick<'income' | 'expense'>(['income', 'expense']),
      values,
      dateField: 'date',
      writer: pick(['', 'a@b.c'])
    }
  })
}

describe('createSearchTextBuilder', () => {
  it('builds exactly what searchText builds', () => {
    const next = rng(3)
    const build = createSearchTextBuilder()
    const pool = [
      'علي',
      'ك',
      '۱٬۲۰۰',
      '1,200',
      '',
      undefined,
      null,
      0,
      42,
      ' ',
      '‌',
      'A  b',
      'x,',
      ',۲'
    ]

    for (let run = 0; run < 5000; run += 1) {
      const parts = Array.from(
        { length: Math.floor(next() * 6) },
        () => pool[Math.floor(next() * pool.length)]
      )

      expect(build(...parts)).toBe(searchText(...parts))
    }
  })
})

describe('record entries of the search index', () => {
  it('match the unoptimized build, in the same order, ties included', () => {
    for (const seed of [1, 2, 3]) {
      const sources = { ...noSources, records: randomRecords(1500, seed) }
      const built = buildSearchEntries(sources).filter(entry => entry.group === 'records')

      expect(built).toEqual(legacyRecordEntries(sources))
    }
  })

  it('keeps newest-first order and the month suggestions', () => {
    const record = (id: string, type: 'income' | 'expense', date: string) => ({
      id,
      type,
      dateField: 'date',
      values: { date, title: id }
    })
    const entries = buildSearchEntries({
      ...noSources,
      records: [
        record('old', 'expense', '2026-03-01'),
        record('new', 'expense', '2026-10-11'),
        record('tie', 'income', '2026-03-01')
      ]
    })

    expect(entries.map(entry => entry.id)).toEqual(['new', 'old', 'tie'])
    expect(recentMonthLabels(entries)).toEqual(['مهر ۱۴۰۵', 'اسفند ۱۴۰۴'])
  })
})
