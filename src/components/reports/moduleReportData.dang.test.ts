import { describe, expect, it, vi } from 'vitest'

import type { Dang } from '../../types'

const mocks = vi.hoisted(() => ({ dangs: [] as (Dang & { rowNumber: number })[] }))

vi.mock('../../services/dang', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchDangs: async () => mocks.dangs
}))

const { loadModuleReport } = await import('./moduleReportData')

const dang = (overrides: Partial<Dang>): Dang & { rowNumber: number } => ({
  rowNumber: 2,
  id: 'd1',
  createdAt: '',
  title: 'خرید لامپ',
  category: 'خانه',
  counterparty: 'رضا',
  amount: 100_000,
  date: '2026-10-01',
  note: '',
  paid: false,
  paidAt: '',
  payments: [],
  ...overrides
})

const pay = (amount: number) => ({ id: `p${amount}`, amount, paidAt: '2026-10-05', note: '' })

describe('the debts report', () => {
  it('totals and lists what is still owed, and leaves settled debts out', async () => {
    mocks.dangs = [
      dang({ payments: [pay(30_000)] }),
      dang({ id: 'd2', amount: 50_000 }),
      dang({ id: 'd3', paid: true, payments: [pay(80_000)], amount: 80_000 })
    ]

    const report = await loadModuleReport('sheet', 'dang')

    expect(report.total).toBe(120_000)
    expect(report.rows.map(row => [row.id, row.amount])).toEqual([
      ['d1', 70_000],
      ['d2', 50_000]
    ])
  })
})
