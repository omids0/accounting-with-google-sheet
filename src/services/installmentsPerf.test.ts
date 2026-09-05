import { describe, expect, it } from 'vitest'

import {
  getFirstInstallmentDueDate,
  getInstallmentDueDate,
  getInstallmentEndDate
} from './installmentsDueDates'
import { buildPayments } from './installmentsSchedule'
import { formatMoney, formatPersianNumber } from '../utils/formatMoney'
import {
  addJalaliMonths,
  formatIsoDatePersian,
  isoToJalali,
  jalaliToIso
} from '../utils/jalaliDate'

/**
 * Performance budgets for the installments hot path.
 *
 * These guard against reintroducing per-call `Intl` construction or brute-force
 * calendar search, which previously froze the mobile PWA for seconds when the
 * اقساط page mounted. Budgets are deliberately loose (~50x the measured cost on
 * a slow CI runner) so they only fail on an order-of-magnitude regression.
 */

const PLAN_COUNT = 10
const INSTALLMENTS_PER_PLAN = 36

function measure(label: string, run: () => void): number {
  const start = performance.now()

  run()

  const elapsed = performance.now() - start

  // eslint-disable-next-line no-console
  console.log(`  ${label}: ${elapsed.toFixed(1)} ms`)

  return elapsed
}

describe('installments performance budgets', () => {
  it('converts a single Jalali date in well under a millisecond', () => {
    const elapsed = measure('1000x jalaliToIso', () => {
      for (let i = 0; i < 1000; i++) jalaliToIso(1403, ((i % 12) + 1) as number, (i % 28) + 1)
    })

    expect(elapsed).toBeLessThan(200)
  })

  it('builds schedules for a realistic portfolio quickly', () => {
    const elapsed = measure(`${PLAN_COUNT} plans x ${INSTALLMENTS_PER_PLAN} installments`, () => {
      for (let plan = 0; plan < PLAN_COUNT; plan++) {
        // Distinct start dates so memoization cannot hide the real cost.
        const startDate = `2023-0${(plan % 9) + 1}-1${plan % 9}`

        buildPayments(INSTALLMENTS_PER_PLAN, 15, startDate, 5_000_000)
      }
    })

    expect(elapsed).toBeLessThan(500)
  })

  it('renders card header dates cheaply on repeat renders', () => {
    const startDate = '2023-08-05'

    // Warm the caches the same way a first render would.
    getFirstInstallmentDueDate(startDate, 15)
    getInstallmentEndDate(startDate, 36, 15)

    const elapsed = measure('2000x card header date lookups', () => {
      for (let i = 0; i < 2000; i++) {
        getFirstInstallmentDueDate(startDate, 15)
        getInstallmentEndDate(startDate, 36, 15)
      }
    })

    expect(elapsed).toBeLessThan(100)
  })

  it('formats dates and money for a long list cheaply', () => {
    const isoDates = Array.from({ length: INSTALLMENTS_PER_PLAN }, (_, index) =>
      getInstallmentDueDate('2023-08-05', 15, index)
    )

    const elapsed = measure('10 plans x 36 rows of date + money formatting', () => {
      for (let plan = 0; plan < PLAN_COUNT; plan++) {
        for (const iso of isoDates) {
          formatIsoDatePersian(iso)
          formatMoney(5_000_000)
          formatPersianNumber(plan)
        }
      }
    })

    expect(elapsed).toBeLessThan(300)
  })

  it('keeps month arithmetic cheap across many offsets', () => {
    const elapsed = measure('5000x addJalaliMonths', () => {
      for (let i = 0; i < 5000; i++) {
        addJalaliMonths('2023-08-05', i % 240, 15)
      }
    })

    expect(elapsed).toBeLessThan(300)
  })

  it('still produces correct due dates', () => {
    // Guards the fast path against silent correctness drift.
    expect(isoToJalali('2024-08-05')).toEqual({ year: 1403, month: 5, day: 15 })
    expect(jalaliToIso(1403, 5, 15)).toBe('2024-08-05')
    expect(addJalaliMonths('2024-08-05', 1, 15)).toBe('2024-09-05')
    expect(addJalaliMonths('2024-12-20', 1, 31)).toBe('2025-01-19')

    const payments = buildPayments(3, 15, '2024-08-05', 1000)

    expect(payments.map(payment => payment.dueDate)).toEqual([
      '2024-09-05',
      '2024-10-06',
      '2024-11-05'
    ])
  })
})
