import { useEffect, useState } from 'react'

import { GOAL_OVERDRAW_MESSAGE, goalMoveProblem } from './goalList'
import type { GoalMoveMode } from './useSavingsGoals'
import { exceedsGoalTarget } from '../../services/savingsGoals'
import type { GoalMoveInput } from '../../services/savingsGoalsSheet'
import type { SavingsGoalView } from '../../types'
import { cn } from '../../utils/cn'
import { formatPersianNumber } from '../../utils/formatMoney'
import { getTodayIso } from '../../utils/jalaliDate'
import { showError } from '../../utils/toast'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import WalletAccountSelect from '../form/WalletAccountSelect'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import { formHintClass } from '../ui/formStyles'
import { transferOverdraftHint } from '../wallet/transfers/transferForm'
import { useTransferAccounts } from '../wallet/transfers/useTransferAccounts'

/**
 * «+ واریز به هدف» moves money from a wallet account into the goal; «برداشت از هدف»
 * moves it back. Both are one «گردش حساب» row on that account.
 */
export default function SavingsGoalMoveModal({
  move,
  saving,
  onClose,
  onSubmit
}: {
  move: { goal: SavingsGoalView; mode: GoalMoveMode } | null
  saving: boolean
  onClose: () => void
  onSubmit: (goal: SavingsGoalView, input: GoalMoveInput) => void
}) {
  const [amount, setAmount] = useState<number | ''>('')
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(getTodayIso)

  useEffect(() => {
    if (!move) return
    setAmount('')
    setAccountId(move.goal.defaultAccountId)
    setDate(getTodayIso())
  }, [move])

  const withdraw = move?.mode === 'withdraw'
  const overTarget =
    move != null &&
    !withdraw &&
    exceedsGoalTarget(move.goal.balance, move.goal.target, Number(amount) || 0)

  const accounts = useTransferAccounts(move != null)
  // The account may go below zero (a card used before the deposit is entered): a note, no block.
  const overdraft = withdraw
    ? ''
    : transferOverdraftHint({ fromAccountId: accountId, amount }, accounts, 'واریز')
  // A goal cannot go below zero, so a withdrawal above its balance is an error as the user types.
  const overdrawn =
    move?.mode === 'withdraw' && Number(amount) > move.goal.balance ? GOAL_OVERDRAW_MESSAGE : ''
  const [error, setError] = useState('')

  useEffect(() => setError(''), [move])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!move) return

    const value = Number(amount)

    const problem = goalMoveProblem(move.mode, value, move.goal.balance)

    setError(problem)
    if (problem) return showError(problem)

    onSubmit(move.goal, { amount: withdraw ? -value : value, accountId, date })
  }

  return (
    <FormModal
      open={move != null}
      title={
        move ? `${withdraw ? 'برداشت از' : 'واریز به'} هدف «${move.goal.title}»` : 'هدف پس‌انداز'
      }
      onClose={() => !saving && onClose()}
      onSubmit={handleSubmit}
      saving={saving}
      saveLabel={withdraw ? 'برداشت' : 'واریز'}
    >
      <FormField label="مبلغ" required error={error || overdrawn}>
        <AmountInput
          value={amount}
          onChange={value => {
            setError('')
            setAmount(value)
          }}
        />
      </FormField>
      <FormField label={withdraw ? 'به حساب' : 'از حساب'}>
        <WalletAccountSelect value={accountId} onChange={setAccountId} accounts={accounts} />
      </FormField>
      <FormField label="تاریخ">
        <JalaliDatePicker value={date} onChange={setDate} />
      </FormField>
      {overdraft ? (
        <p className={cn(formHintClass, 'text-[var(--color-warning)]')} role="status">
          {overdraft}
        </p>
      ) : null}
      {overTarget ? (
        <p className={cn(formHintClass, 'text-[var(--color-warning)]')} role="status">
          از مبلغ هدف بیشتر می‌شود؛ باز هم می‌توانی واریز کنی.
        </p>
      ) : null}
      {move ? (
        <p className={formHintClass}>
          {`موجودی هدف: ${formatPersianNumber(move.goal.balance)} از ${formatPersianNumber(
            move.goal.target
          )}. موجودی حساب انتخابی به همین اندازه ${withdraw ? 'بیشتر' : 'کمتر'} می‌شود.`}
        </p>
      ) : null}
    </FormModal>
  )
}
