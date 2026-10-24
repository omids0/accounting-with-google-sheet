import { beforeEach, describe, expect, it } from 'vitest'

import {
  dismissGoalCongrats,
  getPendingGoalCongrats,
  queueGoalCongrats,
  resetGoalCongrats
} from './goalCongrats'

const goal = { id: 'g1', title: 'سفر عید' }

describe('goal congratulation', () => {
  beforeEach(() => localStorage.clear())

  it('queues once and stays quiet after a dismissal', () => {
    expect(queueGoalCongrats('s1', goal)).toBe(true)
    expect(getPendingGoalCongrats('s1')).toEqual([goal])

    dismissGoalCongrats('s1', 'g1')
    expect(getPendingGoalCongrats('s1')).toEqual([])
    expect(queueGoalCongrats('s1', goal)).toBe(false)
  })

  it('forgets the goal when money leaves it, so reaching the target again congratulates again', () => {
    queueGoalCongrats('s1', goal)
    resetGoalCongrats('s1', 'g1')
    expect(getPendingGoalCongrats('s1')).toEqual([])

    dismissGoalCongrats('s1', 'g1')
    expect(queueGoalCongrats('s1', goal)).toBe(true)
    expect(getPendingGoalCongrats('s1')).toEqual([goal])
  })

  it('also clears a dismissed entry', () => {
    queueGoalCongrats('s1', goal)
    dismissGoalCongrats('s1', 'g1')
    resetGoalCongrats('s1', 'g1')
    expect(queueGoalCongrats('s1', goal)).toBe(true)
  })

  it('leaves other spreadsheets and goals alone', () => {
    queueGoalCongrats('s1', goal)
    queueGoalCongrats('s2', goal)
    resetGoalCongrats('s1', 'other')
    resetGoalCongrats('s1', 'g1')
    expect(getPendingGoalCongrats('s2')).toEqual([goal])
  })
})
