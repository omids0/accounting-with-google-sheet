import { describe, expect, it } from 'vitest'

import { GOAL_OVERDRAW_MESSAGE, archiveGoalQuestion, goalMoveProblem, splitGoals } from './goalList'
import type { SavingsGoalView } from '../../types'
import { transferOverdraftHint } from '../wallet/transfers/transferForm'

const goal = (patch: Partial<SavingsGoalView>): SavingsGoalView => ({
  id: 'g1',
  createdAt: '',
  title: 'سفر عید',
  target: 20_000_000,
  targetDate: '',
  defaultAccountId: 'acc',
  note: '',
  status: 'active',
  balance: 0,
  rowNumber: 2,
  monthDeposits: 0,
  ...patch
})

describe('splitGoals', () => {
  it('keeps an archived-only list reachable instead of dropping it', () => {
    const { open, archived } = splitGoals([goal({ status: 'archived', balance: 5_000_000 })])

    expect(open).toHaveLength(0)
    expect(archived).toHaveLength(1)
  })

  it('puts active and reached goals apart from archived ones', () => {
    const { open, archived } = splitGoals([
      goal({ id: 'a' }),
      goal({ id: 'b', status: 'archived' }),
      goal({ id: 'c', status: 'reached' })
    ])

    expect(open.map(item => item.id)).toEqual(['a', 'c'])
    expect(archived.map(item => item.id)).toEqual(['b'])
  })

  it('lists a restored goal with the open ones again', () => {
    const goals = [goal({ status: 'archived' })]

    expect(splitGoals(goals).open).toHaveLength(0)
    expect(
      splitGoals(goals.map(item => ({ ...item, status: 'active' as const }))).open
    ).toHaveLength(1)
  })
})

describe('archiveGoalQuestion', () => {
  it('asks before archiving a goal that holds money, in non-delete wording', () => {
    const question = archiveGoalQuestion(goal({ balance: 3_000_000 }))

    expect(question?.wording?.title).toBe('سفر عید بایگانی شود؟')
    expect(question?.wording?.confirmLabel).toBe('بایگانی')
    expect(question?.wording?.tone).toBe('default')
    expect(question?.message).toContain('در دارایی‌هایت حساب می‌شود')
    expect(question?.message).toContain('بایگانی‌شده')
  })

  it('does not ask for an empty goal', () => {
    expect(archiveGoalQuestion(goal({ balance: 0 }))).toBeNull()
  })
})

describe('goalMoveProblem', () => {
  it('blocks a withdrawal above the goal balance', () => {
    expect(goalMoveProblem('withdraw', 1_000_001, 1_000_000)).toBe(GOAL_OVERDRAW_MESSAGE)
  })

  it('lets a withdrawal of the whole balance through', () => {
    expect(goalMoveProblem('withdraw', 1_000_000, 1_000_000)).toBe('')
  })

  it('never blocks a deposit for the goal balance', () => {
    expect(goalMoveProblem('deposit', 5_000_000_000, 0)).toBe('')
  })

  it('needs an amount', () => {
    expect(goalMoveProblem('deposit', 0, 10)).toBeTruthy()
  })
})

describe('goal deposit overdraft hint', () => {
  const accounts = [{ id: 'acc', balance: 26_000_000 }]

  it('warns, without blocking, when the deposit exceeds the account balance', () => {
    const hint = transferOverdraftHint(
      { fromAccountId: 'acc', amount: 1_000_000_000 },
      accounts,
      'واریز'
    )

    expect(hint).toContain('بعد از واریز منفی می‌شود')
  })

  it('is silent when the account covers the deposit', () => {
    expect(
      transferOverdraftHint({ fromAccountId: 'acc', amount: 1_000_000 }, accounts, 'واریز')
    ).toBe('')
  })
})
