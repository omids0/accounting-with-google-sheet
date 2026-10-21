import { describe, expect, it } from 'vitest'

import {
  buildUnitRows,
  debtorsFirst,
  pickUnitLabel,
  unitPlace,
  unitStatus,
  unitWho,
  type UnitRowData
} from './unitRows'
import { newStay } from '../../services/buildingResidents'
import { newUnit } from '../../services/buildingUnits'
import type { Counterparty, Receivable } from '../../types'

const person = (id: string, lastName: string): Counterparty & { rowNumber: number } => ({
  id,
  createdAt: '',
  firstName: '',
  lastName,
  birthDate: '',
  address: '',
  location: null,
  phones: [],
  accounts: [],
  note: '',
  rowNumber: 2
})

const persons = [person('o1', 'موسوی'), person('o2', 'فرهادی'), person('t1', 'کاظمی')]

const unit = (number: string, extra = {}) => ({
  ...newUnit({ number, floor: 1, area: 100, people: 2, parking: 1, ...extra }),
  rowNumber: 2
})

const units = [
  unit('1'),
  unit('2', { occupancy: 'tenant' }),
  unit('3', { occupancy: 'vacant', floor: 3 })
]

const stays = [
  { ...newStay({ unitId: units[0].id, personId: 'o1', role: 'owner' }), rowNumber: 2 },
  { ...newStay({ unitId: units[1].id, personId: 'o2', role: 'owner' }), rowNumber: 3 },
  { ...newStay({ unitId: units[1].id, personId: 't1', role: 'tenant' }), rowNumber: 4 },
  { ...newStay({ unitId: units[2].id, personId: 'o2', role: 'owner' }), rowNumber: 5 }
]

const owed = (unitId: string, amount: number): Receivable => ({
  id: unitId,
  createdAt: '',
  title: '',
  debtor: '',
  category: '',
  amount,
  borrowDate: '',
  note: '',
  payments: [],
  reference: `charge:${unitId}:1405-07`
})

const profile = {
  name: 'نرگس',
  address: '',
  floors: 3,
  defaultCharge: 1_200_000,
  chargeMethod: 'fixed' as const,
  issueDay: 1,
  dueDay: 10,
  vacancyRule: 'half' as const
}

const rows = buildUnitRows({
  units,
  stays,
  persons,
  receivables: [owed(units[1].id, 1_200_000)],
  profile
})

describe('buildUnitRows', () => {
  it('names who lives there: the owner, the tenant, or nobody', () => {
    expect(rows.map(row => row.resident)).toEqual([
      { name: 'موسوی', role: 'owner' },
      { name: 'کاظمی', role: 'tenant' },
      null
    ])
    expect(rows.map(row => row.owner)).toEqual(['موسوی', 'فرهادی', 'فرهادی'])
  })

  it('prices each unit with the vacancy rule and totals what it owes', () => {
    expect(rows.map(row => row.charge)).toEqual([1_200_000, 1_200_000, 600_000])
    expect(rows.map(row => row.balance.open)).toEqual([0, 1_200_000, 0])
  })

  it('leaves archived units out, or lists only them, or both', () => {
    const archived = { ...unit('9'), active: false }

    const input = { units: [...units, archived], stays, persons, receivables: [], profile }

    expect(buildUnitRows(input)).toHaveLength(3)
    expect(buildUnitRows({ ...input, scope: 'archived' }).map(row => row.unit.number)).toEqual([
      '9'
    ])
    expect(buildUnitRows({ ...input, scope: 'all' })).toHaveLength(4)
  })

  it('prices a unit against the active units only, whichever are listed', () => {
    const archived = { ...unit('9', { area: 5000 }), active: false }

    const input = { units: [...units, archived], stays, persons, receivables: [], profile }

    expect(
      buildUnitRows({ ...input, scope: 'all' })
        .slice(0, 3)
        .map(row => row.charge)
    ).toEqual(buildUnitRows(input).map(row => row.charge))
  })
})

describe('unit texts', () => {
  it('shows «<resident> · <role>», adding the owner when the owner is not the resident', () => {
    expect(rows.map(unitWho)).toEqual([
      'موسوی · مالک',
      'کاظمی · مستأجر · مالک: فرهادی',
      'خالی · مالک: فرهادی'
    ])
  })

  it('writes the place line with Persian digits', () => {
    expect(unitPlace(units[2])).toBe('ط۳ · ۱۰۰ متر · ۲ نفر · پارکینگ ۱')
  })

  it('says how long a unit owes, or that a share or an old debt is open, or its credit', () => {
    const base = {
      open: 0,
      credit: 0,
      months: [],
      partial: false,
      hasShare: false,
      lastPaidAt: null
    }

    expect(unitStatus({ ...base, open: 5, months: ['1405-06', '1405-07'] })).toEqual({
      text: '۲ ماه بدهکار',
      credit: 0
    })
    expect(unitStatus({ ...base, open: 5, months: ['1405-07'], partial: true }).text).toBe(
      '۱ ماه (ناقص) بدهکار'
    )
    expect(unitStatus({ ...base, open: 5, hasShare: true }).text).toBe('سهم عمرانی')
    expect(unitStatus({ ...base, open: 5 }).text).toBe('بدهی قبلی')
    expect(unitStatus({ ...base, credit: 300 })).toEqual({ text: 'اعتبار', credit: 300 })
    expect(unitStatus(base).text).toBe('')
    expect(unitStatus({ ...base, lastPaidAt: '2026-10-02' }).text).toMatch(
      /^پرداخت [^ ]+ [^ ]+( [^ ]+)?$/
    )
    expect(unitStatus({ ...base, lastPaidAt: '2026-10-02', lastPaidViaSms: true }).text).toMatch(
      / از پیامک$/
    )
  })
})

describe('debtorsFirst', () => {
  it('puts the largest debt on top and keeps the door order for the rest', () => {
    const withDebt = (amount: number, number: string): UnitRowData => ({
      ...rows[0],
      unit: { ...rows[0].unit, number },
      balance: { ...rows[0].balance, open: amount }
    })

    const sorted = debtorsFirst([
      withDebt(0, '1'),
      withDebt(400, '2'),
      withDebt(0, '3'),
      withDebt(900, '4')
    ])

    expect(sorted.map(row => row.unit.number)).toEqual(['4', '2', '1', '3'])
  })
})

describe('pickUnitLabel', () => {
  it('names the debt in words, with no minus sign', () => {
    const label = pickUnitLabel(rows[2])

    expect(label).toBe('واحد ۳ · خالی')

    const owing = pickUnitLabel(rows[1])

    expect(owing).toContain('واحد ۲ · کاظمی · بدهکار ')
    expect(owing).toContain('تومان')
    expect(owing).not.toMatch(/[−-]/)
  })

  it('shows no debt part for a settled unit', () => {
    expect(pickUnitLabel(rows[0])).toBe('واحد ۱ · موسوی')
  })
})
