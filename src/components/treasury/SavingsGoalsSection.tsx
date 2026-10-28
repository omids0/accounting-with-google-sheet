import SavingsGoalCard from './SavingsGoalCard'
import SavingsGoalFormModal from './SavingsGoalFormModal'
import SavingsGoalMoveModal from './SavingsGoalMoveModal'
import type { useSavingsGoals } from './useSavingsGoals'
import { cn } from '../../utils/cn'
import { formatPersianNumber } from '../../utils/formatMoney'
import ConfirmActionModal from '../ConfirmActionModal'
import MoneyText from '../MoneyText'
import Button from '../ui/Button'
import {
  goalLinkButtonClass,
  goalSectionClass,
  goalSectionFooterClass
} from '../ui/treasuryGoalStyles'
import { treasuryGroupHeaderClass, treasuryGroupTotalClass } from '../ui/treasuryReceivableStyles'

type Goals = ReturnType<typeof useSavingsGoals>

/**
 * Savings goal cards. Under «همه» the active and reached goals sit above the
 * holdings under a «هدف‌ها» header (archived goals only as a link to the chip); the
 * «هدف‌ها» chip also lists archived goals, apart under «بایگانی‌شده», and the goals CSV.
 */
export default function SavingsGoalsSection({
  goals,
  goalsOnly,
  onShowArchived
}: {
  goals: Goals
  goalsOnly: boolean
  /** Opens the «هدف‌ها» chip, where archived goals are listed. */
  onShowArchived: () => void
}) {
  const list = goals.visibleGoals
  const archived = goals.archivedGoals
  const restore = (goal: Goals['goals'][number]) => void goals.setStatus(goal, 'active')
  const archivedTotal = archived.reduce((sum, goal) => sum + Math.max(0, goal.balance), 0)

  return (
    <>
      {list.length > 0 || goalsOnly || archived.length > 0 ? (
        <section aria-label="هدف‌های پس‌انداز" className={goalSectionClass}>
          {!goalsOnly && list.length > 0 ? (
            <h2 className={treasuryGroupHeaderClass}>
              <span>هدف‌ها</span>
              <span className={treasuryGroupTotalClass}>
                <MoneyText amount={goals.total} />
              </span>
            </h2>
          ) : null}
          {list.map(goal => (
            <SavingsGoalCard
              key={goal.id}
              goal={goal}
              onDeposit={item => goals.setMoving({ goal: item, mode: 'deposit' })}
              onEdit={goals.setEditing}
              onRestore={restore}
            />
          ))}
          {!goalsOnly && archived.length > 0 ? (
            <button
              type="button"
              className={cn(goalLinkButtonClass, 'self-start')}
              onClick={onShowArchived}
            >
              {`${formatPersianNumber(archived.length)} هدف بایگانی‌شده را ببین`}
            </button>
          ) : null}
          {goalsOnly && archived.length > 0 ? (
            <>
              <h2 className={cn(treasuryGroupHeaderClass, 'mt-3 opacity-80')}>
                <span>{`بایگانی‌شده ${formatPersianNumber(archived.length)}`}</span>
                <span className={treasuryGroupTotalClass}>
                  <MoneyText amount={archivedTotal} />
                </span>
              </h2>
              {archived.map(goal => (
                <SavingsGoalCard
                  key={goal.id}
                  goal={goal}
                  onDeposit={item => goals.setMoving({ goal: item, mode: 'deposit' })}
                  onEdit={goals.setEditing}
                  onRestore={restore}
                />
              ))}
            </>
          ) : null}
          {goalsOnly ? (
            <div className={goalSectionFooterClass}>
              <Button type="button" size="sm" onClick={() => goals.setEditing('new')}>
                + هدف تازه
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={goals.handleExport}>
                خروجی CSV هدف‌ها
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={goals.handleImport}>
                ورود از CSV
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      <SavingsGoalFormModal
        goal={goals.editing}
        saving={goals.saving}
        onClose={() => goals.setEditing(null)}
        onSave={goals.saveGoal}
        onWithdraw={goal => {
          goals.setEditing(null)
          goals.setMoving({ goal, mode: 'withdraw' })
        }}
        onSetStatus={goals.setStatus}
      />
      <SavingsGoalMoveModal
        move={goals.moving}
        saving={goals.saving}
        onClose={() => goals.setMoving(null)}
        onSubmit={goals.moveMoney}
      />
      <ConfirmActionModal {...goals.importExportConfirmModal} />
    </>
  )
}
