import { describe, expect, it } from 'vitest'

import { compareTableValues, nextTableSort, sortTableRows } from './tableSort'

describe('compareTableValues', () => {
  it('compares numbers numerically', () => {
    expect(compareTableValues(9, 10)).toBeLessThan(0)
    expect(compareTableValues(2_000_000, 300_000)).toBeGreaterThan(0)
  })

  it('compares digit runs inside text as numbers', () => {
    expect(compareTableValues('چک 9', 'چک 10')).toBeLessThan(0)
  })

  it('orders ISO dates chronologically', () => {
    expect(compareTableValues('2026-10-02', '2026-09-30')).toBeGreaterThan(0)
  })
})

describe('sortTableRows', () => {
  const rows = [
    { id: 'a', amount: 300 },
    { id: 'b', amount: 100 },
    { id: 'c', amount: null },
    { id: 'd', amount: 300 },
    { id: 'e', amount: 200 }
  ]
  const ids = (list: typeof rows) => list.map(row => row.id).join('')

  it('sorts ascending and descending, keeping ties in page order', () => {
    expect(ids(sortTableRows(rows, row => row.amount, 'asc'))).toBe('beadc')
    expect(ids(sortTableRows(rows, row => row.amount, 'desc'))).toBe('adebc')
  })

  it('keeps empty values last in both directions', () => {
    expect(sortTableRows(rows, row => row.amount, 'desc').at(-1)?.id).toBe('c')
    expect(sortTableRows(rows, row => row.amount, 'asc').at(-1)?.id).toBe('c')
  })

  it('does not mutate the input', () => {
    sortTableRows(rows, row => row.amount, 'asc')
    expect(ids(rows)).toBe('abcde')
  })

  it('sorts Persian text', () => {
    const names = [{ n: 'رضا' }, { n: 'علی' }, { n: 'بهرام' }]

    expect(sortTableRows(names, row => row.n, 'asc').map(row => row.n)).toEqual([
      'بهرام',
      'رضا',
      'علی'
    ])
  })
})

describe('nextTableSort', () => {
  it('cycles first direction → other direction → off', () => {
    const first = nextTableSort(null, 'amount', 'desc')

    expect(first).toEqual({ columnId: 'amount', direction: 'desc' })

    const second = nextTableSort(first, 'amount', 'desc')

    expect(second).toEqual({ columnId: 'amount', direction: 'asc' })
    expect(nextTableSort(second, 'amount', 'desc')).toBeNull()
  })

  it('starts over on another column', () => {
    expect(nextTableSort({ columnId: 'amount', direction: 'asc' }, 'date')).toEqual({
      columnId: 'date',
      direction: 'asc'
    })
  })
})
