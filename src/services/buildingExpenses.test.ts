import { describe, expect, it } from 'vitest'

import type { ChargeResident } from './buildingCharges'
import {
  dangIdForExpense,
  planExpenseSync,
  shareDebtor,
  splitExpense,
  type ExpenseRecordInput
} from './buildingExpenses'
import { DEFAULT_MANAGED_LISTS } from './buildingLists'
import { newUnit, type BuildingUnit } from './buildingUnits'
import type { Dang, Receivable } from '../types'

const unit = (number: string, area = 100, people = 2): BuildingUnit => ({
  ...newUnit({ number, area, people }, ''),
  id: `u${number}`
})

const units = [unit('1', 80, 1), unit('2', 100, 2), unit('3', 120, 3)]

describe('splitExpense', () => {
  it('splits equally and gives the remainder to the first unit', () => {
    expect(splitExpense(1000, units, 'equal')).toEqual({ u1: 334, u2: 333, u3: 333 })
  })

  it('splits by area and by people in proportion', () => {
    expect(splitExpense(3000, units, 'area')).toEqual({ u1: 800, u2: 1000, u3: 1200 })
    expect(splitExpense(6000, units, 'people')).toEqual({ u1: 1000, u2: 2000, u3: 3000 })
  })

  it('always sums to the amount, whatever the mode and the rounding', () => {
    for (const mode of ['equal', 'area', 'people'] as const) {
      for (const amount of [1, 7, 100, 999_999, 5_400_001]) {
        const parts = splitExpense(amount, units, mode)

        expect(Object.values(parts).reduce((a, b) => a + b, 0)).toBe(amount)
        expect(Object.values(parts).every(part => part >= 0)).toBe(true)
      }
    }
  })

  it('falls back to equal when the weights are all zero', () => {
    expect(splitExpense(90, [unit('1', 0, 0), unit('2', 0, 0), unit('3', 0, 0)], 'area')).toEqual({
      u1: 30,
      u2: 30,
      u3: 30
    })
  })

  it('gives the rounding remainder to the first unit that carries weight', () => {
    const parts = splitExpense(
      100,
      [unit('1', 50, 0), unit('2', 50, 1), unit('3', 50, 2)],
      'people'
    )

    expect(parts).toEqual({ u1: 0, u2: 34, u3: 66 })
  })

  it('takes manual shares as given and nothing for a missing unit', () => {
    expect(splitExpense(1000, units, 'manual', { u1: 600, u2: 400.4 })).toEqual({
      u1: 600,
      u2: 400,
      u3: 0
    })
  })

  it('gives no shares without units', () => {
    expect(splitExpense(1000, [], 'equal')).toEqual({})
  })
})

const stay = (unitId: string, role: 'owner' | 'tenant', current = true): ChargeResident => ({
  unitId,
  personId: `${role}-${unitId}`,
  name: `${role} ${unitId}`,
  role,
  current
})

describe('shareDebtor', () => {
  const [current, capital] = DEFAULT_MANAGED_LISTS.EXPENSE_KINDS

  const holders = [stay('u1', 'owner'), stay('u1', 'tenant'), stay('u2', 'owner')]

  it('bills a «resident» kind to the tenant, else the owner', () => {
    expect(shareDebtor(current, { id: 'u1' }, holders)?.id).toBe('tenant-u1')
    expect(shareDebtor(current, { id: 'u2' }, holders)?.id).toBe('owner-u2')
  })

  it('bills an «owner» kind to the current owner even when a tenant lives there', () => {
    expect(shareDebtor(capital, { id: 'u1' }, holders)).toEqual({
      id: 'owner-u1',
      name: 'owner u1',
      role: 'owner'
    })
  })

  it('reads the rule from the kind it is given, nothing hard-coded', () => {
    const flipped = { ...current, chargeTo: 'owner' as const }

    expect(shareDebtor(flipped, { id: 'u1' }, holders)?.id).toBe('owner-u1')
    expect(shareDebtor({ chargeTo: 'resident' }, { id: 'u1' }, holders)?.id).toBe('tenant-u1')
  })

  it('ignores past stays and finds nobody for a unit without an owner', () => {
    const past = [stay('u3', 'owner', false), stay('u3', 'tenant')]

    expect(shareDebtor(capital, { id: 'u3' }, past)).toBeNull()
    expect(shareDebtor(current, { id: 'u9' }, holders)).toBeNull()
    expect(shareDebtor(undefined, { id: 'u2' }, holders)?.id).toBe('owner-u2')
  })
})

const owners = units.map(item => stay(item.id, 'owner'))

const record = (over: Partial<ExpenseRecordInput> = {}): ExpenseRecordInput => ({
  id: 'r1',
  title: 'تعمیر پمپ',
  amount: 3000,
  date: '2026-10-05',
  category: 'تعمیرات',
  subCategory: 'تأسیسات',
  kind: 'capital',
  payer: 'fund',
  split: { mode: 'equal', shares: { u1: 1000, u2: 1000, u3: 1000 }, charge: true },
  ...over
})

type Row = Receivable & { rowNumber: number }

const plan = (
  input: ExpenseRecordInput,
  receivables: Row[] = [],
  dangs: (Dang & { rowNumber: number })[] = [],
  residents: ChargeResident[] = owners
) =>
  planExpenseSync({
    record: input,
    units,
    residents,
    kinds: DEFAULT_MANAGED_LISTS.EXPENSE_KINDS,
    payers: DEFAULT_MANAGED_LISTS.EXPENSE_PAYERS,
    receivables,
    dangs
  })

const rowOf = (draft: ReturnType<typeof plan>['create'][number], rowNumber: number): Row => ({
  id: draft.reference,
  createdAt: '',
  title: draft.title,
  debtor: draft.debtor,
  debtorId: draft.debtorId,
  category: 'شارژ ساختمان',
  subCategory: draft.subCategory,
  amount: draft.amount,
  borrowDate: draft.borrowDate,
  note: '',
  payments: [],
  reference: draft.reference,
  rowNumber
})

const savedShares = () => plan(record()).create.map((draft, index) => rowOf(draft, index + 2))

describe('planExpenseSync: shares', () => {
  it('plans one share per unit with the title, reference, kind label and the owner', () => {
    const { create } = plan(record())

    expect(create.map(draft => [draft.reference, draft.amount, draft.debtorId])).toEqual([
      ['share:u1:r1', 1000, 'owner-u1'],
      ['share:u2:r1', 1000, 'owner-u2'],
      ['share:u3:r1', 1000, 'owner-u3']
    ])
    expect(create[0]).toMatchObject({
      title: 'سهم تعمیر پمپ · واحد ۱',
      subCategory: 'عمرانی',
      borrowDate: '2026-10-05'
    })
  })

  it('is idempotent: saving again plans nothing', () => {
    const again = plan(record(), savedShares())

    expect(again.create).toEqual([])
    expect(again.update).toEqual([])
    expect(again.remove).toEqual([])
  })

  it('updates only the unpaid shares when the amount changes', () => {
    const rows = savedShares()

    rows[1].payments = [{ id: 'p', amount: 300, paidAt: '2026-10-06', note: '' }]

    const next = plan(
      record({
        amount: 6000,
        split: { mode: 'equal', shares: { u1: 2000, u2: 2000, u3: 2000 }, charge: true }
      }),
      rows
    )

    expect(next.create).toEqual([])
    expect(next.update.map(item => [item.row.reference, item.draft.amount])).toEqual([
      ['share:u1:r1', 2000],
      ['share:u3:r1', 2000]
    ])
  })

  it('removes unpaid shares when the split is turned off, but keeps a paid one', () => {
    const rows = savedShares()

    rows[0].payments = [{ id: 'p', amount: 1000, paidAt: '2026-10-06', note: '' }]

    expect(plan(record({ split: null }), rows).remove.map(row => row.reference)).toEqual([
      'share:u2:r1',
      'share:u3:r1'
    ])
  })

  it('addresses a «resident» kind to the tenant and skips units nobody holds', () => {
    const withTenant = plan(
      record({ kind: 'current' }),
      [],
      [],
      [stay('u1', 'owner'), stay('u1', 'tenant')]
    )

    expect(withTenant.create.map(draft => draft.debtorId)).toEqual(['tenant-u1'])
    expect(withTenant.noDebtor).toEqual(['2', '3'])
  })

  it('makes no shares when the split is not charged, and none for a zero share', () => {
    const uncharged = record({ split: { mode: 'manual', shares: { u1: 3000 }, charge: false } })

    expect(plan(uncharged).create).toEqual([])

    const zero = record({ split: { mode: 'manual', shares: { u1: 3000, u2: 0 }, charge: true } })

    expect(plan(zero).create).toHaveLength(1)
  })
})

describe('planExpenseSync: the payer', () => {
  const manager = () => plan(record({ payer: 'manager', split: null })).dang

  it('makes no debt when the fund pays', () => {
    expect(plan(record()).dang).toEqual({ action: 'none' })
    expect(plan(record({ payer: '' })).dang).toEqual({ action: 'none' })
  })

  it('makes one debt to another payer, with a fixed id, the record title and amount', () => {
    expect(manager()).toMatchObject({
      action: 'create',
      dang: {
        id: dangIdForExpense('r1'),
        title: 'تعمیر پمپ',
        counterparty: 'مدیر',
        amount: 3000,
        paid: false
      }
    })
  })

  it('plans nothing when the debt is current, updates it on an edit, drops it back to the fund', () => {
    const created = manager()

    if (created.action !== 'create') throw new Error('expected a debt')

    const row = { ...created.dang, rowNumber: 2 }

    expect(plan(record({ payer: 'manager', split: null }), [], [row]).dang).toEqual({
      action: 'none'
    })
    expect(
      plan(record({ payer: 'manager', amount: 4000, split: null }), [], [row]).dang
    ).toMatchObject({ action: 'update', next: { amount: 4000 } })
    expect(plan(record({ payer: 'fund', split: null }), [], [row]).dang).toMatchObject({
      action: 'remove'
    })
  })

  it('leaves a settled debt alone', () => {
    const created = manager()

    if (created.action !== 'create') throw new Error('expected a debt')

    const paid = { ...created.dang, paid: true, rowNumber: 2 }

    expect(plan(record({ payer: 'manager', amount: 9000, split: null }), [], [paid]).dang).toEqual({
      action: 'none'
    })
    expect(plan(record({ payer: 'fund', split: null }), [], [paid]).dang).toEqual({
      action: 'none'
    })
  })
})
