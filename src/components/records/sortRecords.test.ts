import { describe, expect, it } from 'vitest'

import { sortRecords, type StoredRecord } from './recordsUtils'
import type { CustomForm } from '../../types'

/** The comparator as it was before the keys were precomputed; the new one must match it. */
function legacySortRecords(records: StoredRecord[], forms: CustomForm[]): StoredRecord[] {
  const dateFieldFor = (formId: string) =>
    forms.find(f => f.id === formId)?.fields.find(field => field.type === 'date')?.id ?? 'date'

  return [...records].sort((a, b) => {
    const aDate = a.values[dateFieldFor(a.formId)] ?? ''
    const bDate = b.values[dateFieldFor(b.formId)] ?? ''
    const byDate = bDate.localeCompare(aDate)

    if (byDate !== 0) return byDate

    return (b.createdAt || '').localeCompare(a.createdAt || '')
  })
}

function rng(seed: number) {
  let state = seed

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296

    return state / 4294967296
  }
}

const field = (id: string, type: CustomForm['fields'][number]['type']) => ({
  id,
  label: id,
  type,
  required: false
})

const forms: CustomForm[] = [
  {
    id: 'expense',
    name: 'هزینه',
    sheetName: 'هزینه',
    type: 'expense',
    fields: [field('title', 'text'), field('date', 'date')]
  },
  {
    id: 'income',
    name: 'درآمد',
    sheetName: 'درآمد',
    type: 'income',
    // a date field with another id
    fields: [field('title', 'text'), field('receivedOn', 'date')]
  },
  {
    id: 'custom',
    name: 'سفارشی',
    sheetName: 'سفارشی',
    type: 'custom',
    // no date field at all: the sort falls back to a value called «date»
    fields: [field('title', 'text')]
  },
  // a second form with a repeated id: the first one wins, as with `find`
  {
    id: 'expense',
    name: 'کپی',
    sheetName: 'کپی',
    type: 'expense',
    fields: [field('title', 'text'), field('other', 'date')]
  }
]

function makeRecords(count: number, seed: number): StoredRecord[] {
  const next = rng(seed)
  const pick = <T>(items: T[]) => items[Math.floor(next() * items.length)]
  const days = [
    '2026-10-24',
    '2026-10-23',
    '2026-09-30',
    '2025-01-01',
    '2026-1-5',
    '2026-10-24 10:20',
    '۱۴۰۵-۰۷-۰۲',
    'Oct 24',
    'oct 24',
    'Zeta',
    ''
  ]
  const stamps = [
    '2026-10-24T10:20:30.000Z',
    '2026-10-24T10:20:31.000Z',
    '2026-10-24T09:59:59.000Z',
    '2026-10-23T23:00:00.000Z',
    '10:20',
    '',
    undefined
  ]
  const formIds = ['expense', 'income', 'custom', 'ghost']

  return Array.from({ length: count }, (_, index) => {
    const formId = pick(formIds)
    const values: Record<string, string> = { title: `r${index}` }
    const day = pick(days)

    // the date lives under whichever key the form uses; some rows have none
    if (next() > 0.05) {
      values[pick(['date', 'receivedOn', 'other'])] = day
    }

    return {
      id: String(index),
      formId,
      formType: 'expense',
      formName: formId,
      createdAt: pick(stamps) as string,
      rowNumber: index + 2,
      values
    }
  })
}

describe('sortRecords', () => {
  it('orders exactly like the localeCompare comparator it replaced, ties included', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const records = makeRecords(1500, seed)

      expect(sortRecords(records, forms).map(r => r.id)).toEqual(
        legacySortRecords(records, forms).map(r => r.id)
      )
    }
  })

  it('does the same with realistic data: many rows per day, created in sheet order', () => {
    const next = rng(99)
    const records: StoredRecord[] = Array.from({ length: 4000 }, (_, index) => {
      const month = String(1 + Math.floor(next() * 12)).padStart(2, '0')
      const day = String(1 + Math.floor(next() * 28)).padStart(2, '0')

      return {
        id: String(index),
        formId: index % 3 === 0 ? 'income' : 'expense',
        formType: 'expense',
        formName: 'x',
        createdAt: `2026-${month}-${day}T${String(index % 24).padStart(2, '0')}:00:00.000Z`,
        rowNumber: index + 2,
        values: { [index % 3 === 0 ? 'receivedOn' : 'date']: `2026-${month}-${day}` }
      }
    })

    expect(sortRecords(records, forms).map(r => r.id)).toEqual(
      legacySortRecords(records, forms).map(r => r.id)
    )
  })

  it('does not change the input array', () => {
    const records = makeRecords(50, 8)
    const before = records.map(r => r.id)

    sortRecords(records, forms)

    expect(records.map(r => r.id)).toEqual(before)
  })

  it('puts the newest date first and breaks ties by creation time', () => {
    const base = { formType: 'expense' as const, formName: 'x', rowNumber: 2 }
    const sorted = sortRecords(
      [
        { ...base, id: 'old', formId: 'expense', createdAt: 'b', values: { date: '2026-01-01' } },
        { ...base, id: 'new', formId: 'expense', createdAt: 'a', values: { date: '2026-02-01' } },
        {
          ...base,
          id: 'tie-late',
          formId: 'expense',
          createdAt: 'z',
          values: { date: '2026-01-01' }
        }
      ],
      forms
    )

    expect(sorted.map(r => r.id)).toEqual(['new', 'tie-late', 'old'])
  })
})
