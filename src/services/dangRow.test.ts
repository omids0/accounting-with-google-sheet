import { describe, expect, it } from 'vitest'

import { isLegacyDangRow, rowToDang, sortDangs } from './dang'
import { DANG_PAYMENTS_COLUMN, dangToRow } from './dangRow'
import { DANG_WRITER_COLUMN } from './writerColumn'

const legacyRow = (amount: string) => [
  'd1',
  't',
  'شام',
  'رضا',
  amount,
  '1403/01/01',
  '',
  'TRUE',
  ''
]

const currentRow = (amount: string, counterparty = 'رضا') => [
  'd2',
  't',
  'شام',
  'رستوران',
  counterparty,
  amount,
  '1403/01/01',
  '',
  'FALSE',
  '',
  '',
  ''
]

describe('dang row layout', () => {
  it('keeps the historical layout for plain numbers', () => {
    expect(isLegacyDangRow(legacyRow('120000'))).toBe(true)
    expect(isLegacyDangRow(currentRow('120000'))).toBe(false)
    expect(rowToDang(legacyRow('120000'), 2).amount).toBe(120000)
    expect(rowToDang(currentRow('120000'), 2).amount).toBe(120000)
  })

  it('reads formatted and Persian-digit amounts', () => {
    expect(isLegacyDangRow(legacyRow('120,000'))).toBe(true)
    expect(rowToDang(legacyRow('120,000'), 2).amount).toBe(120000)
    expect(rowToDang(legacyRow('۱۲۰٬۰۰۰'), 2).counterparty).toBe('رضا')
    expect(rowToDang(currentRow('۱۲۰٬۰۰۰'), 2).amount).toBe(120000)
    expect(rowToDang(currentRow('1,200', '۱۲'), 2)).toMatchObject({
      counterparty: '۱۲',
      amount: 1200
    })
  })
})

const currentRow14 = (over: Record<number, string> = {}) => {
  const cells = ['d3', 't', 'شام', 'رستوران', 'رضا', '100000', '2026-10-01', '', 'خیر', '', '', '']

  cells[12] = ''
  cells[13] = ''
  Object.entries(over).forEach(([index, value]) => {
    cells[Number(index)] = value
  })

  return cells
}

const payment = (id: string, amount: number, paidAt = '2026-10-02', tx = '') => ({
  id,
  amount,
  paidAt,
  note: '',
  ...(tx ? { transactionRecordId: tx } : {})
})

describe('dang payments cell', () => {
  it('reads the payments at index 13 and derives paid from them', () => {
    const half = rowToDang(currentRow14({ 13: JSON.stringify([payment('p1', 40000)]) }), 2)

    expect(half.payments).toHaveLength(1)
    expect(half.paid).toBe(false)

    const full = rowToDang(
      currentRow14({
        13: JSON.stringify([payment('p1', 40000), payment('p2', 60000, '2026-10-09', 'r9')])
      }),
      2
    )

    expect(full).toMatchObject({ paid: true, paidAt: '2026-10-09', transactionRecordId: 'r9' })
  })

  it('derives ONE full payment from a legacy paid row with no payments cell', () => {
    const twelve = currentRow14({ 8: 'بله', 9: '2026-09-30', 10: 'rec-1' }).slice(0, 12)

    for (const row of [twelve, twelve.concat(['']), twelve.concat(['', ''])]) {
      const dang = rowToDang(row, 2)

      expect(dang.payments).toEqual([
        {
          id: 'legacy:d3',
          amount: 100000,
          paidAt: '2026-09-30',
          note: '',
          transactionRecordId: 'rec-1'
        }
      ])
      expect(dang).toMatchObject({ paid: true, paidAt: '2026-09-30', transactionRecordId: 'rec-1' })
    }
  })

  it('derives from a legacy-layout row too, but not for a zero amount', () => {
    expect(rowToDang(legacyRow('120000'), 2).payments).toHaveLength(1)
    expect(rowToDang(currentRow14({ 5: '0', 8: 'بله' }), 2).payments).toEqual([])
  })

  it('lets payments win over the paid column, and an explicit [] over a paid column', () => {
    const ticked = currentRow14({ 8: 'بله', 13: JSON.stringify([payment('p1', 10000)]) })

    expect(rowToDang(ticked, 2)).toMatchObject({ paid: false, payments: [expect.anything()] })
    expect(rowToDang(currentRow14({ 8: 'بله', 13: '[]' }), 2)).toMatchObject({
      paid: false,
      payments: []
    })
  })

  it('reads a broken cell as no payments', () => {
    expect(rowToDang(currentRow14({ 8: 'بله', 13: 'oops' }), 2).payments).toEqual([])
  })
})

describe('dang row write shape', () => {
  const base = rowToDang(currentRow14(), 2)

  it('is 14 cells: the writer cell stays empty at 12, the payments JSON sits at 13', () => {
    const row = dangToRow(base)

    expect(row).toHaveLength(14)
    expect(row[DANG_WRITER_COLUMN]).toBe('')
    expect(row[DANG_PAYMENTS_COLUMN]).toBe('[]')
    expect(DANG_WRITER_COLUMN).toBe(12)
    expect(DANG_PAYMENTS_COLUMN).toBe(13)
  })

  it('keeps the writer the row already had, never the payments, in the writer cell', () => {
    const row = dangToRow({ ...base, writer: 'a@b.c', payments: [payment('p1', 5)] })

    expect(row[12]).toBe('a@b.c')
    expect(row[13]).toBe(JSON.stringify([payment('p1', 5)]))
  })

  it('writes the legacy columns consistently with the payments', () => {
    const settled = dangToRow({
      ...base,
      payments: [payment('p1', 40000, '2026-10-02', 'r1'), payment('p2', 60000, '2026-10-05', 'r2')]
    })

    expect(settled.slice(8, 11)).toEqual(['بله', '2026-10-05', 'r2'])

    const partial = dangToRow({
      ...base,
      paid: true,
      payments: [payment('p1', 40000, '2026-10-02', 'r1')]
    })

    expect(partial.slice(8, 11)).toEqual(['خیر', '', ''])
  })

  it('round-trips: removing a derived payment does not resurrect it', () => {
    const derived = rowToDang(currentRow14({ 8: 'بله', 9: '2026-09-30' }).slice(0, 12), 2)

    expect(derived.paid).toBe(true)

    const written = dangToRow({ ...derived, payments: [] })

    expect(written[13]).toBe('[]')
    expect(written[8]).toBe('خیر')
    expect(rowToDang(written, 2)).toMatchObject({ paid: false, payments: [] })
    expect(rowToDang(dangToRow(derived), 2)).toEqual({ ...derived })
  })
})

describe('sortDangs', () => {
  it('puts settled debts last, newest first inside each group', () => {
    const open = (id: string, date: string) => ({
      ...rowToDang(currentRow14({ 0: id, 6: date }), 2)
    })

    const settled = rowToDang(
      currentRow14({ 0: 's', 6: '2026-12-01', 13: JSON.stringify([payment('p', 100000)]) }),
      2
    )

    expect(
      sortDangs([settled, open('a', '2026-01-01'), open('b', '2026-02-01')]).map(d => d.id)
    ).toEqual(['b', 'a', 's'])
  })
})
