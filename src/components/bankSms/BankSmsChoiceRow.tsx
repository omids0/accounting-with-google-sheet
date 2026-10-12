import { smsChoiceReason } from './smsLabels'
import type { SmsChoice } from './useBankSmsReview'
import AppIcon from '../AppIcon'
import { smsChoiceButtonClass, smsChoiceReasonClass, smsChoiceRowClass } from '../ui/bankSmsStyles'

type BankSmsChoiceRowProps = {
  choice: SmsChoice | null
  busy: boolean
  onOpen: () => void
}

/** «دسته پیشنهادی» line: why it was suggested, and «دسته: خوراک ▾» to change it. */
export default function BankSmsChoiceRow({ choice, busy, onOpen }: BankSmsChoiceRowProps) {
  const label = choice
    ? `دسته: ${choice.subCategory ? `${choice.category} › ${choice.subCategory}` : choice.category}`
    : 'انتخاب دسته'

  return (
    <div className={smsChoiceRowClass}>
      <p className={smsChoiceReasonClass}>
        {choice ? smsChoiceReason(choice) : 'دسته‌ای پیشنهاد نشد؛ با ثبت، فرم باز می‌شود.'}
      </p>
      <button
        type="button"
        className={smsChoiceButtonClass}
        disabled={busy}
        onClick={onOpen}
        aria-haspopup="dialog"
      >
        {label}
        <AppIcon name="chevron-down" size={14} />
      </button>
    </div>
  )
}
