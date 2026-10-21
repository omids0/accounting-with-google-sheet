import { describe, expect, it } from 'vitest'

import { planIssue } from './buildingChargePlan'
import { chargeReference, type ChargeResident } from './buildingCharges'
import type { BuildingProfile } from './buildingTemplate'
import { newUnit, type UnitWithRow } from './buildingUnits'
import type { Receivable } from '../types'

const profile: BuildingProfile = {
  name: 'نرگس',
  address: '',
  floors: 2,
  defaultCharge: 1_000_000,
  chargeMethod: 'fixed',
  issueDay: 1,
  dueDay: 10,
  vacancyRule: 'half'
}

const unit = (number: string, fields: Partial<UnitWithRow> = {}): UnitWithRow => ({
  ...newUnit({ number, area: 100, people: 2 }, ''),
  rowNumber: 2,
  id: `u${number}`,
  ...fields
})

const owner = (unitId: string): ChargeResident => ({
  unitId,
  personId: `o-${unitId}`,
  name: `مالک ${unitId}`,
  role: 'owner',
  current: true
})

const tenant = (unitId: string): ChargeResident => ({
  unitId,
  personId: `t-${unitId}`,
  name: `مستأجر ${unitId}`,
  role: 'tenant',
  current: true
})

const issued = (unitId: string, monthKey: string): Receivable => ({
  id: unitId,
  createdAt: '',
  title: '',
  debtor: '',
  category: '',
  amount: 1,
  borrowDate: '',
  note: '',
  payments: [],
  reference: chargeReference(unitId, monthKey)
})

describe('planIssue', () => {
  const units = [unit('1'), unit('2'), unit('3', { occupancy: 'vacant' })]

  const residents = [owner('u1'), owner('u2'), tenant('u2'), owner('u3')]

  it('bills the tenant before the owner and a vacant unit by the vacancy rule', () => {
    const plan = planIssue(profile, units, residents, [], [], '1405-08')

    expect(plan.rows.map(row => [row.unit.number, row.debtor?.name, row.amount])).toEqual([
      ['1', 'مالک u1', 1_000_000],
      ['2', 'مستأجر u2', 1_000_000],
      ['3', 'مالک u3', 500_000]
    ])
    expect(plan.rows[2]?.basis).toBe('خالی · نصف شارژ')
    expect(plan.count).toBe(3)
    expect(plan.total).toBe(2_500_000)
  })

  it('is idempotent: a unit that already has the month is marked and not counted', () => {
    const plan = planIssue(profile, units, residents, [issued('u1', '1405-08')], [], '1405-08')

    expect(plan.rows[0]).toMatchObject({ already: true, skip: 'already' })
    expect(plan.count).toBe(2)
    expect(plan.total).toBe(1_500_000)

    // Every unit issued: nothing is left to write.
    const all = planIssue(
      profile,
      units,
      residents,
      units.map(item => issued(item.id, '1405-08')),
      [],
      '1405-08'
    )

    expect(all.count).toBe(0)
    expect(all.total).toBe(0)
  })

  it('another month is a fresh plan', () => {
    const plan = planIssue(profile, units, residents, [issued('u1', '1405-08')], [], '1405-09')

    expect(plan.count).toBe(3)
  })

  it('lists a unit without tenant or owner but skips it', () => {
    const plan = planIssue(profile, units, [owner('u1')], [], [], '1405-08')

    expect(plan.rows[1]).toMatchObject({
      debtor: null,
      skip: 'no-debtor',
      basis: 'بدون ساکن و مالک'
    })
    expect(plan.count).toBe(1)
  })

  it('skips an exempt vacant unit and an inactive unit does not appear', () => {
    const plan = planIssue(
      { ...profile, vacancyRule: 'zero' },
      [...units, unit('4', { active: false })],
      residents,
      [],
      [],
      '1405-08'
    )

    expect(plan.rows).toHaveLength(3)
    expect(plan.rows[2]).toMatchObject({ skip: 'exempt', basis: 'معاف', amount: 0 })
    expect(plan.count).toBe(2)
  })

  it('applies the unit credit first, never more than the charge', () => {
    const plan = planIssue(
      profile,
      units,
      residents,
      [],
      [
        { unitId: 'u1', amount: 300_000 },
        { unitId: 'u2', amount: 4_000_000 },
        { unitId: 'u9', amount: 7 }
      ],
      '1405-08'
    )

    expect(plan.rows.map(row => row.fromCredit)).toEqual([300_000, 1_000_000, 0])
  })

  it('a per-unit amount overrides the method', () => {
    const plan = planIssue(
      profile,
      [unit('1', { monthlyCharge: 750_000 })],
      [owner('u1')],
      [],
      [],
      '1405-08'
    )

    expect(plan.rows[0]).toMatchObject({ amount: 750_000, basis: 'مبلغ ویژهٔ واحد' })
  })
})
