import { describe, expect, it } from 'vitest'

import { buildResidentRows, residentCounts, residentMeta } from './residentRows'
import { newStay } from '../../services/buildingResidents'
import { newUnit } from '../../services/buildingUnits'
import type { Counterparty } from '../../types'

const person = (
  id: string,
  lastName: string,
  phone = ''
): Counterparty & { rowNumber: number } => ({
  id,
  createdAt: '',
  firstName: '',
  lastName,
  birthDate: '',
  address: '',
  location: null,
  phones: phone ? [{ number: phone }] : [],
  accounts: [],
  note: '',
  rowNumber: 2
})

const persons = [
  person('o1', 'موسوی', '09121234567'),
  person('o2', 'فرهادی'),
  person('t1', 'کاظمی', '09351234567'),
  person('t0', 'قدیمی')
]

const u1 = { ...newUnit({ number: '1' }), rowNumber: 2 }

const u2 = { ...newUnit({ number: '2', occupancy: 'tenant' }), rowNumber: 3 }

const u7 = { ...newUnit({ number: '7', occupancy: 'vacant' }), rowNumber: 4 }

const stay = (unitId: string, personId: string, role: 'owner' | 'tenant', extra = {}) => ({
  ...newStay({ unitId, personId, role, from: '2025-03-21' }),
  rowNumber: 2,
  ...extra
})

const stays = [
  stay(u1.id, 'o1', 'owner'),
  stay(u2.id, 'o2', 'owner'),
  stay(u2.id, 't1', 'tenant'),
  stay(u2.id, 't0', 'tenant', { to: '2025-09-01', active: false }),
  stay(u7.id, 'o2', 'owner')
]

const units = [u7, u2, u1]

describe('buildResidentRows', () => {
  it('lists every open stay by door number, an owner and a tenant of one unit apart', () => {
    const rows = buildResidentRows(stays, units, persons, 'all')

    expect(rows.map(row => [row.unit.number, row.name, row.roleText])).toEqual([
      ['1', 'موسوی', 'مالک و ساکن'],
      ['2', 'فرهادی', 'مالک (غیرساکن)'],
      ['2', 'کاظمی', 'مستأجر'],
      ['7', 'فرهادی', 'مالک · واحد خالی']
    ])
  })

  it('filters by role and keeps past stays for «قبلی‌ها»', () => {
    expect(buildResidentRows(stays, units, persons, 'owner')).toHaveLength(3)
    expect(buildResidentRows(stays, units, persons, 'tenant').map(r => r.name)).toEqual(['کاظمی'])

    const past = buildResidentRows(stays, units, persons, 'past')

    expect(past.map(row => [row.name, row.current])).toEqual([['قدیمی', false]])
  })

  it('skips a stay whose unit is gone and shows a dash for an unknown person', () => {
    const rows = buildResidentRows(
      [stay('gone', 'o1', 'owner'), stay(u1.id, 'ghost', 'owner')],
      units,
      persons,
      'all'
    )

    expect(rows.map(row => row.name)).toEqual(['—'])
  })

  it('counts each chip', () => {
    expect(residentCounts(stays, units, persons)).toEqual({ all: 4, owner: 3, tenant: 1, past: 1 })
  })
})

describe('residentMeta', () => {
  it('reads «<role> · <phone> · از <date>» and the end date of a past stay', () => {
    const [first] = buildResidentRows(stays, units, persons, 'all')

    expect(residentMeta(first)).toContain('مالک و ساکن · ۰۹۱۲۱۲۳۴۵۶۷ · واحد ۱ · از ')

    const [old] = buildResidentRows(stays, units, persons, 'past')

    expect(residentMeta(old)).toContain(' تا ')
  })
})
