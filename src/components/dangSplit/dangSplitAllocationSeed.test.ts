import { describe, expect, it } from 'vitest'

import {
  isAllocationDraftUnchanged,
  manualPercentsError,
  resolveDraftWeights,
  seedAllocationDraft,
  toNumericPercents,
  type AllocationDraftSeed
} from './dangSplitAllocationSeed'
import { buildGroupSummary, type DangSplitWeight } from '../../services/dangSplitMath'
import type { DangSplitAllocation, DangSplitExpense, DangSplitPerson } from '../../types/dangSplit'

function person(id: string, defaultWeight = 1): DangSplitPerson {
  return {
    id,
    groupId: 'g1',
    name: id,
    categoryId: '',
    defaultWeight,
    deposit: 0,
    paidAmount: 0,
    settledAt: '',
    note: ''
  }
}

const stored = (personId: string, weight: number) => ({ personId, weight })

/** Open the dialog on the stored allocations and press save without touching anything. */
function saveUntouched(people: DangSplitPerson[], allocations: DangSplitWeight[]) {
  const seed = seedAllocationDraft(people, allocations)
  const draft = {
    selectedIds: seed.selectedIds,
    mode: seed.mode,
    manualPercents: seed.manualPercents
  }
  const selectedPeople = people.filter(item => draft.selectedIds.includes(item.id))

  return { seed, weights: resolveDraftWeights({ seed, draft, selectedPeople }) }
}

describe('seedAllocationDraft', () => {
  it('opens a new expense empty and «مساوی»', () => {
    const seed = seedAllocationDraft([person('a')], [])

    expect(seed).toMatchObject({ selectedIds: [], mode: 'equal', manualPercents: {} })
    expect(seed.savedWeights).toEqual([])
  })

  it('opens weights that follow the default weights as «مساوی»', () => {
    const people = [person('a'), person('b'), person('couple', 2)]
    const seed = seedAllocationDraft(people, [stored('a', 1), stored('b', 1), stored('couple', 2)])

    expect(seed.mode).toBe('equal')
    expect(seed.manualPercents).toEqual({})
  })

  it('treats a rescaled copy of the defaults as «مساوی» too', () => {
    const seed = seedAllocationDraft([person('a'), person('b')], [stored('a', 2), stored('b', 2)])

    expect(seed.mode).toBe('equal')
  })

  it('opens an unequal split as «دستی» with each real percent', () => {
    // «زوج» counts double by default, but this expense was split 50/30/20 by hand
    const people = [person('a'), person('b'), person('couple', 2)]
    const seed = seedAllocationDraft(people, [
      stored('a', 50),
      stored('b', 30),
      stored('couple', 20)
    ])

    expect(seed.mode).toBe('manual')
    expect(seed.manualPercents).toEqual({ a: 50, b: 30, couple: 20 })
  })

  it('opens a split that no longer matches changed default weights as «دستی»', () => {
    const seed = seedAllocationDraft(
      [person('a'), person('b', 3)],
      [stored('a', 1), stored('b', 1)]
    )

    expect(seed.mode).toBe('manual')
    expect(seed.manualPercents).toEqual({ a: 50, b: 50 })
  })

  it('makes rounded percents add up to exactly 100', () => {
    const seed = seedAllocationDraft(
      [person('a', 2), person('b', 2), person('c', 2)],
      [stored('a', 1), stored('b', 1), stored('c', 2)]
    )
    const total = Object.values(seed.manualPercents).reduce<number>(
      (sum, value) => sum + Number(value),
      0
    )

    expect(seed.mode).toBe('manual')
    expect(Math.round(total * 100) / 100).toBe(100)
  })

  it('keeps a person who no longer exists selected but out of the stored weights', () => {
    const seed = seedAllocationDraft([person('a')], [stored('a', 1), stored('gone', 1)])

    expect(seed.selectedIds).toEqual(['a', 'gone'])
    expect(seed.savedWeights).toEqual([stored('a', 1)])
  })
})

describe('an untouched save', () => {
  const cases: [string, DangSplitPerson[], DangSplitWeight[]][] = [
    ['equal', [person('a'), person('b')], [stored('a', 1), stored('b', 1)]],
    [
      'unequal by hand',
      [person('a'), person('b'), person('c')],
      [stored('a', 60), stored('b', 25), stored('c', 15)]
    ],
    [
      'a couple counted double',
      [person('a'), person('couple', 2)],
      [stored('a', 1), stored('couple', 2)]
    ],
    [
      'a manual split with a rounding remainder',
      [person('a'), person('b'), person('c')],
      [stored('a', 33.333333), stored('b', 33.333333), stored('c', 33.333334)]
    ],
    [
      'rest filled to fractions',
      [person('a'), person('b', 3)],
      [stored('a', 40), stored('b', 60 / 7)]
    ]
  ]

  it.each(cases)('writes byte-identical weights for %s', (_name, people, allocations) => {
    expect(saveUntouched(people, allocations).weights).toEqual(allocations)
  })

  it('writes the default weights when the split is edited', () => {
    const people = [person('a'), person('couple', 2)]
    const seed = seedAllocationDraft(people, [stored('a', 1), stored('couple', 2)])
    const draft = { selectedIds: ['a', 'couple'], mode: seed.mode, manualPercents: {} }

    expect(isAllocationDraftUnchanged(seed, draft)).toBe(true)

    const changed = { ...draft, selectedIds: ['a'] }

    expect(isAllocationDraftUnchanged(seed, changed)).toBe(false)
    expect(resolveDraftWeights({ seed, draft: changed, selectedPeople: [people[0]] })).toEqual([
      stored('a', 1)
    ])
  })

  it('writes the typed percents when a manual split is edited', () => {
    const people = [person('a'), person('b')]
    const seed = seedAllocationDraft(people, [stored('a', 50), stored('b', 50)])
    const draft = {
      selectedIds: ['a', 'b'],
      mode: 'manual' as const,
      manualPercents: { a: 70, b: 30 }
    }

    expect(isAllocationDraftUnchanged(seed, draft)).toBe(false)
    expect(resolveDraftWeights({ seed, draft, selectedPeople: people })).toEqual([
      stored('a', 70),
      stored('b', 30)
    ])
  })

  it('treats switching to «دستی» and back as no change', () => {
    const people = [person('a'), person('b')]
    const seed: AllocationDraftSeed = seedAllocationDraft(people, [stored('a', 2), stored('b', 2)])

    expect(
      isAllocationDraftUnchanged(seed, {
        selectedIds: ['b', 'a'],
        mode: 'equal',
        manualPercents: { a: 10 }
      })
    ).toBe(true)
  })

  it('leaves the balances of the group exactly as they were', () => {
    const people = [person('a'), person('b'), person('couple', 2)]
    const expenses: DangSplitExpense[] = [
      {
        id: 'e1',
        groupId: 'g1',
        title: 'e1',
        date: '',
        amount: 1_000_001,
        note: '',
        createdAt: '',
        payerId: 'a'
      },
      {
        id: 'e2',
        groupId: 'g1',
        title: 'e2',
        date: '',
        amount: 777_777,
        note: '',
        createdAt: '',
        payerId: 'couple'
      }
    ]
    const e1 = [stored('a', 30), stored('b', 30), stored('couple', 40)]
    const e2 = [stored('a', 1), stored('b', 1), stored('couple', 2)]
    const asRows = (expenseId: string, weights: DangSplitWeight[]): DangSplitAllocation[] =>
      weights.map(item => ({
        id: `${expenseId}-${item.personId}`,
        groupId: 'g1',
        expenseId,
        ...item
      }))
    const summarize = (a: DangSplitWeight[], b: DangSplitWeight[]) =>
      buildGroupSummary({
        people,
        expenses,
        allocations: [...asRows('e1', a), ...asRows('e2', b)]
      })
    const before = summarize(e1, e2)
    const after = summarize(saveUntouched(people, e1).weights, saveUntouched(people, e2).weights)

    expect(after.people.map(item => item.balance)).toEqual(before.people.map(item => item.balance))
    expect(after.people.reduce((sum, item) => sum + item.balance, 0)).toBe(0)
    expect(after.balance).toBe(0)
  })
})

describe('manualPercentsError', () => {
  const people = [person('a'), person('b'), person('c')]

  it('accepts percents that add up to 100', () => {
    expect(manualPercentsError(people, { a: 50, b: 30, c: 20 })).toBeNull()
    expect(manualPercentsError(people, { a: 33.33, b: 33.33, c: 33.33 })).toBeNull()
  })

  it('rejects a total above 100, even with someone left blank', () => {
    expect(manualPercentsError(people, { a: 70, b: 50 })).toContain('بیشتر')
    expect(manualPercentsError(people, { a: 60, b: 30, c: 30 })).toContain('۱۲۰')
  })

  it('rejects a total below 100 when everyone has a percent', () => {
    expect(manualPercentsError(people, { a: 20, b: 20, c: 20 })).toContain('۱۰۰٪ نمی‌رسد')
  })

  it('allows a total below 100 while someone is left blank to take the rest', () => {
    expect(manualPercentsError(people, { a: 20, b: 20 })).toBeNull()
    expect(manualPercentsError(people, {})).toBeNull()
  })

  it('reads only numbers out of the typed fields', () => {
    expect(toNumericPercents({ a: 10, b: '', c: 0 })).toEqual({ a: 10, c: 0 })
  })
})
