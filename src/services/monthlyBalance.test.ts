import { beforeEach, describe, expect, it, vi } from 'vitest'

const sheet = vi.hoisted(() => ({
  rows: [] as string[][],
  appends: 0,
  updates: 0
}))

vi.mock('./sheets', () => ({
  ensureSheetWithHeaders: async () => undefined,
  fetchSheetRows: async () => {
    await Promise.resolve()

    return sheet.rows.map(row => [...row])
  },
  appendSheetRow: async (_id: string, _sheet: string, row: string[]) => {
    await Promise.resolve()
    sheet.appends += 1
    sheet.rows.push(row)
  },
  updateSheetRow: async (_id: string, _sheet: string, rowNumber: number, row: string[]) => {
    await Promise.resolve()
    sheet.updates += 1
    sheet.rows[rowNumber - 2] = row
  }
}))

const { dedupeOpeningBalances, fetchAllOpeningBalances, fetchOpeningBalance, setOpeningBalance } =
  await import('./monthlyBalance')

describe('opening balances keep one row per month', () => {
  beforeEach(() => {
    sheet.rows = []
    sheet.appends = 0
    sheet.updates = 0
  })

  it('lists a month once, the lowest row winning, newest month first', async () => {
    sheet.rows = [
      ['1405-06', '100', 't1', 'a'],
      ['1405-07', '200', 't2', 'ماه شروع'],
      ['1405-07', '250', 't3', 'محاسبه خودکار'],
      [' 1405-07 ', '300', 't4', 'x']
    ]

    const items = await fetchAllOpeningBalances('s1')

    expect(items.map(item => item.monthKey)).toEqual(['1405-07', '1405-06'])
    expect(items[0]).toMatchObject({ amount: 300, rowNumber: 5 })
    expect(new Set(items.map(item => item.monthKey)).size).toBe(items.length)
  })

  it('reads the same row that the list shows for a month', async () => {
    sheet.rows = [
      ['1405-07', '200', 't2', ''],
      ['1405-07', '250', 't3', '']
    ]

    expect(await fetchOpeningBalance('s1', '1405-07')).toMatchObject({ amount: 250, rowNumber: 3 })
  })

  it('dedupes pure data', () => {
    const base = { updatedAt: '', note: '' }

    expect(
      dedupeOpeningBalances([
        { ...base, monthKey: 'a', amount: 1, rowNumber: 2 },
        { ...base, monthKey: 'a', amount: 2, rowNumber: 3 }
      ])
    ).toEqual([{ ...base, monthKey: 'a', amount: 2, rowNumber: 3 }])
  })

  it('appends a month once even when several callers set it at the same time', async () => {
    await Promise.all([
      setOpeningBalance('s2', '1405-07', 500, 'محاسبه خودکار'),
      setOpeningBalance('s2', '1405-07', 500, 'محاسبه خودکار'),
      setOpeningBalance('s2', '1405-07', 500, 'ماه شروع')
    ])

    expect(sheet.rows.filter(row => row[0] === '1405-07')).toHaveLength(1)
    expect(sheet.appends).toBe(1)
  })

  it('writes nothing when the month already holds that amount and note', async () => {
    sheet.rows = [['1405-07', '500', 't', 'محاسبه خودکار']]

    const result = await setOpeningBalance('s3', '1405-07', 500, 'محاسبه خودکار')

    expect(result.amount).toBe(500)
    expect(sheet.appends + sheet.updates).toBe(0)
  })

  it('updates the existing row in place when the amount changed', async () => {
    sheet.rows = [['1405-07', '500', 't', 'n']]
    await setOpeningBalance('s4', '1405-07', 600, 'n')

    expect(sheet.rows).toHaveLength(1)
    expect(sheet.rows[0][1]).toBe('600')
    expect(sheet.updates).toBe(1)
  })
})
