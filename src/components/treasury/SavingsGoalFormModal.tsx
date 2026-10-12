import { useEffect, useState } from 'react'

import { nextGoalStatus } from '../../services/savingsGoals'
import type { SavingsGoal, SavingsGoalView } from '../../types'
import { showError } from '../../utils/toast'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import WalletAccountSelect from '../form/WalletAccountSelect'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import Button from '../ui/Button'
import { goalFormExtraClass } from '../ui/treasuryGoalStyles'

type Draft = Pick<SavingsGoal, 'title' | 'targetDate' | 'defaultAccountId' | 'note'> & {
  target: number | ''
}

const EMPTY: Draft = { title: '', target: '', targetDate: '', defaultAccountId: '', note: '' }

/** New goal, or edit one; editing also offers «برداشت از هدف» and «بایگانی». */
export default function SavingsGoalFormModal({
  goal,
  saving,
  onClose,
  onSave,
  onWithdraw,
  onSetStatus
}: {
  /** `'new'` creates; a goal edits; null is closed. */
  goal: SavingsGoalView | 'new' | null
  saving: boolean
  onClose: () => void
  onSave: (goal: SavingsGoal, rowNumber?: number) => void
  onWithdraw: (goal: SavingsGoalView) => void
  onSetStatus: (goal: SavingsGoalView, status: SavingsGoal['status']) => void
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const existing = goal && goal !== 'new' ? goal : null

  useEffect(() => {
    if (!goal) return
    setDraft(goal === 'new' ? EMPTY : { ...goal })
  }, [goal])

  const set = (patch: Partial<Draft>) => setDraft(current => ({ ...current, ...patch }))

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.title.trim()) return showError('عنوان هدف را وارد کنید')
    if (!(Number(draft.target) > 0)) return showError('مبلغ هدف را وارد کنید')

    onSave(
      {
        id: existing?.id ?? crypto.randomUUID(),
        createdAt: existing?.createdAt ?? new Date().toLocaleString('fa-IR'),
        ...draft,
        title: draft.title.trim(),
        target: Number(draft.target),
        // A lowered target can complete the goal; a raised one reopens it.
        status: existing
          ? nextGoalStatus({ ...existing, target: Number(draft.target) }, existing.balance)
          : 'active'
      },
      existing?.rowNumber
    )
  }

  return (
    <FormModal
      open={goal != null}
      title={existing ? `ویرایش «${existing.title}»` : 'هدف پس‌انداز تازه'}
      onClose={() => !saving && onClose()}
      onSubmit={handleSubmit}
      saving={saving}
      saveLabel="ذخیره"
    >
      <FormField label="عنوان" required>
        <input
          type="text"
          value={draft.title}
          placeholder="مثلاً سفر عید"
          onChange={event => set({ title: event.target.value })}
        />
      </FormField>
      <FormField label="مبلغ هدف" required>
        <AmountInput value={draft.target} onChange={target => set({ target })} />
      </FormField>
      <FormField label="تاریخ هدف" hint="اختیاری؛ برای «ماهی چقدر لازم است»">
        <JalaliDatePicker
          value={draft.targetDate}
          onChange={targetDate => set({ targetDate })}
          allowEmpty
          emptyLabel="بدون تاریخ"
        />
      </FormField>
      <FormField label="حساب مبدا پیش‌فرض" hint="واریزها از این حساب برداشته می‌شوند">
        <WalletAccountSelect
          value={draft.defaultAccountId}
          onChange={defaultAccountId => set({ defaultAccountId })}
        />
      </FormField>
      <FormField label="یادداشت" controlWidth="full">
        <textarea value={draft.note} onChange={event => set({ note: event.target.value })} />
      </FormField>
      {existing ? (
        <div className={goalFormExtraClass}>
          {existing.balance > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => onWithdraw(existing)}
            >
              برداشت از هدف
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() =>
              onSetStatus(existing, existing.status === 'archived' ? 'active' : 'archived')
            }
          >
            {existing.status === 'archived' ? 'بازگردانی از بایگانی' : 'بایگانی'}
          </Button>
        </div>
      ) : null}
    </FormModal>
  )
}
