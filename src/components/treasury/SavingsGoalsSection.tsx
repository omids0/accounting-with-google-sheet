import SavingsGoalCard from './SavingsGoalCard'
import SavingsGoalFormModal from './SavingsGoalFormModal'
import SavingsGoalMoveModal from './SavingsGoalMoveModal'
import type { useSavingsGoals } from './useSavingsGoals'
import { formatMoney } from '../../utils/formatMoney'
import ConfirmActionModal from '../ConfirmActionModal'
import Button from '../ui/Button'
import { goalSectionClass, goalSectionFooterClass } from '../ui/treasuryGoalStyles'
import { treasuryGroupHeaderClass, treasuryGroupTotalClass } from '../ui/treasuryReceivableStyles'

type Goals = ReturnType<typeof useSavingsGoals>

/**
 * Savings goal cards. Under «همه» the active and reached goals sit above the
 * holdings under a «هدف‌ها» header; the «هدف‌ها» chip also lists archived goals and
 * the goals CSV.
 */
export default function SavingsGoalsSection({
  goals,
  goalsOnly
}: {
  goals: Goals
  goalsOnly: boolean
}) {
  const list = goalsOnly ? goals.goals : goals.visibleGoals

  return (
    <>
      {list.length > 0 || goalsOnly ? (
        <section aria-label="هدف‌های پس‌انداز" className={goalSectionClass}>
          {!goalsOnly ? (
            <h2 className={treasuryGroupHeaderClass}>
              <span>هدف‌ها</span>
              <span className={treasuryGroupTotalClass}>{formatMoney(goals.total)}</span>
            </h2>
          ) : null}
          {list.map(goal => (
            <SavingsGoalCard
              key={goal.id}
              goal={goal}
              onDeposit={item => goals.setMoving({ goal: item, mode: 'deposit' })}
              onEdit={goals.setEditing}
            />
          ))}
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
