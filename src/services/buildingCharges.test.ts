import { describe, expect, it } from 'vitest'

import {
  baseChargeFor,
  isMonthIssued,
  latestChargeMonth,
  unitBalance,
  unitCharge,
  unitOpenReceivables
} from './buildingCharges'
import type { Receivable } from '../types'

const units = [
  { area: 80, people: 1 },
  { area: 100, people: 2 },
  { area: 120, people: 3 }
]

describe('baseChargeFor', () => {
  it('charges the default to every unit under the fixed method', () => {
    const profile = { defaultCharge: 1_200_000, chargeMethod: 'fixed' as const }

    expect(units.map(unit => baseChargeFor(profile, unit, units))).toEqual([
      1_200_000, 1_200_000, 1_200_000
    ])
  })

  it('scales by area against the average unit and rounds to a thousand', () => {
    const profile = { defaultCharge: 1_000_000, chargeMethod: 'area' as const }

    expect(units.map(unit => baseChargeFor(profile, unit, units))).toEqual([
      800_000, 1_000_000, 1_200_000
    ])
  })

  it('collects the default charge per unit over the whole building', () => {
    const profile = { defaultCharge: 1_500_000, chargeMethod: 'people' as const }

    const total = units.reduce((sum, unit) => sum + baseChargeFor(profile, unit, units), 0)

    expect(total).toBe(1_500_000 * units.length)
  })

  it('falls back to the default when the weights are missing', () => {
    const profile = { defaultCharge: 900_000, chargeMethod: 'area' as const }

    expect(baseChargeFor(profile, { area: 0, people: 0 }, [{ area: 0, people: 0 }])).toBe(900_000)
    expect(baseChargeFor(profile, { area: 50, people: 1 }, [])).toBe(900_000)
  })
})

const receivable = (
  reference: string,
  amount: number,
  paid: number[] = [],
  paidAt = '2026-10-05'
): Receivable => ({
  id: reference,
  createdAt: '',
  title: reference,
  debtor: 'احمدی',
  category: 'شارژ ساختمان',
  amount,
  borrowDate: '2026-10-01',
  note: '',
  payments: paid.map((value, index) => ({
    id: `${reference}-${index}`,
    amount: value,
    paidAt,
    note: ''
  })),
  reference
})

describe('unitCharge', () => {
  const profile = { defaultCharge: 1_200_000, chargeMethod: 'fixed' as const, vacancyRule: 'half' }

  const unit = { area: 100, people: 2, monthlyCharge: 0, occupancy: 'owner-resident' as const }

  it('follows the method until the unit has its own amount', () => {
    expect(unitCharge(profile, unit, [unit])).toBe(1_200_000)
    expect(unitCharge(profile, { ...unit, monthlyCharge: 900_000 }, [unit])).toBe(900_000)
  })

  it('applies the vacancy rule to a vacant unit, to its own amount too', () => {
    const vacant = { ...unit, occupancy: 'vacant' as const }

    expect(unitCharge(profile, vacant, [unit])).toBe(600_000)
    expect(unitCharge(profile, { ...vacant, monthlyCharge: 800_000 }, [unit])).toBe(400_000)
    expect(unitCharge({ ...profile, vacancyRule: 'zero' }, vacant, [unit])).toBe(0)
    expect(unitCharge({ ...profile, vacancyRule: 'full' }, vacant, [unit])).toBe(1_200_000)
  })

  it('takes the occupancy it is given over the stored one', () => {
    expect(unitCharge(profile, unit, [unit], 'vacant')).toBe(600_000)
  })
})

describe('unitBalance', () => {
  const items = [
    receivable('charge:u1:1405-05', 1_200_000, [1_200_000]),
    receivable('charge:u1:1405-06', 1_200_000, [500_000], '2026-09-20'),
    receivable('charge:u1:1405-07', 1_200_000),
    receivable('share:u1:r9', 450_000),
    receivable('charge:u2:1405-07', 1_000_000)
  ]

  it('sums what the unit still owes, across charges and shares', () => {
    const balance = unitBalance('u1', items)

    expect(balance.open).toBe(700_000 + 1_200_000 + 450_000)
    expect(balance.months).toEqual(['1405-06', '1405-07'])
    expect(balance.partial).toBe(true)
    expect(balance.hasShare).toBe(true)
  })

  it('knows the last payment and ignores other units', () => {
    expect(unitBalance('u1', items).lastPaidAt).toBe('2026-10-05')
    expect(unitBalance('u3', items)).toMatchObject({ open: 0, months: [], lastPaidAt: null })
  })

  it('is settled when everything is paid, and carries the unit credit', () => {
    const balance = unitBalance(
      'u1',
      [receivable('charge:u1:1405-05', 1_000, [1_000])],
      [
        { unitId: 'u1', amount: 300_000 },
        { unitId: 'u2', amount: 5 }
      ]
    )

    expect(balance).toMatchObject({ open: 0, credit: 300_000, partial: false })
  })

  it('lists open receivables of one unit, oldest reference first', () => {
    expect(unitOpenReceivables('u1', items).map(item => item.reference)).toEqual([
      'charge:u1:1405-06',
      'charge:u1:1405-07',
      'share:u1:r9'
    ])
  })
})

describe('charge months', () => {
  const items = [receivable('charge:u1:1405-06', 1), receivable('charge:u2:1405-07', 1)]

  it('knows whether a month was issued and which is the latest', () => {
    expect(isMonthIssued(items, '1405-07')).toBe(true)
    expect(isMonthIssued(items, '1405-08')).toBe(false)
    expect(latestChargeMonth(items)).toBe('1405-07')
    expect(latestChargeMonth([receivable('opening:u1', 5)])).toBeNull()
  })
})
