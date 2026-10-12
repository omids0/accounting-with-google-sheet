import { isGoalReached, monthsUntil, neededPerMonth } from '../../services/savingsGoals'
import type { SavingsGoalView } from '../../types'
import { formatPersianNumber } from '../../utils/formatMoney'
import { formatPercentFa } from '../../utils/insightText'
import { formatDayBadge } from '../../utils/periodLabel'
import { progressPercent } from '../../utils/progress'

/** «۹٬۰۰۰٬۰۰۰ از ۲۰٬۰۰۰٬۰۰۰ · ۴۵٪». */
export function goalAmountLine(goal: SavingsGoalView): string {
  const percent = progressPercent(goal.balance, goal.target)

  return `${formatPersianNumber(goal.balance)} از ${formatPersianNumber(
    goal.target
  )} · ${formatPercentFa(percent)}`
}

/**
 * «تا ۱ فروردین ۵ ماه مانده · ماهی ۲٬۲۰۰٬۰۰۰ لازم است · این ماه ۱٬۵۰۰٬۰۰۰ گذاشتی».
 * Parts without data (no date, nothing this month) are left out.
 */
export function goalPlanLine(goal: SavingsGoalView, todayIso: string): string {
  const parts: string[] = []
  const reached = isGoalReached(goal.balance, goal.target)

  if (reached) parts.push('به هدف رسیدی')
  else if (goal.targetDate) {
    const months = monthsUntil(todayIso, goal.targetDate)
    const { day, month } = formatDayBadge(goal.targetDate)
    const needed = neededPerMonth(goal.balance, goal.target, months)

    if (goal.targetDate < todayIso) parts.push(`موعد ${day} ${month} گذشته`)
    else if (months > 0) {
      parts.push(`تا ${day} ${month} ${formatPersianNumber(months)} ماه مانده`)
      parts.push(`ماهی ${formatPersianNumber(needed)} لازم است`)
    } else parts.push(`تا ${day} ${month} ${formatPersianNumber(needed)} مانده`)
  }

  if (goal.monthDeposits > 0) {
    parts.push(`این ماه ${formatPersianNumber(goal.monthDeposits)} گذاشتی`)
  }

  return parts.join(' · ')
}
