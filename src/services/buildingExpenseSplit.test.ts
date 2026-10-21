import { describe, expect, it } from 'vitest'

import {
  buildingExpenseError,
  isBuildingExpenseValues,
  parseSplit,
  prepareBuildingExpenseValues,
  serializeSplit,
  shareReference,
  splitDifference
} from './buildingExpenseSplit'

describe('the «تقسیم» column', () => {
  it('round-trips a split and reads nothing from an empty or broken cell', () => {
    const split = { mode: 'area' as const, shares: { u1: 600, u2: 400 }, charge: true }

    expect(parseSplit(serializeSplit(split))).toEqual(split)
    expect(serializeSplit(null)).toBe('')
    expect(parseSplit('')).toBeNull()
    expect(parseSplit('not json')).toBeNull()
    expect(parseSplit('{"mode":"equal"}')).toBeNull()
  })

  it('cleans odd values: unknown mode, negative or fractional shares, charge defaults on', () => {
    expect(parseSplit('{"mode":"x","shares":{"u1":-5,"u2":10.6}}')).toEqual({
      mode: 'equal',
      shares: { u1: 0, u2: 11 },
      charge: true
    })
    expect(parseSplit('{"mode":"equal","shares":{},"charge":false}')?.charge).toBe(false)
  })

  it('keys a share by unit and record', () => {
    expect(shareReference('u1', 'r9')).toBe('share:u1:r9')
  })
})

describe('manual split validation', () => {
  const manual = (shares: Record<string, number>, amount = 1000) => ({
    amount,
    split: serializeSplit({ mode: 'manual', shares, charge: true })
  })

  it('measures what is missing from the amount', () => {
    expect(splitDifference(1000, { u1: 600, u2: 400 })).toBe(0)
    expect(splitDifference(1000, { u1: 600 })).toBe(400)
    expect(splitDifference(1000, { u1: 700, u2: 400 })).toBe(-100)
  })

  it('refuses a manual split that does not add up, says by how much, and accepts one that does', () => {
    expect(buildingExpenseError(manual({ u1: 600, u2: 300 }))).toContain('۱۰۰')
    expect(buildingExpenseError(manual({ u1: 600, u2: 400 }))).toBeNull()
  })

  it('does not check the other modes, which always add up', () => {
    expect(
      buildingExpenseError({
        amount: 1000,
        split: serializeSplit({ mode: 'equal', shares: { u1: 1 }, charge: true })
      })
    ).toBeNull()
    expect(buildingExpenseError({ amount: 1000, split: '' })).toBeNull()
  })
})

describe('building record values', () => {
  it('recognises a record that carries any building column', () => {
    expect(isBuildingExpenseValues({ expenseKind: 'current' })).toBe(true)
    expect(isBuildingExpenseValues({ payer: 'fund' })).toBe(true)
    expect(isBuildingExpenseValues({ title: 'x', amount: 5 })).toBe(false)
  })

  it('drops the account for a payer other than the fund and leaves everything else alone', () => {
    const base = { amount: 5, walletAccount: 'acc1', expenseKind: 'current' }

    expect(prepareBuildingExpenseValues({ ...base, payer: 'manager' }).walletAccount).toBe('')
    expect(prepareBuildingExpenseValues({ ...base, payer: 'fund' }).walletAccount).toBe('acc1')
    expect(prepareBuildingExpenseValues({ ...base, payer: '' }).walletAccount).toBe('acc1')

    const personal = { amount: 5, walletAccount: 'acc1' }

    expect(prepareBuildingExpenseValues(personal)).toBe(personal)
  })
})
