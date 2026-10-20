import { describe, expect, it } from 'vitest'

import {
  chargeMonthCard,
  chargeMonthKeys,
  chargeStatus,
  monthChargeRows
} from './buildingChargeMonths'
import {
  dueDateOf,
  monthKeyOfIso,
  monthLabel,
  monthName,
  nextMonthKey,
  previousMonthKey
} from './buildingMonths'
import type { Receivable } from '../types'

const charge = (
  unitId: string,
  monthKey: string,
  amount: number,
  paid = 0,
  fields: Partial<Receivable> = {}
): Receivable => ({
  id: `${unitId}-${monthKey}`,
  createdAt: '۱۴۰۵/۷/۱، ۱۰:۰۰:۰۰',
  title: '',
  debtor: unitId,
  category: 'شارژ ساختمان',
  amount,
  borrowDate: '2026-10-02',
  note: '',
  payments: paid ? [{ id: 'p', amount: paid, paidAt: '2026-10-03', note: '' }] : [],
  reference: `charge:${unitId}:${monthKey}`,
  ...fields
})

describe('charge months', () => {
  const items = [
    charge('u1', '1405-06', 100, 100),
    charge('u1', '1405-07', 100, 100),
    charge('u2', '1405-07', 100, 40),
    charge('u3', '1405-07', 100),
    { ...charge('u1', '1405-07', 7), reference: 'opening:u1' }
  ]

  it('lists the issued months newest first', () => {
    expect(chargeMonthKeys(items)).toEqual(['1405-07', '1405-06'])
  })

  it('knows paid, partial and open', () => {
    expect(items.slice(0, 4).map(chargeStatus)).toEqual(['paid', 'paid', 'partial', 'open'])
  })

  it('summarises a month for its card', () => {
    expect(chargeMonthCard(items, '1405-07')).toEqual({
      monthKey: '1405-07',
      units: 3,
      due: '2026-10-02',
      issuedAt: '۱۴۰۵/۷/۱',
      billed: 300,
      collected: 140,
      openUnits: 2,
      partialUnits: 1
    })
  })

  it('lists the units of a month with the open ones first', () => {
    expect(
      monthChargeRows(items, '1405-07').map(row => [row.receivable.debtor, row.status])
    ).toEqual([
      ['u3', 'open'],
      ['u2', 'partial'],
      ['u1', 'paid']
    ])
  })
})

describe('month keys', () => {
  it('moves across the year boundary', () => {
    expect(previousMonthKey('1405-01')).toBe('1404-12')
    expect(nextMonthKey('1404-12')).toBe('1405-01')
    expect(nextMonthKey('1405-07')).toBe('1405-08')
  })

  it('names and labels a month', () => {
    expect(monthName('1405-07')).toBe('مهر')
    expect(monthLabel('1405-07')).toBe('مهر ۱۴۰۵')
  })

  it('maps between a date and its Jalali month, and a due day back to a date', () => {
    expect(monthKeyOfIso('2026-10-20')).toBe('1405-07')
    expect(dueDateOf('1405-07', 10)).toBe('2026-10-02')
    expect(monthKeyOfIso(dueDateOf('1405-12', 28))).toBe('1405-12')
  })
})
