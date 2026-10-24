import { describe, expect, it, vi } from 'vitest'

import type { Check } from '../../types'
import { getDateRange } from '../../utils/dateRange'

const mocks = vi.hoisted(() => ({ checks: [] as Check[] }))

vi.mock('../../services/checks', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchChecks: async () => mocks.checks
}))

const { loadModuleReport } = await import('./moduleReportData')

const due = getDateRange('year-to-date').end

const check = (overrides: Partial<Check>): Check => ({
  id: 'c1',
  createdAt: '',
  checkNumber: '1',
  direction: 'paid',
  counterparty: 'علی',
  amount: 100,
  creationDate: due,
  dueDate: due,
  paid: false,
  paidAt: '',
  ...overrides
})

describe('the checks report', () => {
  it('keeps what I give and what I get in two totals, and names each row', async () => {
    mocks.checks = [
      check({}),
      check({ id: 'c2', direction: 'received', amount: 40 }),
      check({ id: 'c3', direction: 'received', amount: 5, paid: true })
    ]

    const report = await loadModuleReport('sheet', 'checks')

    expect(report.total).toBe(100)
    expect(report.totalLabel).toBe('پرداختی‌های پاس‌نشده')
    expect(report.secondaryTotal).toBe(40)
    expect(report.secondaryLabel).toBe('دریافتی‌های پاس‌نشده')
    expect(report.rows.map(row => row.subtitle.split(' · ')[0])).toEqual([
      'چک پرداختی',
      'چک دریافتی'
    ])
  })
})
