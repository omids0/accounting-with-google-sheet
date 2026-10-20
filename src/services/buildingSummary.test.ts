import { describe, expect, it } from 'vitest'

import { initialJourneyState, JOURNEY_ROW } from './buildingJourney'
import { monthKeyOf, summarizeBuilding, unitOfReference } from './buildingSummary'
import {
  BUILDING_HEADERS,
  BUILDING_UNITS_HEADERS,
  PERIOD_SETTINGS_HEADERS,
  RECEIVABLES_HEADERS,
  WALLET_HEADERS
} from './sheetHeaders'
import {
  BUILDING_SHEET,
  BUILDING_UNITS_SHEET,
  PERIOD_SETTINGS_SHEET,
  RECEIVABLES_SHEET,
  WALLET_SHEET
} from './sheetNames'

const receivable = (id: string, amount: number, reference: string, paid = 0) => [
  id,
  '',
  'شارژ',
  'x',
  'شارژ ساختمان',
  String(amount),
  '',
  '',
  JSON.stringify(paid ? [{ id: 'p', amount: paid, paidAt: '', note: '' }] : []),
  '',
  '',
  reference,
  ''
]

const tabs = {
  [PERIOD_SETTINGS_SHEET]: [
    PERIOD_SETTINGS_HEADERS,
    ['نوع فضا', 'ساختمان', ''],
    ['نقش:a@x.com', 'manager', ''],
    ['نقش:b@x.com', 'accountant', ''],
    [JOURNEY_ROW, JSON.stringify(initialJourneyState()), '']
  ],
  [BUILDING_SHEET]: [
    BUILDING_HEADERS,
    ['نرگس', 'ولنجک', '5', '1200000', 'fixed', '3', '10', 'half', '']
  ],
  [BUILDING_UNITS_SHEET]: [
    BUILDING_UNITS_HEADERS,
    ['u1', '', '1', '1', '100', '2', '0', '0', '0', 'بله', '', 'owner-resident'],
    ['u2', '', '2', '1', '100', '2', '0', '0', '0', 'بله', '', 'tenant'],
    ['u3', '', '3', '2', '100', '2', '0', '0', '0', 'خیر', '', 'vacant']
  ],
  [RECEIVABLES_SHEET]: [
    RECEIVABLES_HEADERS,
    receivable('r1', 1_200_000, 'charge:u1:1405-07', 1_200_000),
    receivable('r2', 1_200_000, 'charge:u2:1405-07', 400_000),
    receivable('r3', 1_200_000, 'charge:u2:1405-06'),
    receivable('r4', 800_000, 'opening:u1'),
    receivable('r5', 500_000, '')
  ],
  [WALLET_SHEET]: [
    WALLET_HEADERS,
    ['a1', '', 'ملت', '17200000', ''],
    ['a2', '', 'نقدی', '1200000', '']
  ]
}

describe('summarizeBuilding', () => {
  const summary = summarizeBuilding('b1', tabs, '1405-07')

  it('reads the profile, active units, members and the journey', () => {
    expect(summary).toMatchObject({
      id: 'b1',
      isBuilding: true,
      name: 'نرگس',
      units: 2,
      members: 2,
      issueDay: 3
    })
    expect(summary.journey?.step).toBe('units')
  })

  it('counts the units that still owe and what they owe, from the charge references', () => {
    // u2: 800k left this month + 1.2M last month; u1: 800k opening. Plain receivables are not units'.
    expect(summary.debtorUnits).toBe(2)
    expect(summary.debt).toBe(800_000 + 1_200_000 + 800_000)
  })

  it('summarizes the charge of the month asked for', () => {
    expect(summary.charge).toEqual({
      monthKey: '1405-07',
      issued: 2,
      paid: 1,
      billed: 2_400_000,
      collected: 1_600_000
    })
  })

  it('has no charge for a month nothing was issued in', () => {
    expect(summarizeBuilding('b1', tabs, '1405-08').charge).toBeNull()
  })

  it('totals the fund accounts', () => {
    expect(summary.fundTotal).toBe(18_400_000)
    expect(summary.accounts).toBe(2)
  })

  it('does not take a sheet without the type row for a building', () => {
    const plain = summarizeBuilding('p1', { [PERIOD_SETTINGS_SHEET]: [PERIOD_SETTINGS_HEADERS] })

    expect(plain.isBuilding).toBe(false)
    expect(plain.journey).toBeNull()
    expect(plain.units).toBe(0)
  })
})

describe('references and months', () => {
  it('finds the unit of a charge, share or opening reference only', () => {
    expect(unitOfReference('charge:u1:1405-07')).toBe('u1')
    expect(unitOfReference('share:u4:rec9')).toBe('u4')
    expect(unitOfReference('opening:u2')).toBe('u2')
    expect(unitOfReference('credit:u2')).toBe('')
    expect(unitOfReference('')).toBe('')
  })

  it('names a month by Jalali year and zero-padded month', () => {
    expect(monthKeyOf(new Date(2026, 9, 14))).toBe('1405-07')
    expect(monthKeyOf(new Date(2026, 2, 25))).toBe('1405-01')
  })
})
