import { goalAmountLine, goalPlanLine } from './goalText'
import { isGoalReached } from '../../services/savingsGoals'
import type { SavingsGoalView } from '../../types'
import { cn } from '../../utils/cn'
import { getTodayIso } from '../../utils/jalaliDate'
import { progressPercent } from '../../utils/progress'
import MaskedAmount from '../MaskedAmount'
import ProgressBar from '../ProgressBar'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  goalBadgeClass,
  goalCardActionsClass,
  goalCardClass,
  goalCardHeadClass,
  goalCardLineClass,
  goalCardPlanClass,
  goalLinkButtonClass
} from '../ui/treasuryGoalStyles'

const STATUS_BADGE = { active: 'هدف', reached: 'رسید', archived: 'بایگانی' } as const

/**
 * One savings goal: progress, «X از Y · N٪», the plan line, deposit and edit. An archived goal
 * shows what it still holds and «بازگردانی از بایگانی» instead of a deposit.
 */
export default function SavingsGoalCard({
  goal,
  onDeposit,
  onEdit,
  onRestore
}: {
  goal: SavingsGoalView
  onDeposit: (goal: SavingsGoalView) => void
  onEdit: (goal: SavingsGoalView) => void
  onRestore: (goal: SavingsGoalView) => void
}) {
  const reached = isGoalReached(goal.balance, goal.target)
  const archived = goal.status === 'archived'
  const plan = archived ? '' : goalPlanLine(goal, getTodayIso())

  return (
    <Card className={cn(goalCardClass, archived && 'opacity-70')} data-highlight-id={goal.id}>
      <div className={goalCardHeadClass}>
        <h3 className="m-0 truncate text-[0.95rem] font-bold">{goal.title}</h3>
        <span className={goalBadgeClass}>{STATUS_BADGE[goal.status]}</span>
      </div>
      <ProgressBar
        value={progressPercent(goal.balance, goal.target)}
        variant={reached ? 'success' : 'default'}
        showLabel={false}
        shimmer={false}
        aria-label={`پیشرفت ${goal.title}`}
      />
      <p className={goalCardLineClass}>
        <MaskedAmount>{goalAmountLine(goal)}</MaskedAmount>
      </p>
      {plan ? (
        <p className={goalCardPlanClass}>
          <MaskedAmount>{plan}</MaskedAmount>
        </p>
      ) : null}
      <div className={goalCardActionsClass}>
        {archived ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => onRestore(goal)}>
            بازگردانی از بایگانی
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => onDeposit(goal)}>
            + واریز به هدف
          </Button>
        )}
        <button type="button" className={goalLinkButtonClass} onClick={() => onEdit(goal)}>
          ویرایش
        </button>
      </div>
    </Card>
  )
}
