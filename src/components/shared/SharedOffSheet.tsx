import { useState } from 'react'

import { cn } from '../../utils/cn'
import FormModal from '../FormModal'

export type SharedOffChoice = 'hide' | 'revoke'

interface SharedOffSheetProps {
  open: boolean
  saving?: boolean
  onClose: () => void
  onConfirm: (choice: SharedOffChoice) => void | Promise<unknown>
}

const CHOICES: { value: SharedOffChoice; title: string; body: string; action: string }[] = [
  {
    value: 'hide',
    title: 'فقط از منوی من پنهان شود',
    body: 'فایل و دسترسی شریک می‌ماند. هر وقت خواستید دوباره روشنش می‌کنید.',
    action: 'پنهان کن'
  },
  {
    value: 'revoke',
    title: 'دسترسی همه قطع شود',
    body: 'اشتراک درایو برداشته می‌شود. فایل در درایو شما می‌ماند و خودتان آن را پاک می‌کنید.',
    action: 'قطع دسترسی‌ها و خاموش کن'
  }
]

/**
 * «خاموش کردن حساب مشترک»: the two ways to turn the feature off. Both leave the personal account
 * untouched; the choice is confirmed with one button that names what it will do.
 */
export default function SharedOffSheet({
  open,
  saving = false,
  onClose,
  onConfirm
}: SharedOffSheetProps) {
  const [choice, setChoice] = useState<SharedOffChoice>('hide')

  const picked = CHOICES.find(item => item.value === choice) ?? CHOICES[0]

  return (
    <FormModal
      open={open}
      title="خاموش کردن حساب مشترک"
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()

        return onConfirm(choice)
      }}
      saving={saving}
      saveLabel={picked.action}
      saveButtonVariant={choice === 'revoke' ? 'danger' : 'primary'}
    >
      <p className="mb-3 text-sm leading-[1.8] text-text">
        یکی را انتخاب کنید. حساب شخصی شما در هر دو حالت دست‌نخورده می‌ماند.
      </p>
      <div role="radiogroup" aria-label="روش خاموش کردن" className="flex flex-col gap-2">
        {CHOICES.map(item => (
          <label
            key={item.value}
            aria-label={item.title}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border p-3',
              item.value === choice ? 'border-primary bg-accent-soft' : 'border-border bg-bg'
            )}
          >
            <input
              type="radio"
              name="shared-off"
              className="mt-1.5 h-4 w-4 shrink-0"
              checked={item.value === choice}
              disabled={saving}
              onChange={() => setChoice(item.value)}
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-text">{item.title}</span>
              <span className="text-sm leading-[1.7] text-muted">{item.body}</span>
            </span>
          </label>
        ))}
      </div>
    </FormModal>
  )
}
