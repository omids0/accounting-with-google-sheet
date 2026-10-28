import type { GoalMoveMode } from './useSavingsGoals'
import type { SavingsGoalView } from '../../types'
import type { ConfirmDeleteOptions } from '../../utils/confirmDelete'
import { formatPersianNumber } from '../../utils/formatMoney'

/**
 * Active and reached goals first, archived ones apart. An archived goal still holds its
 * money (it counts in the assets), so it stays reachable under «بایگانی‌شده».
 */
export function splitGoals(goals: SavingsGoalView[]): {
  open: SavingsGoalView[]
  archived: SavingsGoalView[]
} {
  return {
    open: goals.filter(goal => goal.status !== 'archived'),
    archived: goals.filter(goal => goal.status === 'archived')
  }
}

/** The question before archiving a goal that still holds money; null when nothing is at stake. */
export function archiveGoalQuestion(goal: SavingsGoalView): ConfirmDeleteOptions | null {
  if (!(goal.balance > 0)) return null

  const name = goal.title.trim() || 'این هدف'

  return {
    label: name,
    message: `${formatPersianNumber(
      goal.balance
    )} هنوز در این هدف است و در دارایی‌هایت حساب می‌شود. هر وقت خواستی از «بایگانی‌شده» برش می‌گردانی.`,
    wording: { title: `«${name}» بایگانی شود؟`, confirmLabel: 'بایگانی', tone: 'default' }
  }
}

/** Why a goal deposit or withdrawal cannot go through; '' when it can. */
export function goalMoveProblem(mode: GoalMoveMode, value: number, balance: number): string {
  if (!(value > 0)) return 'مبلغ را وارد کنید'

  return mode === 'withdraw' && value > balance ? GOAL_OVERDRAW_MESSAGE : ''
}

export const GOAL_OVERDRAW_MESSAGE = 'بیشتر از موجودی هدف نمی‌شود برداشت کرد'
