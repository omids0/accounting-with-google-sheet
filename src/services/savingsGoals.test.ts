import { describe, expect, it } from 'vitest'

import { applyNetAvailableConfig } from './dashboardNetAvailable'
import {
  GOAL_LEDGER_SOURCE,
  goalBalances,
  exceedsGoalTarget,
  goalNetDepositsIn,
  goalToRow,
  monthsUntil,
  neededPerMonth,
  nextGoalStatus,
  rowToGoal
} from './savingsGoals'
import { ledgerEntry, type LedgerSource } from './walletLedger'
import { goalAmountLine, goalPlanLine } from '../components/treasury/goalText'
import type { SavingsGoal } from '../types'
import { getJalaliMonthRange } from '../utils/dateRange'
import { jalaliToIso } from '../utils/jalaliDate'
import { progressPercent } from '../utils/progress'

const move = (
  goalId: string,
  delta: number,
  date: string,
  source: LedgerSource = GOAL_LEDGER_SOURCE
) => ledgerEntry('acc', delta, 0, { title: '', date, source, recordId: goalId })

const goal: SavingsGoal = {
  id: 'g1',
  createdAt: '',
  title: 'سفر عید',
  target: 20_000_000,
  targetDate: jalaliToIso(1406, 1, 1),
  defaultAccountId: 'acc',
  note: '',
  status: 'active'
}

describe('goal balance', () => {
  const today = jalaliToIso(1405, 7, 20)
  const lastMonth = jalaliToIso(1405, 6, 10)
  const ledger = [
    move('g1', -7_500_000, lastMonth),
    move('g1', -2_000_000, today),
    move('g1', 500_000, today),
    move('g2', -1_000_000, today),
    // Not a goal row: ignored.
    move('g1', -9_999, today, 'ثبت')
  ]

  it('sums the goal rows, deposits positive and withdrawals negative', () => {
    const balances = goalBalances(ledger)

    expect(balances.get('g1')).toBe(9_000_000)
    expect(balances.get('g2')).toBe(1_000_000)
  })

  it("nets this month's withdrawals off its deposits", () => {
    const month = getJalaliMonthRange('1405-07')!

    expect(goalNetDepositsIn(ledger, month).get('g1')).toBe(1_500_000)
    expect(goalNetDepositsIn([move('g1', 800_000, today)], month).get('g1')).toBe(-800_000)
  })

  it('shows progress and the plan line from the wireframe', () => {
    const view = { ...goal, rowNumber: 2, balance: 9_000_000, monthDeposits: 1_500_000 }

    expect(progressPercent(view.balance, view.target)).toBe(45)
    expect(goalAmountLine(view)).toBe('۹٬۰۰۰٬۰۰۰ از ۲۰٬۰۰۰٬۰۰۰ · ۴۵؜٪')
    expect(goalPlanLine(view, today)).toBe(
      'تا ۱ فروردین ۵ ماه مانده · ماهی ۲٬۲۰۰٬۰۰۰ لازم است · این ماه ۱٬۵۰۰٬۰۰۰ گذاشتی'
    )
  })
})

describe('goal planning', () => {
  it('counts whole Jalali months to the target date', () => {
    expect(monthsUntil(jalaliToIso(1405, 7, 20), jalaliToIso(1406, 1, 1))).toBe(5)
    expect(monthsUntil(jalaliToIso(1405, 7, 1), jalaliToIso(1406, 1, 1))).toBe(6)
    expect(monthsUntil(jalaliToIso(1406, 2, 1), jalaliToIso(1406, 1, 1))).toBe(0)
    expect(monthsUntil(jalaliToIso(1405, 7, 1), '')).toBe(0)
  })

  it('needs the rest per month, rounded up to the thousand', () => {
    expect(neededPerMonth(9_000_000, 20_000_000, 5)).toBe(2_200_000)
    expect(neededPerMonth(0, 1_000_000, 3)).toBe(334_000)
    expect(neededPerMonth(0, 1_000_000, 0)).toBe(1_000_000)
    expect(neededPerMonth(25_000_000, 20_000_000, 5)).toBe(0)
  })

  it('reaches at 100%, reopens below it and keeps archived goals archived', () => {
    expect(nextGoalStatus(goal, 20_000_000)).toBe('reached')
    expect(nextGoalStatus({ ...goal, status: 'reached' }, 19_000_000)).toBe('active')
    expect(nextGoalStatus({ ...goal, status: 'archived' }, 25_000_000)).toBe('archived')
    expect(progressPercent(19_999_999, 20_000_000)).toBe(99)
  })

  it('round-trips the sheet row', () => {
    expect(rowToGoal(goalToRow(goal))).toEqual(goal)
    expect(rowToGoal(['g', '', ''])).toBeNull()
  })
})

describe('goals in net available', () => {
  const financial = {
    walletTotal: 100,
    treasuryTotal: 50 + 30,
    goalsTotal: 30,
    receivablesTotal: 0,
    installmentsDue: 0,
    dangsTotal: 0,
    checksDue: 0
  }
  const config = (treasury: boolean, goals: boolean) => ({
    assets: { wallet: true, treasury, goals, receivables: true },
    liabilities: { installments: true, dangs: true, checks: true }
  })

  it('counts goal balances inside the vault, switched on their own', () => {
    expect(applyNetAvailableConfig(financial, config(true, true)).totalAssets).toBe(180)
    expect(applyNetAvailableConfig(financial, config(true, false)).totalAssets).toBe(150)
    expect(applyNetAvailableConfig(financial, config(false, true)).totalAssets).toBe(130)
  })
})

describe('goal target warning', () => {
  it('warns only when a deposit goes past the target', () => {
    expect(exceedsGoalTarget(9_000_000, 10_000_000, 1_000_000)).toBe(false)
    expect(exceedsGoalTarget(9_000_000, 10_000_000, 1_000_001)).toBe(true)
    expect(exceedsGoalTarget(9_000_000, 0, 5)).toBe(false)
    expect(exceedsGoalTarget(9_000_000, 10_000_000, -5)).toBe(false)
  })
})
