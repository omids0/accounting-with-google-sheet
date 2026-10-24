import { useEffect, useState } from 'react'

import type { GoalMoveMode } from './useSavingsGoals'
import type { GoalMoveInput } from '../../services/savingsGoalsSheet'
import type { SavingsGoalView } from '../../types'
import { formatPersianNumber } from '../../utils/formatMoney'
import { getTodayIso } from '../../utils/jalaliDate'
import { showError } from '../../utils/toast'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import WalletAccountSelect from '../form/WalletAccountSelect'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import { formHintClass } from '../ui/formStyles'

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

  const [error, setError] = useState('')

  useEffect(() => setError(''), [move])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!move) return

    const value = Number(amount)

    const problem = !(value > 0)
      ? 'مبلغ را وارد کنید'
      : withdraw && value > move.goal.balance
      ? 'بیشتر از موجودی هدف نمی‌شود برداشت کرد'
      : ''

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
      <FormField label="مبلغ" required error={error}>
        <AmountInput
          value={amount}
          onChange={value => {
            setError('')
            setAmount(value)
          }}
        />
      </FormField>
      <FormField label={withdraw ? 'به حساب' : 'از حساب'}>
        <WalletAccountSelect value={accountId} onChange={setAccountId} />
      </FormField>
      <FormField label="تاریخ">
        <JalaliDatePicker value={date} onChange={setDate} />
      </FormField>
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
